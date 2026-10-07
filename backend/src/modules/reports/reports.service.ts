import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ObligationStatus } from '@prisma/client';
import {
  isAlcabalaConcept,
  isWaterConcept,
  isAssemblyConcept,
} from '../../common/utils/concept-classifier.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Payments today
    const paymentsToday = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: startOfToday, lte: endOfToday },
        isVoided: false,
      },
      include: { concept: true },
    });

    // 2. Sanitary sessions today
    const sanitaryToday = await this.prisma.sanitaryServiceSession.findMany({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
      },
    });

    const alcabalaToday = paymentsToday
      .filter((p) => isAlcabalaConcept(p.concept.code, p.concept.name))
      .reduce((a, b) => a + Number(b.amount), 0);

    const waterToday = paymentsToday
      .filter((p) => isWaterConcept(p.concept.code, p.concept.name))
      .reduce((a, b) => a + Number(b.amount), 0);

    const otherPaymentsToday = paymentsToday
      .filter((p) => !isAlcabalaConcept(p.concept.code, p.concept.name) && !isWaterConcept(p.concept.code, p.concept.name))
      .reduce((a, b) => a + Number(b.amount), 0);

    const urinalToday = sanitaryToday.reduce((a, b) => a + Number(b.urinalTotal), 0);
    const toiletToday = sanitaryToday.reduce((a, b) => a + Number(b.toiletTotal), 0);
    const sanitaryTotalToday = urinalToday + toiletToday;

    const totalToday = alcabalaToday + waterToday + otherPaymentsToday + sanitaryTotalToday;

    // 3. Month collection
    const paymentsMonth = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: startOfMonth, lte: endOfMonth },
        isVoided: false,
      },
      include: { concept: true },
    });
    const sanitaryMonth = await this.prisma.sanitaryServiceSession.findMany({
      where: {
        startTime: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    const totalMonth =
      paymentsMonth.reduce((a, b) => a + Number(b.amount), 0) +
      sanitaryMonth.reduce((a, b) => a + Number(b.totalCollected), 0);

    // 4. Merchants Count by Type
    const [sociosCount, ambulantesFijosCount, ambulantesTempCount] = await Promise.all([
      this.prisma.merchant.count({ where: { merchantType: { code: 'SOCIO' }, isDeleted: false } }),
      this.prisma.merchant.count({ where: { merchantType: { code: 'AMBULANTE_FIJO' }, isDeleted: false } }),
      this.prisma.merchant.count({ where: { merchantType: { code: 'AMBULANTE_TEMPORAL' }, isDeleted: false } }),
    ]);

    // 5. Pending obligations count and sum
    const pendingObligations = await this.prisma.paymentObligation.findMany({
      where: { status: ObligationStatus.PENDIENTE },
    });
    const pendingAmount = pendingObligations.reduce((a, b) => a + Number(b.amount), 0);

    // 6. Tendencia de los últimos 7 días
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayPayments = paymentsMonth.filter((p) => new Date(p.paidAt) >= start && new Date(p.paidAt) <= end);
      const daySanitary = sanitaryMonth.filter((s) => new Date(s.startTime) >= start && new Date(s.startTime) <= end);
      const dayTotal =
        dayPayments.reduce((acc, p) => acc + Number(p.amount), 0) +
        daySanitary.reduce((acc, s) => acc + Number(s.totalCollected || 0), 0);
      const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' });
      last7Days.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        recaudacion: Number(dayTotal.toFixed(2)),
      });
    }

    return {
      today: {
        total: totalToday,
        alcabala: alcabalaToday,
        water: waterToday,
        urinal: urinalToday,
        toilet: toiletToday,
        sanitaryTotal: sanitaryTotalToday,
        operationsCount: paymentsToday.length + sanitaryToday.length,
      },
      month: {
        total: totalMonth,
        paymentsCount: paymentsMonth.length,
      },
      last7Days,
      merchants: {
        total: sociosCount + ambulantesFijosCount + ambulantesTempCount,
        socios: sociosCount,
        ambulantesFijos: ambulantesFijosCount,
        ambulantesTemporales: ambulantesTempCount,
      },
      pending: {
        count: pendingObligations.length,
        totalAmount: pendingAmount,
      },
    };
  }

  async getDailyReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const [payments, sessions, cashRegister] = await Promise.all([
      this.prisma.payment.findMany({
        where: { paidAt: { gte: startOfDay, lte: endOfDay }, isVoided: false },
        include: {
          concept: true,
          merchant: { include: { stall: true, merchantType: true } },
          collectedBy: { select: { fullName: true } },
        },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.sanitaryServiceSession.findMany({
        where: { startTime: { gte: startOfDay, lte: endOfDay } },
        include: { operator: { select: { fullName: true } } },
      }),
      this.prisma.cashRegister.findFirst({
        where: { openedAt: { gte: startOfDay, lte: endOfDay } },
        include: { openedBy: true, closedBy: true, movements: true },
      }),
    ]);

    const alcabalaSum = payments.filter((p) => isAlcabalaConcept(p.concept.code, p.concept.name)).reduce((a, b) => a + Number(b.amount), 0);
    const waterSum = payments.filter((p) => isWaterConcept(p.concept.code, p.concept.name)).reduce((a, b) => a + Number(b.amount), 0);
    const otherPaymentsSum = payments.filter((p) => !isAlcabalaConcept(p.concept.code, p.concept.name) && !isWaterConcept(p.concept.code, p.concept.name)).reduce((a, b) => a + Number(b.amount), 0);
    const urinalSum = sessions.reduce((a, b) => a + Number(b.urinalTotal), 0);
    const toiletSum = sessions.reduce((a, b) => a + Number(b.toiletTotal), 0);
    const sanitarySum = urinalSum + toiletSum;
    const totalCollected = alcabalaSum + waterSum + otherPaymentsSum + sanitarySum;

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalCollected,
      alcabalaSum,
      waterSum,
      urinalSum,
      toiletSum,
      sanitarySum,
      paymentsCount: payments.length,
      sessionsCount: sessions.length,
      payments,
      sessions,
      cashRegister,
    };
  }

  async getMonthlyReport(year: number, month: number) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const obligations = await this.prisma.paymentObligation.findMany({
      where: { period },
      include: {
        merchant: { include: { stall: true, merchantType: true } },
        concept: true,
        payment: true,
      },
    });

    const expectedTotal = obligations.reduce((a, b) => a + Number(b.amount), 0);
    const paidObligations = obligations.filter((o) => o.status === ObligationStatus.PAGADO);
    const collectedFromObligations = paidObligations.reduce((a, b) => a + Number(b.amount), 0);
    const pendingTotal = expectedTotal - collectedFromObligations;
    const collectionRate = expectedTotal > 0 ? (collectedFromObligations / expectedTotal) * 100 : 0;

    const sanitarySessions = await this.prisma.sanitaryServiceSession.findMany({
      where: { startTime: { gte: startOfMonth, lte: endOfMonth } },
    });
    const sanitaryTotal = sanitarySessions.reduce((a, b) => a + Number(b.totalCollected), 0);

    return {
      period,
      year,
      month,
      expectedTotal,
      collectedTotal: collectedFromObligations + sanitaryTotal,
      collectedFromObligations,
      pendingTotal,
      collectionRate: Number(collectionRate.toFixed(2)),
      sanitaryTotal,
      totalMerchantsCount: obligations.length,
      paidMerchantsCount: paidObligations.length,
      defaultersCount: obligations.filter((o) => o.status === ObligationStatus.PENDIENTE).length,
      obligations,
    };
  }

  async getDefaulters() {
    return this.prisma.merchant.findMany({
      where: {
        isDeleted: false,
        obligations: {
          some: { status: ObligationStatus.PENDIENTE },
        },
      },
      include: {
        merchantType: true,
        stall: true,
        sector: true,
        obligations: {
          where: { status: ObligationStatus.PENDIENTE },
          include: { concept: true },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }
}
