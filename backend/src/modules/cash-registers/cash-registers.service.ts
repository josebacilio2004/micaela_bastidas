import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CashRegisterStatus, CashMovementType, AuditAction } from '@prisma/client';

@Injectable()
export class CashRegistersService {
  constructor(private prisma: PrismaService) {}

  async findCurrentActive() {
    return this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      include: {
        openedBy: { select: { id: true, fullName: true, username: true } },
        movements: { include: { user: { select: { fullName: true } } } },
        _count: { select: { payments: true, sanitarySessions: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.cashRegister.findMany({
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
        _count: { select: { payments: true, sanitarySessions: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
  }

  async openRegister(dto: { name: string; openingAmount: number }, userId: string) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe una caja abierta (${existing.name}). Debe cerrarla antes de abrir una nueva.`);
    }

    const register = await this.prisma.cashRegister.create({
      data: {
        name: dto.name,
        openingAmount: dto.openingAmount,
        openedById: userId,
        status: CashRegisterStatus.ABIERTO,
      },
      include: { openedBy: { select: { fullName: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        module: 'CASH_REGISTER',
        entityName: 'CashRegister',
        entityId: register.id,
        newValues: { name: dto.name, openingAmount: dto.openingAmount },
      },
    });

    return register;
  }

  async addMovement(id: string, dto: { type: CashMovementType; concept: string; amount: number; reference?: string }, userId: string) {
    const register = await this.prisma.cashRegister.findUnique({ where: { id } });
    if (!register || register.status !== CashRegisterStatus.ABIERTO) {
      throw new BadRequestException('No se pueden registrar movimientos en una caja que no esté abierta');
    }

    return this.prisma.cashMovement.create({
      data: {
        cashRegisterId: id,
        type: dto.type,
        concept: dto.concept,
        amount: dto.amount,
        reference: dto.reference,
        userId,
      },
      include: { user: { select: { fullName: true } } },
    });
  }

  async getClosingSummary(id: string) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        openedBy: true,
        movements: true,
      },
    });
    if (!register) throw new NotFoundException('Caja no encontrada');

    // Aggregate payments collected in this register
    const payments = await this.prisma.payment.findMany({
      where: { cashRegisterId: id, isVoided: false },
      include: { concept: true },
    });

    // Aggregate sanitary sessions in this register
    const sessions = await this.prisma.sanitaryServiceSession.findMany({
      where: { cashRegisterId: id },
    });

    const alcabalaSum = payments
      .filter((p) => p.concept.code === 'ALCABALA')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const waterSum = payments
      .filter((p) => p.concept.code === 'AGUA')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const sanitarySum = sessions.reduce((acc, s) => acc + Number(s.totalCollected), 0);

    const movementsIncome = register.movements
      .filter((m) => m.type === CashMovementType.INGRESO)
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const movementsExpense = register.movements
      .filter((m) => m.type === CashMovementType.EGRESO)
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const totalCollected = alcabalaSum + waterSum + sanitarySum + movementsIncome;
    const expectedCash = Number(register.openingAmount) + totalCollected - movementsExpense;

    return {
      register,
      openingAmount: Number(register.openingAmount),
      alcabalaSum,
      waterSum,
      sanitarySum,
      movementsIncome,
      movementsExpense,
      totalCollected,
      expectedCash,
      paymentsCount: payments.length,
      sanitarySessionsCount: sessions.length,
    };
  }

  async closeRegister(
    id: string,
    dto: { countedCash: number; closingObservations?: string; discrepancyReason?: string },
    userId: string,
  ) {
    const summary = await this.getClosingSummary(id);
    const difference = dto.countedCash - summary.expectedCash;

    if (Math.abs(difference) > 0.01 && !dto.discrepancyReason) {
      throw new BadRequestException('Existe una diferencia entre el efectivo contado y el esperado. Debe ingresar el motivo de la diferencia obligatoriamente.');
    }

    const observations = dto.closingObservations
      ? `${dto.closingObservations} ${dto.discrepancyReason ? ' | Motivo diferencia: ' + dto.discrepancyReason : ''}`
      : dto.discrepancyReason || null;

    const closed = await this.prisma.cashRegister.update({
      where: { id },
      data: {
        closedById: userId,
        closedAt: new Date(),
        expectedCash: summary.expectedCash,
        countedCash: dto.countedCash,
        difference,
        closingObservations: observations,
        status: CashRegisterStatus.CERRADO,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CLOSE,
        module: 'CASH_REGISTER',
        entityName: 'CashRegister',
        entityId: id,
        newValues: {
          expectedCash: summary.expectedCash,
          countedCash: dto.countedCash,
          difference,
          observations,
        },
      },
    });

    return closed;
  }

  async reopenRegister(id: string, reason: string, userId: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Debe proporcionar una justificación detallada para la reapertura de la caja.');
    }

    const current = await this.prisma.cashRegister.findUnique({ where: { id } });
    if (!current || current.status !== CashRegisterStatus.CERRADO) {
      throw new BadRequestException('Solo se pueden reabrir cajas cerradas.');
    }

    const reopened = await this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: CashRegisterStatus.REABIERTO,
        reopenReason: reason,
        reopenedById: userId,
        reopenedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.REOPEN,
        module: 'CASH_REGISTER',
        entityName: 'CashRegister',
        entityId: id,
        previousValues: { status: CashRegisterStatus.CERRADO },
        newValues: { status: CashRegisterStatus.REABIERTO, reopenReason: reason },
      },
    });

    return reopened;
  }
}
