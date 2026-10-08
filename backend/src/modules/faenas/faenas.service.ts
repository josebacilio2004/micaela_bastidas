import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MeetingStatus, Periodicity, ObligationStatus } from '@prisma/client';

@Injectable()
export class FaenasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.faena.findMany({
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const faena = await this.prisma.faena.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        attendances: {
          include: {
            merchant: {
              select: {
                id: true,
                internalCode: true,
                firstName: true,
                lastName: true,
                dni: true,
                photoUrl: true,
                stall: { select: { code: true } },
              },
            },
            registeredBy: { select: { fullName: true } },
          },
          orderBy: { scannedAt: 'asc' },
        },
      },
    });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    // Obtener todos los socios activos
    const socioType = await this.prisma.merchantType.findFirst({ where: { code: 'SOCIO' } });
    const allSocios = await this.prisma.merchant.findMany({
      where: {
        isDeleted: false,
        ...(socioType ? { merchantTypeId: socioType.id } : {}),
      },
      include: { stall: true, sector: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const attendedIds = new Set(faena.attendances.map((a) => a.merchantId));
    const absent = allSocios.filter((s) => !attendedIds.has(s.id));

    return {
      ...faena,
      totalSocios: allSocios.length,
      allSocios: allSocios.map((s) => ({ ...s, isPresent: attendedIds.has(s.id) })),
      absent,
    };
  }

  async create(data: {
    title: string;
    date: string;
    time: string;
    sectorToClean?: string;
    description?: string;
    fineAmount?: number;
    createdById: string;
  }) {
    const dStr = (data.date || '').split('T')[0];
    const dateObj = dStr ? new Date(`${dStr}T12:00:00.000Z`) : new Date();
    return this.prisma.faena.create({
      data: {
        title: data.title,
        date: dateObj,
        time: data.time,
        sectorToClean: data.sectorToClean,
        description: data.description,
        fineAmount: data.fineAmount ? Number(data.fineAmount) : 30.00,
        status: MeetingStatus.PROGRAMADA,
        createdById: data.createdById,
      },
    });
  }

  async registerAttendance(faenaId: string, dniOrCode: string, registeredById: string) {
    const faena = await this.prisma.faena.findUnique({ where: { id: faenaId } });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    const clean = dniOrCode.replace('MB-QR-', '').trim();
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ dni: clean }, { internalCode: clean }, { qrCode: dniOrCode.trim() }],
      },
    });
    if (!merchant) throw new NotFoundException('Comerciante no encontrado en el padrón');

    const exists = await this.prisma.faenaAttendance.findUnique({
      where: {
        faenaId_merchantId: {
          faenaId,
          merchantId: merchant.id,
        },
      },
    });
    if (exists) throw new BadRequestException('La asistencia a la faena ya fue registrada');

    const att = await this.prisma.faenaAttendance.create({
      data: {
        faenaId,
        merchantId: merchant.id,
        dni: merchant.dni,
        registeredById,
      },
      include: {
        merchant: { select: { firstName: true, lastName: true, dni: true } },
      },
    });

    // Si ya existía multa pendiente generada al finalizar, eliminarla al registrar asistencia
    const period = `FAENA-${faena.id.slice(0, 8)}`;
    const fineConcept = await this.prisma.paymentConcept.findUnique({ where: { code: 'MULTA_FAENA' } });
    if (fineConcept) {
      await this.prisma.paymentObligation.deleteMany({
        where: {
          merchantId: merchant.id,
          conceptId: fineConcept.id,
          period,
          status: ObligationStatus.PENDIENTE,
        },
      });
    }

    return att;
  }

  async finalizeFaena(id: string) {
    const faena = await this.prisma.faena.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!faena) throw new NotFoundException('Faena no encontrada');
    if (faena.status === MeetingStatus.FINALIZADA) {
      throw new BadRequestException('La faena ya está finalizada');
    }

    // 1. Get all SOCIOS
    const socioType = await this.prisma.merchantType.findFirst({ where: { code: 'SOCIO' } });
    const socios = await this.prisma.merchant.findMany({
      where: {
        status: 'ACTIVO',
        ...(socioType ? { merchantTypeId: socioType.id } : {}),
      },
    });

    const attendedIds = new Set(faena.attendances.map((a) => a.merchantId));
    const absentSocios = socios.filter((s) => !attendedIds.has(s.id));

    // 2. Find or create MULTA_FAENA concept
    let fineConcept = await this.prisma.paymentConcept.findUnique({ where: { code: 'MULTA_FAENA' } });
    if (!fineConcept) {
      fineConcept = await this.prisma.paymentConcept.create({
        data: {
          code: 'MULTA_FAENA',
          name: 'Multa por Inasistencia a Faena de Limpieza',
          periodicity: Periodicity.POR_USO,
          description: 'Sanción por no participar en faena comunal',
        },
      });
    }

    // 3. Create fines for absent socios
    const fineAmount = Number(faena.fineAmount) || 30.00;
    const period = `FAENA-${faena.id.slice(0, 8)}`;
    const fDate = new Date(faena.date);
    const due = new Date(faena.date);
    due.setDate(due.getDate() + 7);

    for (const absent of absentSocios) {
      const exists = await this.prisma.paymentObligation.findUnique({
        where: {
          merchantId_conceptId_period: {
            merchantId: absent.id,
            conceptId: fineConcept.id,
            period,
          },
        },
      });

      if (!exists) {
        await this.prisma.paymentObligation.create({
          data: {
            merchantId: absent.id,
            conceptId: fineConcept.id,
            period,
            year: fDate.getFullYear(),
            month: fDate.getMonth() + 1,
            dueDate: due,
            amount: fineAmount,
            status: ObligationStatus.PENDIENTE,
          },
        });
      }
    }

    // 4. Update faena status
    await this.prisma.faena.update({
      where: { id },
      data: { status: MeetingStatus.FINALIZADA },
    });

    return {
      message: 'Faena finalizada con éxito',
      totalSocios: socios.length,
      presentes: attendedIds.size,
      ausentes: absentSocios.length,
      multasGeneradas: absentSocios.length,
      montoMulta: fineAmount,
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      date?: string;
      time?: string;
      sectorToClean?: string;
      description?: string;
      fineAmount?: number;
    },
  ) {
    const faena = await this.prisma.faena.findUnique({ where: { id } });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.date !== undefined) {
      const dStr = (data.date || '').split('T')[0];
      updateData.date = dStr ? new Date(`${dStr}T12:00:00.000Z`) : new Date();
    }
    if (data.time !== undefined) updateData.time = data.time;
    if (data.sectorToClean !== undefined) updateData.sectorToClean = data.sectorToClean;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fineAmount !== undefined) updateData.fineAmount = Number(data.fineAmount);

    return this.prisma.faena.update({
      where: { id },
      data: updateData,
    });
  }

  async toggleAttendance(faenaId: string, merchantId: string, present: boolean, userId: string) {
    const faena = await this.prisma.faena.findUnique({ where: { id: faenaId } });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Comerciante no encontrado');

    const existing = await this.prisma.faenaAttendance.findUnique({
      where: {
        faenaId_merchantId: {
          faenaId,
          merchantId,
        },
      },
    });

    if (present && !existing) {
      await this.prisma.faenaAttendance.create({
        data: {
          faenaId,
          merchantId,
          dni: merchant.dni,
          registeredById: userId,
        },
      });

      // Si existe multa pendiente por haber estado ausente, removerla
      const period = `FAENA-${faena.id.slice(0, 8)}`;
      const fineConcept = await this.prisma.paymentConcept.findUnique({ where: { code: 'MULTA_FAENA' } });
      if (fineConcept) {
        await this.prisma.paymentObligation.deleteMany({
          where: {
            merchantId,
            conceptId: fineConcept.id,
            period,
            status: ObligationStatus.PENDIENTE,
          },
        });
      }
    } else if (!present && existing) {
      await this.prisma.faenaAttendance.delete({
        where: { id: existing.id },
      });
    }

    return { success: true, present };
  }

  async bulkUpdateAttendance(
    faenaId: string,
    items: { merchantId: string; present: boolean }[],
    userId: string,
  ) {
    const faena = await this.prisma.faena.findUnique({ where: { id: faenaId } });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    for (const item of items) {
      await this.toggleAttendance(faenaId, item.merchantId, item.present, userId);
    }

    return { success: true, count: items.length };
  }

  async delete(id: string) {
    const faena = await this.prisma.faena.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    if (faena.status === MeetingStatus.FINALIZADA) {
      throw new BadRequestException('No se puede eliminar una faena que ya ha sido finalizada y cuyas multas contables ya fueron procesadas.');
    }

    return this.prisma.faena.delete({
      where: { id },
    });
  }

  async getFines(id: string) {
    const faena = await this.prisma.faena.findUnique({ where: { id } });
    if (!faena) throw new NotFoundException('Faena no encontrada');

    const period = `FAENA-${faena.id.slice(0, 8)}`;
    const fines = await this.prisma.paymentObligation.findMany({
      where: {
        period,
        concept: { code: 'MULTA_FAENA' },
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
}
