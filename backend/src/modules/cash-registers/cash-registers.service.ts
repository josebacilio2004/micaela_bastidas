import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CashRegisterStatus, CashMovementType, AuditAction } from '@prisma/client';
import {
  isAlcabalaConcept,
  isWaterConcept,
  isAssemblyConcept,
  isSanitaryConcept,
} from '../../common/utils/concept-classifier.util';

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
    const registerName = dto.name?.trim() || 'Caja General del Día';
    const existing = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO, name: registerName },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe una caja abierta con el nombre "${existing.name}". Debe cerrarla antes de abrir una nueva con el mismo nombre.`);
    }

    const register = await this.prisma.cashRegister.create({
      data: {
        name: registerName,
        openingAmount: dto.openingAmount || 0,
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
        newValues: { name: registerName, openingAmount: dto.openingAmount },
      },
    });

    return register;
  }

  async getDailyConsolidated(dateStr?: string) {
    let startOfDay: Date;
    let endOfDay: Date;

    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      } else {
        const target = new Date(dateStr);
        startOfDay = new Date(target);
        startOfDay.setHours(0, 0, 0, 0);
        endOfDay = new Date(target);
        endOfDay.setHours(23, 59, 59, 999);
      }
    } else {
      const now = new Date();
      startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
    }

    const registers = await this.prisma.cashRegister.findMany({
      where: {
        openedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
    });

    const anyCurrentOpen = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      include: {
        openedBy: { select: { fullName: true } },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
        isVoided: false,
      },
      include: {
        concept: true,
        merchant: {
          include: { stall: true, merchantType: true },
        },
        collectedBy: { select: { fullName: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const sanitarySessions = await this.prisma.sanitaryServiceSession.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: { operator: { select: { fullName: true } } },
      orderBy: { startTime: 'desc' },
    });

    const alcabalaPayments = payments.filter((p) => isAlcabalaConcept(p.concept.code, p.concept.name));
    const alcabalaSum = alcabalaPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const waterPayments = payments.filter((p) => isWaterConcept(p.concept.code, p.concept.name));
    const waterSum = waterPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const assemblyPayments = payments.filter((p) => isAssemblyConcept(p.concept.code, p.concept.name));
    const assemblySum = assemblyPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const otherPayments = payments.filter(
      (p) =>
        !isAlcabalaConcept(p.concept.code, p.concept.name) &&
        !isWaterConcept(p.concept.code, p.concept.name) &&
        !isAssemblyConcept(p.concept.code, p.concept.name),
    );
    const otherPaymentsSum = otherPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const totalPaymentsSum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const sanitarySum = sanitarySessions.reduce((acc, s) => acc + Number(s.totalCollected), 0);

    const totalCollected = totalPaymentsSum + sanitarySum;
    const openingTotal = registers.reduce((acc, r) => acc + Number(r.openingAmount), 0);
    const countedTotal = registers
      .filter((r) => r.countedCash != null)
      .reduce((acc, r) => acc + Number(r.countedCash), 0);
    const differenceTotal = registers
      .filter((r) => r.difference != null)
      .reduce((acc, r) => acc + Number(r.difference), 0);

    return {
      date: startOfDay.toISOString().split('T')[0],
      registersCount: registers.length,
      activeRegisters: registers.filter((r) => r.status === 'ABIERTO'),
      currentlyOpenRegister: anyCurrentOpen,
      closedRegisters: registers.filter((r) => r.status === 'CERRADO'),
      breakdown: {
        alcabala: alcabalaSum,
        water: waterSum,
        assemblies: assemblySum,
        other: otherPaymentsSum,
        sanitary: sanitarySum,
        totalPayments: totalPaymentsSum,
        totalCollected,
        openingTotal,
        expectedTotal: openingTotal + totalCollected,
        countedTotal,
        differenceTotal,
      },
      counts: {
        alcabala: alcabalaPayments.length,
        water: waterPayments.length,
        assemblies: assemblyPayments.length,
        other: otherPayments.length,
        totalPayments: payments.length,
        sanitarySessions: sanitarySessions.length,
      },
      paymentsCount: payments.length,
      sanitarySessionsCount: sanitarySessions.length,
      payments,
      sanitarySessions,
    };
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
        movements: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!register) throw new NotFoundException('Caja no encontrada');

    // Aggregate payments collected in this register
    const payments = await this.prisma.payment.findMany({
      where: { cashRegisterId: id, isVoided: false },
      include: {
        concept: true,
        merchant: {
          include: { stall: true, merchantType: true },
        },
        collectedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Aggregate sanitary sessions in this register
    const sessions = await this.prisma.sanitaryServiceSession.findMany({
      where: { cashRegisterId: id },
      include: { operator: { select: { fullName: true } } },
      orderBy: { startTime: 'desc' },
    });

    const alcabalaPayments = payments.filter((p) => isAlcabalaConcept(p.concept.code, p.concept.name));
    const alcabalaSum = alcabalaPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const waterPayments = payments.filter((p) => isWaterConcept(p.concept.code, p.concept.name));
    const waterSum = waterPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const assemblyPayments = payments.filter((p) => isAssemblyConcept(p.concept.code, p.concept.name));
    const assemblySum = assemblyPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const otherPayments = payments.filter(
      (p) =>
        !isAlcabalaConcept(p.concept.code, p.concept.name) &&
        !isWaterConcept(p.concept.code, p.concept.name) &&
        !isAssemblyConcept(p.concept.code, p.concept.name),
    );
    const otherPaymentsSum = otherPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const totalPaymentsSum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const sanitarySum = sessions.reduce((acc, s) => acc + Number(s.totalCollected), 0);

    const movementsIncome = register.movements
      .filter((m) => m.type === CashMovementType.INGRESO)
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const movementsExpense = register.movements
      .filter((m) => m.type === CashMovementType.EGRESO)
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const totalCollected = totalPaymentsSum + sanitarySum + movementsIncome;
    const expectedCash = Number(register.openingAmount) + totalCollected - movementsExpense;

    return {
      register,
      openingAmount: Number(register.openingAmount),
      alcabalaSum,
      waterSum,
      assemblySum,
      otherPaymentsSum,
      sanitarySum,
      totalPaymentsSum,
      movementsIncome,
      movementsExpense,
      totalCollected,
      expectedCash,
      paymentsCount: payments.length,
      sanitarySessionsCount: sessions.length,
      counts: {
        alcabala: alcabalaPayments.length,
        water: waterPayments.length,
        assemblies: assemblyPayments.length,
        other: otherPayments.length,
      },
      payments,
      sessions,
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
