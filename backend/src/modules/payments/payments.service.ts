import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { formatOperationNumber, getDatePrefix } from '../../common/utils/code-generator.util';
import { CashRegisterStatus, ObligationStatus, AuditAction, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    search?: string;
    conceptId?: string;
    merchantId?: string;
    startDate?: string;
    endDate?: string;
    cashRegisterId?: string;
    take?: number;
    skip?: number;
  }) {
    const { search, conceptId, merchantId, startDate, endDate, cashRegisterId, take = 50, skip = 0 } = query;

    const where: any = {
      isVoided: false,
      ...(conceptId ? { conceptId } : {}),
      ...(merchantId ? { merchantId } : {}),
      ...(cashRegisterId ? { cashRegisterId } : {}),
      ...(startDate || endDate
        ? {
            paidAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { operationNumber: { contains: search, mode: 'insensitive' } },
              { merchant: { dni: { contains: search, mode: 'insensitive' } } },
              { merchant: { firstName: { contains: search, mode: 'insensitive' } } },
              { merchant: { lastName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          merchant: { include: { stall: true, merchantType: true } },
          concept: true,
          collectedBy: { select: { id: true, fullName: true, username: true } },
          obligation: true,
          cashRegister: { select: { id: true, name: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: Number(take),
        skip: Number(skip),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        merchant: { include: { stall: true, merchantType: true, sector: true } },
        concept: true,
        collectedBy: { select: { id: true, fullName: true, username: true } },
        obligation: true,
        cashRegister: true,
      },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }

  async create(dto: CreatePaymentDto, userId: string, idempotencyKeyHeader?: string) {
    const idempotencyKey = idempotencyKeyHeader || dto.idempotencyKey;

    // 1. Idempotency Check: if request was already processed, return existing payment
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
        include: {
          merchant: { include: { stall: true, merchantType: true } },
          concept: true,
          collectedBy: { select: { fullName: true } },
        },
      });
      if (existing) {
        return { payment: existing, isDuplicate: true };
      }
    }

    // 2. Validate obligation if provided
    let obligation: any = null;
    if (dto.obligationId) {
      obligation = await this.prisma.paymentObligation.findUnique({
        where: { id: dto.obligationId },
      });
      if (!obligation) throw new NotFoundException('La obligación especificada no existe');
      if (obligation.status === ObligationStatus.PAGADO) {
        throw new ConflictException('Esta obligación ya fue pagada anteriormente');
      }
    } else if (dto.merchantId && dto.conceptId && dto.period) {
      // Prevent duplicate payment for same concept and period
      const alreadyPaid = await this.prisma.payment.findFirst({
        where: {
          merchantId: dto.merchantId,
          conceptId: dto.conceptId,
          period: dto.period,
          isVoided: false,
        },
      });
      if (alreadyPaid) {
        throw new ConflictException(
          `El comerciante ya tiene un pago registrado para este concepto en el período ${dto.period} (Comprobante: ${alreadyPaid.operationNumber}).`,
        );
      }
    }

    // 3. Resolve Active Cash Register if not explicitly specified
    let registerId = dto.cashRegisterId;
    if (!registerId) {
      const activeRegister = await this.prisma.cashRegister.findFirst({
        where: { status: CashRegisterStatus.ABIERTO },
        orderBy: { openedAt: 'desc' },
      });
      if (activeRegister) {
        registerId = activeRegister.id;
      }
    }

    // 4. Atomic transaction with sequential receipt numbering MB-YYYYMMDD-XXXXX
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const prefix = getDatePrefix(now);

      const lastPaymentToday = await tx.payment.findFirst({
        where: {
          operationNumber: { startsWith: prefix },
        },
        orderBy: {
          operationNumber: 'desc',
        },
        select: {
          operationNumber: true,
        },
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
      while (await tx.payment.findUnique({ where: { operationNumber }, select: { id: true } })) {
        nextSeq++;
        operationNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
      }

      const payment = await tx.payment.create({
        data: {
          operationNumber,
          merchantId: dto.merchantId,
          conceptId: dto.conceptId,
          obligationId: dto.obligationId,
          amount: dto.amount,
          period: (obligation && obligation.period) ? obligation.period : (dto.period || 'N/A'),
          paymentMethod: dto.paymentMethod || PaymentMethod.EFECTIVO,
          cashRegisterId: registerId,
          collectedById: userId,
          idempotencyKey,
          notes: dto.notes,
          paidAt: now,
        },
        include: {
          merchant: { include: { stall: true, merchantType: true } },
          concept: true,
          collectedBy: { select: { fullName: true } },
        },
      });

      // Update obligation to PAGADO
      if (dto.obligationId) {
        await tx.paymentObligation.update({
          where: { id: dto.obligationId },
          data: {
            status: ObligationStatus.PAGADO,
            paidAt: now,
          },
        });
      }

      // Record Audit
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.PAYMENT,
          module: 'PAYMENTS',
          entityName: 'Payment',
          entityId: payment.id,
          newValues: {
            operationNumber,
            amount: dto.amount,
            conceptId: dto.conceptId,
            merchantId: dto.merchantId,
          },
        },
      });

      return { payment, isDuplicate: false };
    });
  }

  async voidPayment(id: string, reason: string, userId: string) {
    const payment = await this.findOne(id);
    if (payment.isVoided) throw new BadRequestException('El pago ya se encuentra anulado');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          isVoided: true,
          voidedReason: reason,
          voidedAt: new Date(),
          voidedById: userId,
        },
      });

      // Restore obligation to PENDIENTE if associated
      if (payment.obligationId) {
        await tx.paymentObligation.update({
          where: { id: payment.obligationId },
          data: {
            status: ObligationStatus.PENDIENTE,
            paidAt: null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE,
          module: 'PAYMENTS',
          entityName: 'Payment',
          entityId: id,
          previousValues: { isVoided: false },
          newValues: { isVoided: true, voidedReason: reason },
        },
      });

      return updated;
    });
  }

  async createBulk(
    items: Array<{
      merchantId: string;
      conceptId?: string;
      conceptCode?: string;
      obligationId?: string;
      amount: number;
      period: string;
      paymentMethod?: PaymentMethod;
      notes?: string;
      paidAt?: string;
    }>,
    userId: string,
  ) {
    if (!items || items.length === 0) {
      return { count: 0, payments: [] };
    }

    const conceptCache = new Map<string, any>();
    const allConcepts = await this.prisma.paymentConcept.findMany();
    for (const c of allConcepts) {
      conceptCache.set(c.id, c);
      conceptCache.set(c.code, c);
    }

    let registerId: string | null = null;
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
    });
    if (activeRegister) {
      registerId = activeRegister.id;
    }

    const createdPayments: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const prefix = getDatePrefix(now);

      const lastPaymentToday = await tx.payment.findFirst({
        where: {
          operationNumber: { startsWith: prefix },
        },
        orderBy: {
          operationNumber: 'desc',
        },
        select: {
          operationNumber: true,
        },
      });

      let nextSeq = 1;
      if (lastPaymentToday && lastPaymentToday.operationNumber) {
        const parts = lastPaymentToday.operationNumber.split('-');
        const seqNum = parseInt(parts[2], 10);
        if (!isNaN(seqNum) && seqNum >= nextSeq) {
          nextSeq = seqNum + 1;
        }
      }

      for (const item of items) {
        let resolvedConceptId = item.conceptId;
        if (!resolvedConceptId && item.conceptCode) {
          let found = conceptCache.get(item.conceptCode);
          if (!found) {
            found = await tx.paymentConcept.findUnique({ where: { code: item.conceptCode } });
            if (!found) {
              found = await tx.paymentConcept.create({
                data: {
                  code: item.conceptCode,
                  name: item.conceptCode === 'COCHERA' ? 'Servicio de Cochera / Parqueo' : item.conceptCode,
                  periodicity: 'DIARIO',
                  isActive: true,
                },
              });
            }
            conceptCache.set(found.id, found);
            conceptCache.set(found.code, found);
          }
          if (found) resolvedConceptId = found.id;
        }
        if (!resolvedConceptId) {
          resolvedConceptId = allConcepts[0]?.id;
        }

        // Validar si merchantId existe como FK real en la base de datos
        let validMerchantId: string | null = null;
        if (item.merchantId) {
          const mExists = await tx.merchant.findUnique({
            where: { id: item.merchantId },
            select: { id: true },
          });
          if (mExists) {
            validMerchantId = item.merchantId;
          }
        }

        if (validMerchantId && resolvedConceptId && item.period) {
          const existing = await tx.payment.findFirst({
            where: {
              merchantId: validMerchantId,
              conceptId: resolvedConceptId,
              period: item.period,
              isVoided: false,
            },
          });
          if (existing) {
            createdPayments.push(existing);
            continue;
          }
        }

        let operationNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
        nextSeq++;

        // Garantizar unicidad absoluta - colisión imposible
        while (await tx.payment.findUnique({ where: { operationNumber }, select: { id: true } })) {
          operationNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
          nextSeq++;
        }

        const paidAtDate = item.paidAt ? new Date(item.paidAt) : now;

        const payment = await tx.payment.create({
          data: {
            operationNumber,
            merchantId: validMerchantId,
            conceptId: resolvedConceptId!,
            obligationId: item.obligationId,
            amount: Number(item.amount),
            period: item.period,
            paymentMethod: item.paymentMethod || PaymentMethod.EFECTIVO,
            cashRegisterId: registerId,
            collectedById: userId,
            notes: item.notes,
            paidAt: paidAtDate,
          },
          include: {
            merchant: { include: { stall: true, merchantType: true } },
            concept: true,
          },
        });

        if (item.obligationId) {
          await tx.paymentObligation.update({
            where: { id: item.obligationId },
            data: {
              status: ObligationStatus.PAGADO,
              paidAt: paidAtDate,
            },
          });
        }

        createdPayments.push(payment);
      }
    });

    return { count: createdPayments.length, payments: createdPayments };
  }
}
