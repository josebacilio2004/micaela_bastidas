import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MeetingStatus, ObligationStatus } from '@prisma/client';

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
      allSocios: allSocios.map((s) => ({ ...s, isPresent: attendedMerchantIds.has(s.id) })),
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
    const dStr = (dto.date || '').split('T')[0];
    const dateObj = dStr ? new Date(`${dStr}T12:00:00.000Z`) : new Date();
    return this.prisma.meeting.create({
      data: {
        title: dto.title,
        date: dateObj,
        time: dto.time,
        location: dto.location,
        description: dto.description,
        status: dto.status || MeetingStatus.PROGRAMADA,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: { title?: string; date?: string; time?: string; location?: string; description?: string; status?: MeetingStatus }) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) {
      const dStr = (dto.date || '').split('T')[0];
      data.date = dStr ? new Date(`${dStr}T12:00:00.000Z`) : new Date();
    }
    if (dto.time !== undefined) data.time = dto.time;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.meeting.update({
      where: { id },
      data,
    });
  }

  async toggleAttendance(meetingId: string, merchantId: string, present: boolean, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Comerciante no encontrado');

    const existing = await this.prisma.attendanceEvent.findUnique({
      where: {
        meetingId_merchantId: {
          meetingId,
          merchantId,
        },
      },
    });

    if (present && !existing) {
      await this.prisma.attendanceEvent.create({
        data: {
          meetingId,
          merchantId,
          dni: merchant.dni,
          idempotencyKey: `att-manual-${meetingId}-${merchantId}-${Date.now()}`,
          registeredById: userId,
        },
      });

      // Si la asamblea está FINALIZADA, remover multa pendiente por haber estado ausente
      if (meeting.status === MeetingStatus.FINALIZADA) {
        const period = `FALTA-${meeting.id.slice(0, 8)}`;
        const fineConcept = await this.prisma.paymentConcept.findUnique({ where: { code: 'MULTA_ASAMBLEA' } });
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
      }
    } else if (!present && existing) {
      await this.prisma.attendanceEvent.delete({
        where: { id: existing.id },
      });

      // Si la asamblea está FINALIZADA y se desmarca como ausente, generar multa
      if (meeting.status === MeetingStatus.FINALIZADA) {
        let fineConcept = await this.prisma.paymentConcept.findUnique({ where: { code: 'MULTA_ASAMBLEA' } });
        if (!fineConcept) {
          fineConcept = await this.prisma.paymentConcept.create({
            data: {
              code: 'MULTA_ASAMBLEA',
              name: 'Multa por Inasistencia a Asamblea',
              periodicity: 'POR_USO' as any,
              description: 'Sanción económica por inasistencia no justificada a asamblea general',
            },
          });
        }
        const period = `FALTA-${meeting.id.slice(0, 8)}`;
        const mDate = new Date(meeting.date);
        const due = new Date(meeting.date);
        due.setDate(due.getDate() + 7);

        const exists = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId,
              conceptId: fineConcept.id,
              period,
            },
          },
        });
        if (!exists) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId,
              conceptId: fineConcept.id,
              period,
              year: mDate.getFullYear(),
              month: mDate.getMonth() + 1,
              dueDate: due,
              amount: 50.00,
              status: ObligationStatus.PENDIENTE,
            },
          });
        }
      }
    }

    return { success: true, present };
  }

  async saveAttendanceAndFines(
    meetingId: string,
    items?: { merchantId: string; present: boolean }[],
    userId?: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { attendances: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // 1. Guardar o actualizar asistencias si se envían en el cuerpo
    if (items && items.length > 0) {
      for (const item of items) {
        const existing = await this.prisma.attendanceEvent.findUnique({
          where: {
            meetingId_merchantId: {
              meetingId,
              merchantId: item.merchantId,
            },
          },
        });

        if (item.present && !existing) {
          const merchant = await this.prisma.merchant.findUnique({ where: { id: item.merchantId } });
          if (merchant) {
            await this.prisma.attendanceEvent.create({
              data: {
                meetingId,
                merchantId: item.merchantId,
                dni: merchant.dni,
                idempotencyKey: `att-save-${meetingId}-${item.merchantId}-${Date.now()}`,
                registeredById: userId || merchant.id,
              },
            });
          }
        } else if (!item.present && existing) {
          await this.prisma.attendanceEvent.delete({
            where: { id: existing.id },
          });
        }
      }
    }

    // 2. Marcar estado como FINALIZADA
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.FINALIZADA },
    });

    // 3. Obtener asistencias actualizadas y socios activos
    const currentAttendances = await this.prisma.attendanceEvent.findMany({
      where: { meetingId },
    });
    const attendedIds = new Set(currentAttendances.map((a) => a.merchantId));

    const allSocios = await this.prisma.merchant.findMany({
      where: { merchantType: { code: 'SOCIO' }, isDeleted: false, status: 'ACTIVO' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // 4. Asegurar concepto MULTA_ASAMBLEA
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

    const period = `FALTA-${meeting.id.slice(0, 8)}`;
    const mDate = new Date(meeting.date);
    const due = new Date(meeting.date);
    due.setDate(due.getDate() + 7);

    let finesCount = 0;

    for (const socio of allSocios) {
      const isPresent = attendedIds.has(socio.id);
      if (!isPresent) {
        // Inasistente: asegurar multa en PENDIENTE
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
              status: ObligationStatus.PENDIENTE,
            },
          });
          finesCount++;
        }
      } else {
        // Presente: si tenía multa PENDIENTE generada previamente, eliminarla
        await this.prisma.paymentObligation.deleteMany({
          where: {
            merchantId: socio.id,
            conceptId: faltaConcept.id,
            period,
            status: ObligationStatus.PENDIENTE,
          },
        });
      }
    }

    const fines = await this.getFines(meetingId);

    return {
      ...updated,
      totalSocios: allSocios.length,
      attendedCount: currentAttendances.length,
      absentCount: allSocios.length - currentAttendances.length,
      finesGenerated: finesCount,
      fines,
      message: `Asistencia guardada y finalizada. ${currentAttendances.length} socios presentes y ${allSocios.length - currentAttendances.length} socios inasistentes sancionados con S/ 50.00.`,
    };
  }

  async bulkUpdateAttendance(
    meetingId: string,
    items: { merchantId: string; present: boolean }[],
    userId: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    for (const item of items) {
      await this.toggleAttendance(meetingId, item.merchantId, item.present, userId);
    }

    return { success: true, count: items.length };
  }

  async delete(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const period = `FALTA-${meeting.id.slice(0, 8)}`;
    const paidFines = await this.prisma.paymentObligation.count({
      where: {
        period,
        status: ObligationStatus.PAGADO,
      },
    });

    if (paidFines > 0) {
      throw new BadRequestException(`No se puede eliminar esta asamblea porque ya se cobraron ${paidFines} multas en caja.`);
    }

    // Clean up unpaid fine obligations
    await this.prisma.paymentObligation.deleteMany({
      where: { period },
    });

    // Delete attendance events
    await this.prisma.attendanceEvent.deleteMany({
      where: { meetingId: id },
    });

    return this.prisma.meeting.delete({
      where: { id },
    });
  }

  async getFines(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const periodFalta = `FALTA-${meeting.id.slice(0, 8)}`;
    const periodTard = `TARD-${meeting.id.slice(0, 8)}`;
    const fines = await this.prisma.paymentObligation.findMany({
      where: {
        OR: [
          { period: periodFalta },
          { period: periodTard },
        ],
      },
      include: {
        merchant: {
          include: {
            stall: true,
            sector: true,
          },
        },
        payment: true,
        concept: true,
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
