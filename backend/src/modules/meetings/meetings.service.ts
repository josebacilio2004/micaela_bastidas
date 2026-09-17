import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MeetingStatus } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { date?: string; status?: any }) {
    const totalSocios = await this.prisma.merchant.count({
      where: { merchantType: { code: 'SOCIO' }, isDeleted: false },
    });

    const where: any = {};
    if (filters?.date) {
      try {
        const dStr = filters.date.split('T')[0];
        const startDate = new Date(`${dStr}T00:00:00.000Z`);
        const endDate = new Date(`${dStr}T23:59:59.999Z`);
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      } catch (_) {}
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { date: 'desc' },
    });

    return meetings.map((m) => ({
      ...m,
      totalEligible: totalSocios,
      attendedCount: m._count.attendances,
    }));
  }

  async findOne(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        attendances: {
          include: {
            merchant: { include: { stall: true, merchantType: true } },
            registeredBy: { select: { fullName: true } },
          },
          orderBy: { scannedAt: 'desc' },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // Obtener todos los socios activos habilitados para el quórum
    const allSocios = await this.prisma.merchant.findMany({
      where: { merchantType: { code: 'SOCIO' }, isDeleted: false },
      include: { stall: true, merchantType: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const attendedMerchantIds = new Set(meeting.attendances.map((a) => a.merchantId));
    const absentMerchants = allSocios.filter((s) => !attendedMerchantIds.has(s.id));

    const totalSocios = allSocios.length;
    const attendedCount = meeting.attendances.length;
    const absentCount = absentMerchants.length;
    const quorumPercentage = totalSocios > 0 ? Number(((attendedCount / totalSocios) * 100).toFixed(1)) : 0;
    const hasQuorum = quorumPercentage >= 50.0;

    const sortedAttendances = [...meeting.attendances].sort((a, b) => {
      const aName = `${a.merchant?.lastName || ''} ${a.merchant?.firstName || ''}`;
      const bName = `${b.merchant?.lastName || ''} ${b.merchant?.firstName || ''}`;
      return aName.localeCompare(bName, 'es');
    });

    return {
      ...meeting,
      totalEligible: totalSocios,
      attended: sortedAttendances,
      absent: absentMerchants,
      quorum: {
        totalSocios,
        attendedCount,
        absentCount,
        quorumPercentage,
        hasQuorum,
      },
    };
  }

  async create(dto: { title: string; date: string; time: string; location: string; description?: string; status?: MeetingStatus }, userId: string) {
    return this.prisma.meeting.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        time: dto.time,
        location: dto.location,
        description: dto.description,
        status: dto.status || MeetingStatus.PROGRAMADA,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: { title?: string; date?: string; time?: string; location?: string; description?: string }) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.time !== undefined) data.time = dto.time;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.meeting.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    if (meeting.status === MeetingStatus.FINALIZADA) {
      throw new BadRequestException('No se puede eliminar una asamblea que ya ha sido finalizada y cuyas multas o actas ya fueron procesadas.');
    }

    return this.prisma.meeting.delete({
      where: { id },
    });
  }

  async getFines(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const period = `FALTA-${meeting.id.slice(0, 8)}`;
    const fines = await this.prisma.paymentObligation.findMany({
      where: {
        period,
        concept: { code: 'MULTA_ASAMBLEA' },
      },
      include: {
        merchant: {
          include: {
            stall: true,
            sector: true,
          },
        },
        payment: true,
      },
      orderBy: [
        { merchant: { lastName: 'asc' } },
        { merchant: { firstName: 'asc' } },
      ],
    });

    return fines;
  }

  async updateStatus(id: string, status: MeetingStatus) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status },
    });

    let finesCount = 0;
    if (status === MeetingStatus.FINALIZADA) {
      // Find all active socios who did not attend
      const allSocios = await this.prisma.merchant.findMany({
        where: { merchantType: { code: 'SOCIO' }, isDeleted: false, status: 'ACTIVO' },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const attendedIds = new Set(meeting.attendances.map((a) => a.merchantId));
      const absentSocios = allSocios.filter((s) => !attendedIds.has(s.id));

      // 1. Ensure MULTA_ASAMBLEA concept exists dynamically
      let faltaConcept = await this.prisma.paymentConcept.findUnique({
        where: { code: 'MULTA_ASAMBLEA' },
      });

      if (!faltaConcept) {
        faltaConcept = await this.prisma.paymentConcept.create({
          data: {
            code: 'MULTA_ASAMBLEA',
            name: 'Multa por Inasistencia a Asamblea',
            periodicity: 'POR_USO' as any,
            description: 'Sanción económica por inasistencia no justificada a asamblea general',
          },
        });
      }

      if (faltaConcept && absentSocios.length > 0) {
        const period = `FALTA-${meeting.id.slice(0, 8)}`;
        const mDate = new Date(meeting.date);
        const due = new Date(meeting.date);
        due.setDate(due.getDate() + 7);

        for (const socio of absentSocios) {
          const exists = await this.prisma.paymentObligation.findUnique({
            where: {
              merchantId_conceptId_period: {
                merchantId: socio.id,
                conceptId: faltaConcept.id,
                period,
              },
            },
          });

          if (!exists) {
            await this.prisma.paymentObligation.create({
              data: {
                merchantId: socio.id,
                conceptId: faltaConcept.id,
                period,
                year: mDate.getFullYear(),
                month: mDate.getMonth() + 1,
                dueDate: due,
                amount: 50.00,
                status: 'PENDIENTE',
              },
            });
            finesCount++;
          }
        }
      }
    }

    return {
      ...updated,
      finesGenerated: finesCount,
      fineAmount: 50.00,
      message:
        status === MeetingStatus.FINALIZADA
          ? `Reunión finalizada. Se generaron ${finesCount} multas por inasistencia de S/ 50.00 a socios ausentes.`
          : 'Estado de reunión actualizado con éxito',
    };
  }

  async registerAttendance(
    meetingId: string,
    dto: { merchantIdentifier: string; idempotencyKey: string; deviceId?: string },
    userId: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // Merchant lookup by QR code, DNI or internal code
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { qrCode: dto.merchantIdentifier },
          { dni: dto.merchantIdentifier },
          { internalCode: dto.merchantIdentifier },
        ],
        isDeleted: false,
      },
      include: { stall: true, merchantType: true },
    });

    if (!merchant) {
      throw new NotFoundException('Socio no encontrado con el código/DNI escaneado');
    }

    // Check if already attended
    const existing = await this.prisma.attendanceEvent.findUnique({
      where: {
        meetingId_merchantId: {
          meetingId,
          merchantId: merchant.id,
        },
      },
    });

    if (existing) {
      const timeStr = existing.scannedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      throw new ConflictException(`Este socio ya registró asistencia a las ${timeStr}`);
    }

    // Check tardiness (>15 minutes after start)
    let isLate = false;
    let lateMinutes = 0;
    let fineGenerated = false;

    if (meeting.date && meeting.time) {
      try {
        const [hStr, mStr] = (meeting.time || '00:00').split(':');
        const scheduledTime = new Date(meeting.date);
        scheduledTime.setHours(parseInt(hStr, 10) || 0, parseInt(mStr, 10) || 0, 0, 0);

        const now = new Date();
        const diffMs = now.getTime() - scheduledTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins > 15) {
          isLate = true;
          lateMinutes = diffMins;

          // Find concept MULTA_TARDANZA
          const tardanzaConcept = await this.prisma.paymentConcept.findFirst({
            where: { code: 'MULTA_TARDANZA' },
          });

          if (tardanzaConcept) {
            const period = `TARD-${meeting.id.slice(0, 8)}`;
            const obExists = await this.prisma.paymentObligation.findUnique({
              where: {
                merchantId_conceptId_period: {
                  merchantId: merchant.id,
                  conceptId: tardanzaConcept.id,
                  period,
                },
              },
            });

            if (!obExists) {
              const due = new Date(meeting.date);
              due.setDate(due.getDate() + 7);
              await this.prisma.paymentObligation.create({
                data: {
                  merchantId: merchant.id,
                  conceptId: tardanzaConcept.id,
                  period,
                  year: scheduledTime.getFullYear(),
                  month: scheduledTime.getMonth() + 1,
                  dueDate: due,
                  amount: 20.00,
                  status: 'PENDIENTE',
                },
              });
              fineGenerated = true;
            }
          }
        }
      } catch (err) {
        console.error('Error calculando tardanza:', err);
      }
    }

    const attendance = await this.prisma.attendanceEvent.create({
      data: {
        meetingId,
        merchantId: merchant.id,
        dni: merchant.dni,
        deviceId: dto.deviceId,
        registeredById: userId,
        idempotencyKey: dto.idempotencyKey,
      },
      include: {
        merchant: { include: { stall: true } },
      },
    });

    const msg = isLate
      ? `Asistencia con tardanza (${lateMinutes} min tarde). Se generó automáticamente una multa de S/ 20.00.`
      : 'Asistencia puntual registrada con éxito';

    return {
      message: msg,
      attendance,
      merchant,
      isLate,
      lateMinutes,
      fineGenerated,
      fineAmount: isLate ? 20.00 : 0,
    };
  }

  async getQuorum(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendances: { select: { merchantId: true } },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const totalSocios = await this.prisma.merchant.count({
      where: { merchantType: { code: 'SOCIO' }, isDeleted: false },
    });

    const attendedCount = meeting.attendances.length;
    const absentCount = Math.max(0, totalSocios - attendedCount);
    const quorumPercentage = totalSocios > 0 ? (attendedCount / totalSocios) * 100 : 0;

    return {
      meetingId,
      totalSocios,
      attendedCount,
      absentCount,
      quorumPercentage: Number(quorumPercentage.toFixed(1)),
      hasQuorum: quorumPercentage >= 50.0,
    };
  }
}
