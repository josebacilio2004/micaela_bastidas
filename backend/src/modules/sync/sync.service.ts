import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { formatOperationNumber } from '../../common/utils/code-generator.util';
import { AuditAction } from '@prisma/client';

export interface SyncPushOperation {
  operationId: string;
  idempotencyKey: string;
  entity: 'payment' | 'attendance' | 'sanitary_session' | 'cash_movement';
  action: 'CREATE' | 'UPDATE';
  payload: any;
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async pushBatch(deviceId: string, userId: string, operations: SyncPushOperation[]) {
    // 1. Resolve or register device
    let device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) {
      device = await this.prisma.device.create({
        data: {
          deviceId,
          name: `Terminal Móvil ${deviceId.substring(0, 8)}`,
          userId,
          lastSyncAt: new Date(),
        },
      });
    } else {
      await this.prisma.device.update({
        where: { id: device.id },
        data: { lastSyncAt: new Date() },
      });
    }

    // 2. Create sync batch record
    const batch = await this.prisma.syncBatch.create({
      data: {
        deviceId: device.id,
        operationsCount: operations.length,
        status: 'PROCESSING',
      },
    });

    const results: any[] = [];
    let errorCount = 0;

    for (const op of operations) {
      try {
        if (op.entity === 'payment') {
          // Idempotent Payment processing
          const existing = await this.prisma.payment.findUnique({
            where: { idempotencyKey: op.idempotencyKey },
          });

          if (existing) {
            results.push({
              operationId: op.operationId,
              idempotencyKey: op.idempotencyKey,
              status: 'SYNCED',
              serverId: existing.id,
              operationNumber: existing.operationNumber,
              message: 'Pago ya procesado previamente (Idempotente)',
            });
          } else {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const countToday = await this.prisma.payment.count({
              where: { paidAt: { gte: startOfDay, lte: endOfDay } },
            });
            const operationNumber = formatOperationNumber(now, countToday + 1);

            // Active cash register
            const cashRegister = await this.prisma.cashRegister.findFirst({
              where: { status: 'ABIERTO' },
              orderBy: { openedAt: 'desc' },
            });

            const newPayment = await this.prisma.payment.create({
              data: {
                operationNumber,
                merchantId: op.payload.merchantId,
                conceptId: op.payload.conceptId,
                obligationId: op.payload.obligationId,
                amount: op.payload.amount,
                period: op.payload.period,
                paymentMethod: op.payload.paymentMethod || 'EFECTIVO',
                cashRegisterId: cashRegister?.id || null,
                collectedById: userId,
                idempotencyKey: op.idempotencyKey,
                deviceId,
                paidAt: op.payload.createdAt ? new Date(op.payload.createdAt) : now,
              },
            });

            if (op.payload.obligationId) {
              await this.prisma.paymentObligation.update({
                where: { id: op.payload.obligationId },
                data: { status: 'PAGADO', paidAt: now },
              });
            }

            results.push({
              operationId: op.operationId,
              idempotencyKey: op.idempotencyKey,
              status: 'SYNCED',
              serverId: newPayment.id,
              operationNumber,
            });
          }
        } else if (op.entity === 'attendance') {
          // Idempotent Attendance processing
          const existingAtt = await this.prisma.attendanceEvent.findUnique({
            where: { idempotencyKey: op.idempotencyKey },
          });

          if (existingAtt) {
            results.push({
              operationId: op.operationId,
              idempotencyKey: op.idempotencyKey,
              status: 'SYNCED',
              serverId: existingAtt.id,
              message: 'Asistencia ya registrada previamente',
            });
          } else {
            // Check meeting + merchant unique
            const duplicate = await this.prisma.attendanceEvent.findUnique({
              where: {
                meetingId_merchantId: {
                  meetingId: op.payload.meetingId,
                  merchantId: op.payload.merchantId,
                },
              },
            });

            if (duplicate) {
              results.push({
                operationId: op.operationId,
                idempotencyKey: op.idempotencyKey,
                status: 'CONFLICT',
                message: 'El socio ya había sido registrado en el servidor',
              });
            } else {
              const att = await this.prisma.attendanceEvent.create({
                data: {
                  meetingId: op.payload.meetingId,
                  merchantId: op.payload.merchantId,
                  dni: op.payload.dni,
                  scannedAt: op.payload.scannedAt ? new Date(op.payload.scannedAt) : new Date(),
                  deviceId,
                  registeredById: userId,
                  idempotencyKey: op.idempotencyKey,
                },
              });

              results.push({
                operationId: op.operationId,
                idempotencyKey: op.idempotencyKey,
                status: 'SYNCED',
                serverId: att.id,
              });
            }
          }
        } else if (op.entity === 'sanitary_session') {
          const session = await this.prisma.sanitaryServiceSession.create({
            data: {
              operatorId: userId,
              startTime: op.payload.startTime ? new Date(op.payload.startTime) : new Date(),
              urinalCount: op.payload.urinalCount || 0,
              urinalTotal: op.payload.urinalTotal || 0,
              toiletCount: op.payload.toiletCount || 0,
              toiletTotal: op.payload.toiletTotal || 0,
              totalCollected: op.payload.totalCollected || 0,
              initialTicketNumber: op.payload.initialTicketNumber,
              finalTicketNumber: op.payload.finalTicketNumber,
              ticketDiscrepancy: op.payload.ticketDiscrepancy || 0,
              status: op.payload.status || 'ABIERTO',
              idempotencyKey: op.idempotencyKey,
            },
          });
          results.push({
            operationId: op.operationId,
            idempotencyKey: op.idempotencyKey,
            status: 'SYNCED',
            serverId: session.id,
          });
        }

        // Record operation detail in database
        await this.prisma.syncOperation.create({
          data: {
            batchId: batch.id,
            entity: op.entity,
            action: op.action,
            idempotencyKey: op.idempotencyKey,
            status: 'SYNCED',
          },
        });
      } catch (err: any) {
        errorCount++;
        results.push({
          operationId: op.operationId,
          idempotencyKey: op.idempotencyKey,
          status: 'SYNC_ERROR',
          error: err.message,
        });
      }
    }

    await this.prisma.syncBatch.update({
      where: { id: batch.id },
      data: {
        status: errorCount === 0 ? 'COMPLETED' : 'PARTIAL_ERRORS',
        completedAt: new Date(),
      },
    });

    return {
      batchId: batch.id,
      totalOperations: operations.length,
      syncedCount: operations.length - errorCount,
      errorCount,
      serverTimestamp: new Date().toISOString(),
      results,
    };
  }

  async pullIncremental(cursorDate?: string) {
    const since = cursorDate ? new Date(cursorDate) : new Date('2026-01-01T00:00:00Z');

    const [merchants, rates, obligations, meetings, concepts] = await Promise.all([
      this.prisma.merchant.findMany({
        where: { updatedAt: { gte: since } },
        include: { merchantType: true, stall: true, sector: true },
      }),
      this.prisma.rate.findMany({
        where: { updatedAt: { gte: since } },
        include: { concept: true, merchantType: true },
      }),
      this.prisma.paymentObligation.findMany({
        where: { updatedAt: { gte: since } },
        include: { concept: true },
      }),
      this.prisma.meeting.findMany({
        where: { status: { in: ['PROGRAMADA', 'EN_CURSO'] } },
        include: { createdBy: { select: { fullName: true } } },
      }),
      this.prisma.paymentConcept.findMany(),
    ]);

    return {
      serverCursor: new Date().toISOString(),
      merchants,
      rates,
      obligations,
      meetings,
      concepts,
    };
  }

  async getSyncStatus() {
    const devices = await this.prisma.device.findMany({
      include: {
        user: { select: { fullName: true, username: true } },
        _count: { select: { syncBatches: true } },
      },
      orderBy: { lastSyncAt: 'desc' },
    });

    const recentBatches = await this.prisma.syncBatch.findMany({
      include: {
        device: { select: { name: true, deviceId: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return { devices, recentBatches };
  }
}
