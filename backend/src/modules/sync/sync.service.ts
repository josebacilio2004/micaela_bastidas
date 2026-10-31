import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { formatOperationNumber, getDatePrefix } from '../../common/utils/code-generator.util';
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
            const prefix = getDatePrefix(now);

            const lastPaymentToday = await this.prisma.payment.findFirst({
              where: { operationNumber: { startsWith: prefix } },
              orderBy: { operationNumber: 'desc' },
              select: { operationNumber: true },
            });

            let nextSeq = 1;
            if (lastPaymentToday && lastPaymentToday.operationNumber) {
              const parts = lastPaymentToday.operationNumber.split('-');
              const seqNum = parseInt(parts[2], 10);
              if (!isNaN(seqNum) && seqNum >= nextSeq) {
                nextSeq = seqNum + 1;
              }
            }

            let operationNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
            while (await this.prisma.payment.findUnique({ where: { operationNumber }, select: { id: true } })) {
              nextSeq++;
              operationNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
            }

            // Active cash register
            const cashRegister = await this.prisma.cashRegister.findFirst({
              where: { status: 'ABIERTO' },
              orderBy: { openedAt: 'desc' },
            });

            // Safely resolve concept
            let resolvedConceptId = op.payload.conceptId;
            let conceptExists = resolvedConceptId
              ? await this.prisma.paymentConcept.findUnique({ where: { id: resolvedConceptId } })
              : null;

            if (!conceptExists) {
              const conceptName = (op.payload.conceptName || '').toLowerCase();
              let targetCode = 'ALCABALA_DIARIA';
              if (conceptName.includes('agua')) {
                targetCode = 'CUOTA_AGUA';
              } else if (conceptName.includes('cuota') || conceptName.includes('mantenimiento') || conceptName.includes('social')) {
                targetCode = 'CUOTA_MANTENIMIENTO';
              }

              const matchedConcept = await this.prisma.paymentConcept.findFirst({
                where: { code: targetCode },
              });
              resolvedConceptId = matchedConcept?.id || (await this.prisma.paymentConcept.findFirst())?.id;
            }

            // Safely resolve obligation
            let resolvedObligationId = op.payload.obligationId;
            if (resolvedObligationId) {
              const obExists = await this.prisma.paymentObligation.findUnique({
                where: { id: resolvedObligationId },
              });
              if (!obExists) {
                resolvedObligationId = null;
              }
            }

            // If no valid obligationId was provided, attempt to match an existing pending obligation
            if (!resolvedObligationId && op.payload.merchantId && resolvedConceptId) {
              const pendingOb = await this.prisma.paymentObligation.findFirst({
                where: {
                  merchantId: op.payload.merchantId,
                  conceptId: resolvedConceptId,
                  status: 'PENDIENTE',
                },
              });
              if (pendingOb) {
                resolvedObligationId = pendingOb.id;
              }
            }

            const newPayment = await this.prisma.payment.create({
              data: {
                operationNumber,
                merchantId: op.payload.merchantId,
                conceptId: resolvedConceptId,
                obligationId: resolvedObligationId,
                amount: Number(op.payload.amount) || 0,
                period: op.payload.period || formatOperationNumber(now, 1),
                paymentMethod: op.payload.paymentMethod || 'EFECTIVO',
                cashRegisterId: cashRegister?.id || null,
                collectedById: userId,
                idempotencyKey: op.idempotencyKey,
                deviceId,
                paidAt: op.payload.createdAt ? new Date(op.payload.createdAt) : now,
              },
            });

            if (resolvedObligationId) {
              await this.prisma.paymentObligation.update({
                where: { id: resolvedObligationId },
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

  async exportAccountingPackage() {
    const [
      merchants,
      stalls,
      sectors,
      rentalContracts,
      rentalInstallments,
      payments,
      obligations,
      expenses,
      loans,
      loanCollections,
    ] = await Promise.all([
      this.prisma.merchant.findMany({ where: { isDeleted: false } }),
      this.prisma.marketStall.findMany(),
      this.prisma.sector.findMany(),
      this.prisma.stallRentalContract.findMany({ include: { installments: true } }),
      this.prisma.stallRentalInstallment.findMany(),
      this.prisma.payment.findMany({
        where: { isVoided: false },
        orderBy: { paidAt: 'desc' },
        take: 3000,
      }),
      this.prisma.paymentObligation.findMany(),
      this.prisma.marketExpense.findMany({ orderBy: { date: 'desc' } }),
      this.prisma.loan.findMany({ include: { collections: true } }),
      this.prisma.loanCollection.findMany(),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      source: 'MICAELA_BASTIDAS_ACCOUNTING_NODE',
      data: {
        merchants,
        stalls,
        sectors,
        rentalContracts,
        rentalInstallments,
        payments,
        obligations,
        expenses,
        loans,
        loanCollections,
      },
      counts: {
        merchants: merchants.length,
        rentalContracts: rentalContracts.length,
        rentalInstallments: rentalInstallments.length,
        payments: payments.length,
        obligations: obligations.length,
        expenses: expenses.length,
        loans: loans.length,
      },
    };
  }

  async importAccountingPackage(pkg: any, userId?: string) {
    if (!pkg || !pkg.data) {
      throw new BadRequestException('El paquete de datos es inválido o está corrupto');
    }

    const {
      merchants = [],
      rentalContracts = [],
      payments = [],
      expenses = [],
      loans = [],
    } = pkg.data;

    const stats = {
      merchantsUpserted: 0,
      contractsUpserted: 0,
      installmentsUpdated: 0,
      paymentsCreated: 0,
      paymentsExisting: 0,
      expensesUpserted: 0,
      loansUpserted: 0,
    };

    const firstAdmin = await this.prisma.user.findFirst();
    const systemUserId = userId || firstAdmin?.id || '';

    await this.prisma.$transaction(async (tx) => {
      // 1. Merchants Upsert
      for (const m of merchants) {
        if (!m.dni) continue;
        const exists = await tx.merchant.findUnique({ where: { dni: m.dni } });
        if (exists) {
          await tx.merchant.update({
            where: { id: exists.id },
            data: {
              firstName: m.firstName,
              lastName: m.lastName,
              phone: m.phone || exists.phone,
              businessCategory: m.businessCategory || exists.businessCategory,
              status: m.status || exists.status,
            },
          });
          stats.merchantsUpserted++;
        }
      }

      // 2. Rental Contracts & Installments Upsert
      for (const c of rentalContracts) {
        let contract = await tx.stallRentalContract.findFirst({
          where: {
            OR: [
              ...(c.contractNumber ? [{ contractNumber: c.contractNumber }] : []),
              ...(c.stallCode ? [{ stallCode: c.stallCode }] : []),
            ],
          },
        });

        const stall = (await tx.marketStall.findFirst({
          where: { code: c.stallCode || 'P-021' },
        })) || (await tx.marketStall.findFirst());
        if (!stall) continue;

        if (!contract) {
          contract = await tx.stallRentalContract.create({
            data: {
              contractNumber: c.contractNumber || `CTR-${c.stallCode || 'STALL'}-2026`,
              stallId: stall.id,
              stallCode: stall.code,
              tenantName: c.tenantName || 'Inquilino',
              tenantDni: c.tenantDni || '00000000',
              monthlyRent: Number(c.monthlyRent || 170),
              totalAmount: Number(c.totalAmount || (Number(c.monthlyRent || 170) * (c.monthsCount || 6))),
              startDate: c.startDate ? new Date(c.startDate) : new Date(),
              endDate: c.endDate ? new Date(c.endDate) : new Date(),
              monthsCount: c.monthsCount || 6,
              businessCategory: c.businessCategory,
              status: c.status || 'ACTIVO',
              notes: c.notes,
            },
          });
          stats.contractsUpserted++;
        }

        // Installments
        if (Array.isArray(c.installments)) {
          for (const inst of c.installments) {
            const existingInst = await tx.stallRentalInstallment.findFirst({
              where: {
                contractId: contract.id,
                installmentNumber: inst.installmentNumber,
              },
            });

            if (existingInst) {
              if (inst.status === 'PAGADO' && existingInst.status !== 'PAGADO') {
                await tx.stallRentalInstallment.update({
                  where: { id: existingInst.id },
                  data: {
                    status: 'PAGADO',
                    paidAt: inst.paidAt ? new Date(inst.paidAt) : new Date(),
                    receiptNumber: inst.receiptNumber || existingInst.receiptNumber,
                    paymentMethod: inst.paymentMethod || 'EFECTIVO',
                  },
                });
                stats.installmentsUpdated++;
              }
            } else {
              await tx.stallRentalInstallment.create({
                data: {
                  contractId: contract.id,
                  installmentNumber: inst.installmentNumber,
                  dueDate: inst.dueDate ? new Date(inst.dueDate) : new Date(),
                  rentAmount: Number(inst.rentAmount || c.monthlyRent || 170),
                  interestAmount: Number(inst.interestAmount || 0),
                  totalAmount: Number(inst.totalAmount || c.monthlyRent || 170),
                  status: inst.status || 'PENDIENTE',
                  paidAt: inst.paidAt ? new Date(inst.paidAt) : null,
                  receiptNumber: inst.receiptNumber,
                  paymentMethod: inst.paymentMethod,
                },
              });
              stats.installmentsUpdated++;
            }
          }
        }
      }

      // 3. Payments Merge
      const allConcepts = await tx.paymentConcept.findMany();
      const conceptMap = new Map(allConcepts.map((cp) => [cp.id, cp]));
      const defaultConcept = allConcepts[0];

      for (const p of payments) {
        if (!p.operationNumber) continue;

        const exists = await tx.payment.findUnique({
          where: { operationNumber: p.operationNumber },
        });

        if (exists) {
          stats.paymentsExisting++;
          continue;
        }

        // Resolve valid concept
        const conceptId = conceptMap.has(p.conceptId) ? p.conceptId : defaultConcept?.id;

        // Check merchant exists
        let validMerchantId: string | null = null;
        if (p.merchantId) {
          const m = await tx.merchant.findUnique({ where: { id: p.merchantId } });
          if (m) validMerchantId = m.id;
        }

        await tx.payment.create({
          data: {
            operationNumber: p.operationNumber,
            merchantId: validMerchantId,
            conceptId: conceptId!,
            amount: Number(p.amount),
            period: p.period || 'N/A',
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            collectedById: systemUserId,
            notes: p.notes ? `[MIGRADO] ${p.notes}` : '[MIGRADO CONTADORA]',
            paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
          },
        });
        stats.paymentsCreated++;
      }

      // 4. Expenses Upsert
      for (const exp of expenses) {
        if (!exp.concept || !exp.amount) continue;

        const expDate = exp.date ? new Date(exp.date) : new Date();
        const existingExp = await tx.marketExpense.findFirst({
          where: {
            concept: exp.concept,
            amount: Number(exp.amount),
            date: expDate,
          },
        });

        if (!existingExp) {
          const expenseCode = exp.code || `EGR-${expDate.getFullYear()}${String(expDate.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
          await tx.marketExpense.create({
            data: {
              code: expenseCode,
              date: expDate,
              category: exp.category || 'MANTENIMIENTO_OBRAS',
              concept: exp.concept,
              beneficiary: exp.beneficiary || exp.supplier || 'Varios',
              documentType: exp.documentType || 'RECIBO_INTERNO',
              documentNumber: exp.documentNumber || exp.receiptNumber || 'S/N',
              amount: Number(exp.amount),
              paymentMethod: exp.paymentMethod || 'EFECTIVO',
              status: exp.status || 'PAGADO',
              notes: exp.notes,
              createdById: systemUserId,
            },
          });
          stats.expensesUpserted++;
        }
      }

      // 5. Loans Upsert
      for (const ln of loans) {
        if (!ln.orderNumber && !ln.id) continue;
        const existingLoan = await tx.loan.findFirst({
          where: {
            OR: [
              ...(ln.orderNumber ? [{ orderNumber: ln.orderNumber }] : []),
              { id: ln.id },
            ],
          },
        });

        if (!existingLoan && ln.borrowerDni) {
          await tx.loan.create({
            data: {
              orderNumber: ln.orderNumber || `FR-PREST-${Date.now().toString().slice(-4)}`,
              borrowerName: ln.borrowerName || 'Prestatario',
              borrowerDni: ln.borrowerDni,
              amount: Number(ln.amount),
              termMonths: Number(ln.termMonths || 1),
              interestRate: Number(ln.interestRate || 3.0),
              totalAmount: Number(ln.totalAmount || ln.amount),
              status: ln.status || 'VIGENTE',
              notes: ln.notes,
              createdById: systemUserId,
            },
          });
          stats.loansUpserted++;
        }
      }
    });

    return {
      success: true,
      message: 'Migración contable completada exitosamente',
      timestamp: new Date().toISOString(),
      stats,
    };
  }
}
