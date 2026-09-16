import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
    const rate = Number(data.interestRate || 0);
    const totalAmount = principal + (principal * rate) / 100;

    return this.prisma.loan.create({
      data: {
        orderNumber,
        merchantId: data.merchantId && data.merchantId !== '' ? data.merchantId : null,
        borrowerName: data.borrowerName,
        borrowerDni: data.borrowerDni,
        amount: principal,
        termMonths: Number(data.termMonths || 1),
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
    const total = principal + interest;

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
}
