import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { formatOperationNumber } from '../../common/utils/code-generator.util';
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
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const paymentsToday = await tx.payment.count({
        where: {
          paidAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const operationNumber = formatOperationNumber(now, paymentsToday + 1);

      const payment = await tx.payment.create({
        data: {
          operationNumber,
          merchantId: dto.merchantId,
          conceptId: dto.conceptId,
          obligationId: dto.obligationId,
          amount: dto.amount,
          period: dto.period,
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
}
