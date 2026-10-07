import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CashRegisterStatus, CashMovementType, PaymentMethod } from '@prisma/client';

@Injectable()
export class CashflowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resumen Integral de Ingresos vs. Egresos y Flujo de Caja
   */
  async getSummary(query?: { startDate?: string; endDate?: string }) {
    let dateFilter: any = {};
    if (query?.startDate || query?.endDate) {
      dateFilter = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    // 1. INGRESOS
    // a) Pagos directos registrados (Alcabala, Agua, etc.)
    const payments = await this.prisma.payment.findMany({
      where: query?.startDate || query?.endDate ? { paidAt: dateFilter } : {},
      include: {
        concept: { select: { code: true, name: true } },
      },
    });

    let alcabalaIncome = 0;
    let waterIncome = 0;
    let finesIncome = 0;
    let otherPaymentsIncome = 0;

    for (const p of payments) {
      const code = p.concept?.code || '';
      const amount = Number(p.amount);
      if (code.includes('ALCABALA')) {
        alcabalaIncome += amount;
      } else if (code.includes('AGUA')) {
        waterIncome += amount;
      } else if (code.includes('MULTA')) {
        finesIncome += amount;
      } else {
        otherPaymentsIncome += amount;
      }
    }

    // b) Servicios Higiénicos
    const sshhSessions = await this.prisma.sanitaryServiceSession.findMany({
      where: query?.startDate || query?.endDate ? { startTime: dateFilter } : {},
    });
    const sshhIncome = sshhSessions.reduce((acc, s) => acc + Number(s.totalCollected || 0), 0);

    // c) Alquileres de Puestos (Cuotas cobradas)
    const rentalInstallments = await this.prisma.stallRentalInstallment.findMany({
      where: {
        status: 'PAGADO',
        ...(query?.startDate || query?.endDate ? { paidAt: dateFilter } : {}),
      },
    });
    const rentalIncome = rentalInstallments.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);

    // d) Publicidad
    const ads = await this.prisma.advertisement.findMany({
      where: query?.startDate || query?.endDate ? { startDate: dateFilter } : {},
    });
    const advertisingIncome = ads.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    // e) Cobranzas Fondo Rotatorio
    const loanCollections = await this.prisma.loanCollection.findMany({
      where: query?.startDate || query?.endDate ? { date: dateFilter } : {},
    });
    const loanCollectionsIncome = loanCollections.reduce((acc, lc) => acc + Number(lc.totalAmount || 0), 0);

    const totalIncome =
      alcabalaIncome +
      waterIncome +
      sshhIncome +
      rentalIncome +
      advertisingIncome +
      loanCollectionsIncome +
      finesIncome +
      otherPaymentsIncome;

    // 2. EGRESOS
    // a) Planilla de Personal
    const staffPayments = await this.prisma.staffPayment.findMany({
      where: query?.startDate || query?.endDate ? { paymentDate: dateFilter } : {},
    });
    const payrollExpense = staffPayments.reduce((acc, sp) => acc + Number(sp.amount || 0), 0);

    // b) Desembolsos de préstamos Fondo Rotatorio
    const loans = await this.prisma.loan.findMany({
      where: query?.startDate || query?.endDate ? { date: dateFilter } : {},
    });
    const loansDisbursedExpense = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);

    // c) Egresos del Mercado (categorizados)
    const expenses = await this.prisma.marketExpense.findMany({
      where: {
        status: 'PAGADO',
        ...(query?.startDate || query?.endDate ? { date: dateFilter } : {}),
      },
    });

    let utilitiesExpense = 0;
    let maintenanceExpense = 0;
    let adminLegalExpense = 0;
    let otherExpenses = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount);
      if (exp.category === 'SERVICIOS_BASICOS') {
        utilitiesExpense += amt;
      } else if (exp.category === 'MANTENIMIENTO_OBRAS') {
        maintenanceExpense += amt;
      } else if (exp.category === 'ADMINISTRATIVOS_LEGALES') {
        adminLegalExpense += amt;
      } else if (exp.category === 'PLANILLA_PERSONAL') {
        // En caso se haya registrado también como MarketExpense
        // no duplicar si es necesario
        otherExpenses += amt;
      } else {
        otherExpenses += amt;
      }
    }

    const totalExpenses =
      payrollExpense +
      loansDisbursedExpense +
      utilitiesExpense +
      maintenanceExpense +
      adminLegalExpense +
      otherExpenses;

    const netBalance = totalIncome - totalExpenses;

    // Saldo actual en caja física
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
      include: {
        payments: true,
        movements: true,
      },
    });

    let currentCash = 0;
    if (activeRegister) {
      currentCash = Number(activeRegister.openingAmount);
      for (const p of activeRegister.payments) {
        currentCash += Number(p.amount);
      }
      for (const m of activeRegister.movements) {
        if (m.type === CashMovementType.INGRESO) currentCash += Number(m.amount);
        if (m.type === CashMovementType.EGRESO) currentCash -= Number(m.amount);
      }
    }

    return {
      period: {
        startDate: query?.startDate || 'Inicio',
        endDate: query?.endDate || 'Hoy',
      },
      // Root-level fields expected by /flujo-caja frontend
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      activeCashRegisterBalance: Number(currentCash.toFixed(2)),
      activeCashRegisterName: activeRegister?.name || 'Sin caja abierta',
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
        currentPhysicalCash: Number(currentCash.toFixed(2)),
        activeCashRegisterBalance: Number(currentCash.toFixed(2)),
        activeCashRegisterName: activeRegister?.name || 'Sin caja abierta',
      },
      incomeBreakdown: {
        alcabala: Number(alcabalaIncome.toFixed(2)),
        water: Number(waterIncome.toFixed(2)),
        sshh: Number(sshhIncome.toFixed(2)),
        sanitaryServices: Number(sshhIncome.toFixed(2)),
        rentals: Number(rentalIncome.toFixed(2)),
        stallRentals: Number(rentalIncome.toFixed(2)),
        advertising: Number(advertisingIncome.toFixed(2)),
        loanCollections: Number(loanCollectionsIncome.toFixed(2)),
        revolvingFundCollections: Number(loanCollectionsIncome.toFixed(2)),
        fines: Number(finesIncome.toFixed(2)),
        others: Number(otherPaymentsIncome.toFixed(2)),
      },
      expenseBreakdown: {
        payroll: Number(payrollExpense.toFixed(2)),
        staffPayroll: Number(payrollExpense.toFixed(2)),
        utilities: Number(utilitiesExpense.toFixed(2)),
        maintenanceAndWorks: Number(maintenanceExpense.toFixed(2)),
        loansDisbursed: Number(loansDisbursedExpense.toFixed(2)),
        adminAndLegal: Number(adminLegalExpense.toFixed(2)),
        others: Number(otherExpenses.toFixed(2)),
      },
    };
  }

  // --- GESTIÓN DE EGRESOS (CRUD) ---
  async findAllExpenses(query?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};
    if (query?.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (query?.search) {
      where.OR = [
        { concept: { contains: query.search, mode: 'insensitive' } },
        { beneficiary: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.marketExpense.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        cashRegister: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOneExpense(id: string) {
    const expense = await this.prisma.marketExpense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        cashRegister: true,
      },
    });
    if (!expense) throw new NotFoundException('Egreso no encontrado');
    return expense;
  }

  async createExpense(dto: CreateExpenseDto, userId?: string) {
    const count = await this.prisma.marketExpense.count();
    const code = 'EGR-' + String(count + 1).padStart(5, '0');
    const amount = Number(dto.amount);
    const date = dto.date ? new Date(dto.date) : new Date();

    let cashRegisterId: string | null = null;

    // Si se desea reflejar en la caja de tesorería activa
    if (dto.registerCashExpense !== false) {
      const activeRegister = await this.prisma.cashRegister.findFirst({
        where: { status: CashRegisterStatus.ABIERTO },
        orderBy: { openedAt: 'desc' },
      });

      if (activeRegister) {
        cashRegisterId = activeRegister.id;
        await this.prisma.cashMovement.create({
          data: {
            cashRegisterId: activeRegister.id,
            type: CashMovementType.EGRESO,
            concept: `[${dto.category}] ${dto.concept.trim()} (${dto.beneficiary.trim()})`,
            amount,
            reference: dto.documentNumber || code,
            userId: userId || activeRegister.openedById,
          },
        });
      }
    }

    return this.prisma.marketExpense.create({
      data: {
        code,
        category: dto.category,
        concept: dto.concept.trim(),
        amount,
        date,
        beneficiary: dto.beneficiary.trim(),
        documentType: dto.documentType || 'FACTURA',
        documentNumber: dto.documentNumber?.trim() || null,
        fileUrl: dto.fileUrl || null,
        paymentMethod: dto.paymentMethod || PaymentMethod.EFECTIVO,
        cashRegisterId,
        status: 'PAGADO',
        notes: dto.notes?.trim() || null,
        createdById: userId || null,
      },
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.marketExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Egreso no encontrado');

    return this.prisma.marketExpense.update({
      where: { id },
      data: {
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.concept ? { concept: dto.concept.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: Number(dto.amount) } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.beneficiary ? { beneficiary: dto.beneficiary.trim() } : {}),
        ...(dto.documentType ? { documentType: dto.documentType } : {}),
        ...(dto.documentNumber !== undefined ? { documentNumber: dto.documentNumber?.trim() || null } : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl || null } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
  }

  async deleteExpense(id: string) {
    const expense = await this.prisma.marketExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Egreso no encontrado');

    return this.prisma.marketExpense.update({
      where: { id },
      data: { status: 'ANULADO' },
    });
  }

  /**
   * Libro Diario Unificado de Movimientos de Caja
   */
  async getCashbook(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [payments, expenses, sshhSessions, rentalInstallments, loanCollections, staffPayments] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: { paidAt: { gte: startOfDay, lte: endOfDay } },
          include: { concept: true, merchant: true },
        }),
        this.prisma.marketExpense.findMany({
          where: { date: { gte: startOfDay, lte: endOfDay }, status: 'PAGADO' },
        }),
        this.prisma.sanitaryServiceSession.findMany({
          where: { startTime: { gte: startOfDay, lte: endOfDay } },
        }),
        this.prisma.stallRentalInstallment.findMany({
          where: { paidAt: { gte: startOfDay, lte: endOfDay }, status: 'PAGADO' },
          include: { contract: true },
        }),
        this.prisma.loanCollection.findMany({
          where: { date: { gte: startOfDay, lte: endOfDay } },
        }),
        this.prisma.staffPayment.findMany({
          where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
          include: { staffMember: true },
        }),
      ]);

    const entries: any[] = [];

    // Pagos Alcabala/Agua
    for (const p of payments) {
      entries.push({
        id: p.id,
        timestamp: p.paidAt,
        type: 'INGRESO',
        category: p.concept?.name || 'Recaudación de Cuota',
        description: `Cobro ${p.concept?.code || ''} a ${p.merchant?.lastName || ''}, ${p.merchant?.firstName || ''} (${p.period})`,
        amount: Number(p.amount),
        reference: p.operationNumber || p.id.slice(0, 8),
      });
    }

    // SSHH
    for (const s of sshhSessions) {
      if (Number(s.totalCollected) > 0) {
        entries.push({
          id: s.id,
          timestamp: s.startTime,
          type: 'INGRESO',
          category: 'Servicios Higiénicos',
          description: `Turno SSHH (${s.urinalCount} micc. / ${s.toiletCount} retr.)`,
          amount: Number(s.totalCollected),
          reference: `SES-${s.id.slice(0, 8)}`,
        });
      }
    }

    // Alquileres
    for (const r of rentalInstallments) {
      entries.push({
        id: r.id,
        timestamp: r.paidAt || r.dueDate,
        type: 'INGRESO',
        category: 'Alquiler de Puesto',
        description: `Cuota ${r.installmentNumber} Puesto ${r.contract.stallCode} (${r.contract.tenantName})`,
        amount: Number(r.totalAmount),
        reference: r.receiptNumber || `ALQ-CUOTA-${r.installmentNumber}`,
      });
    }

    // Fondo Rotatorio
    for (const lc of loanCollections) {
      entries.push({
        id: lc.id,
        timestamp: lc.date,
        type: 'INGRESO',
        category: 'Fondo Rotatorio',
        description: `Cobranza crédito ${lc.borrowerName} (${lc.description})`,
        amount: Number(lc.totalAmount),
        reference: lc.orderNumber,
      });
    }

    // Egresos del mercado
    for (const e of expenses) {
      entries.push({
        id: e.id,
        timestamp: e.date,
        type: 'EGRESO',
        category: e.category,
        description: `${e.concept} (Beneficiario: ${e.beneficiary})`,
        amount: Number(e.amount),
        reference: e.documentNumber || e.code,
      });
    }

    // Planilla
    for (const sp of staffPayments) {
      entries.push({
        id: sp.id,
        timestamp: sp.paymentDate,
        type: 'EGRESO',
        category: 'PLANILLA_PERSONAL',
        description: `Sueldo ${sp.staffMember.lastName}, ${sp.staffMember.firstName} (${sp.period})`,
        amount: Number(sp.amount),
        reference: sp.receiptNumber || `PLAN-${sp.period}`,
      });
    }

    // Ordenar cronológicamente
    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let runningBalance = 0;
    const ledger = entries.map((item) => {
      if (item.type === 'INGRESO') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return {
        ...item,
        runningBalance: Number(runningBalance.toFixed(2)),
      };
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalEntries: ledger.length,
      finalBalance: Number(runningBalance.toFixed(2)),
      entries: ledger,
    };
  }
}
