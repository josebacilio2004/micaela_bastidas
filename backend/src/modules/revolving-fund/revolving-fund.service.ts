import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CashRegisterStatus, CashMovementType } from '@prisma/client';

@Injectable()
export class RevolvingFundService {
  constructor(private prisma: PrismaService) {}

  // --- LOANS (PRESTAMOS) ---
  async findAllLoans() {
    return this.prisma.loan.findMany({
      include: {
        merchant: {
          select: { id: true, firstName: true, lastName: true, dni: true, internalCode: true },
        },
        collections: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findLoanById(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        merchant: true,
        collections: { orderBy: { date: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    return loan;
  }

  async createLoan(data: {
    merchantId?: string;
    borrowerName: string;
    borrowerDni: string;
    amount: number;
    termMonths?: number;
    interestRate?: number;
    notes?: string;
    createdById?: string;
  }) {
    const count = await this.prisma.loan.count();
    const orderNumber = 'FR-PREST-' + String(count + 1).padStart(4, '0');

    const principal = Number(data.amount);
    const months = Number(data.termMonths || 1);
    const rate = Number(data.interestRate || 0);
    const totalInterest = (principal * rate * months) / 100;
    const totalAmount = Number((principal + totalInterest).toFixed(2));

    return this.prisma.loan.create({
      data: {
        orderNumber,
        merchantId: data.merchantId && data.merchantId !== '' ? data.merchantId : null,
        borrowerName: data.borrowerName,
        borrowerDni: data.borrowerDni,
        amount: principal,
        termMonths: months,
        interestRate: rate,
        totalAmount,
        status: 'VIGENTE',
        notes: data.notes,
        createdById: data.createdById,
      },
      include: { merchant: true },
    });
  }

  // --- COLLECTIONS (COBRANZAS) ---
  async findAllCollections() {
    return this.prisma.loanCollection.findMany({
      include: {
        loan: {
          select: { orderNumber: true, borrowerName: true, amount: true, status: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createCollection(data: {
    loanId: string;
    description: string;
    principalAmount: number;
    interestAmount: number;
    paymentMethod?: any;
    receiptNumber?: string;
    createdById?: string;
  }) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: data.loanId },
      include: { collections: true },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');

    const count = await this.prisma.loanCollection.count();
    const orderNumber = 'FR-COB-' + String(count + 1).padStart(4, '0');

    const principal = Number(data.principalAmount || 0);
    const interest = Number(data.interestAmount || 0);
    const total = Number((principal + interest).toFixed(2));

    // Registrar ingreso en caja activa si es cobro en efectivo o general
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
    });

    if (activeRegister && (data.paymentMethod === 'EFECTIVO' || !data.paymentMethod)) {
      await this.prisma.cashMovement.create({
        data: {
          cashRegisterId: activeRegister.id,
          type: CashMovementType.INGRESO,
          concept: `Fondo Rotatorio (${loan.orderNumber}): ${data.description || 'Amortización'} - ${loan.borrowerName}`,
          amount: total,
          reference: data.receiptNumber || orderNumber,
          userId: data.createdById || activeRegister.openedById,
        },
      });
    }

    const collection = await this.prisma.loanCollection.create({
      data: {
        orderNumber,
        loanId: data.loanId,
        borrowerName: loan.borrowerName,
        description: data.description || 'Amortización de cuota',
        principalAmount: principal,
        interestAmount: interest,
        totalAmount: total,
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        receiptNumber: data.receiptNumber,
        createdById: data.createdById,
      },
    });

    // Check total amortized vs loan totalAmount
    const totalCollected = loan.collections.reduce((sum, c) => sum + Number(c.totalAmount), 0) + total;
    if (totalCollected >= Number(loan.totalAmount)) {
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: { status: 'CANCELADO' },
      });
    }

    return collection;
  }

  /**
   * Generar contrato legal y cronograma oficial de amortización
   */
  async getLoanContract(id: string) {
    const loan = await this.findLoanById(id);

    const principal = Number(loan.amount);
    const months = Number(loan.termMonths) || 1;
    const rate = Number(loan.interestRate || 0);
    const totalInterest = (principal * rate * months) / 100;
    const totalToPay = principal + totalInterest;

    const monthlyPrincipal = Number((principal / months).toFixed(2));
    const monthlyInterest = Number((totalInterest / months).toFixed(2));
    const monthlyTotal = Number((totalToPay / months).toFixed(2));

    const startDate = new Date(loan.date);
    const schedule = [];
    let remainingBalance = totalToPay;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);

      remainingBalance = Math.max(0, Number((remainingBalance - monthlyTotal).toFixed(2)));

      // Verificar si ya fue amortizada alguna cobranza
      const isPaid = (loan.collections && loan.collections.length >= i) || loan.status === 'CANCELADO';

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principalAmount: monthlyPrincipal.toFixed(2),
        interestAmount: monthlyInterest.toFixed(2),
        totalInstallment: monthlyTotal.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2),
        status: isPaid ? 'PAGADO' : 'PENDIENTE',
      });
    }

    return {
      title: 'CONTRATO DE MUTUO DINERARIO - FONDO ROTATORIO DE SOLIDARIDAD COMERCIAL',
      orderNumber: loan.orderNumber,
      association: 'ASOCIACIÓN DE COMERCIANTES DEL MERCADO DE ABASTOS MICAELA BASTIDAS',
      ruc: '20486000001',
      date: new Date(loan.date).toISOString().split('T')[0],
      borrower: {
        name: loan.borrowerName,
        dni: loan.borrowerDni,
        internalCode: loan.merchant?.internalCode || 'NO_SOCIO',
        stallCode: (loan.merchant as any)?.stall?.code || 'N/A',
      },
      loanDetails: {
        principalAmount: principal.toFixed(2),
        interestRateMonthly: rate.toFixed(2),
        termMonths: months,
        totalInterest: totalInterest.toFixed(2),
        totalAmountToPay: totalToPay.toFixed(2),
        monthlyQuota: monthlyTotal.toFixed(2),
        status: loan.status,
      },
      schedule,
      clauses: [
        'PRIMERA (FONDO ROTATORIO): El Fondo Rotatorio es un fondo común solidario instituido por la Asociación para dinamizar el capital comercial de sus socios e inquilinos.',
        'SEGUNDA (ENTREGA Y RECEPCIÓN): La ASOCIACIÓN entrega en calidad de préstamo el monto acordado, el cual el PRESTATARIO declara recibir a su entera conformidad.',
        'TERCERA (PLAZO Y VENCIMIENTO): El préstamo se amortizará puntualmente según las fechas detalladas en el Cronograma Oficial Anexo.',
        'CUARTA (TASA DE INTERÉS COMPENSATORIO): Se pacta una tasa mensual fija solidaria, destinada a cubrir los costos administrativos y reposición del fondo.',
        'QUINTA (INCUMPLIMIENTO): En caso de mora superior a dos cuotas, la Tesorería suspenderá nuevos créditos y someterá el cobro a la Asamblea General.',
      ],
    };
  }
}
