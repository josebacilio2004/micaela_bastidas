import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ObligationStatus, MerchantStatus, MerchantTypeEnum } from '@prisma/client';

@Injectable()
export class ObligationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { merchantId?: string; period?: string; status?: ObligationStatus; conceptCode?: string }) {
    const { merchantId, period, status, conceptCode } = query;
    return this.prisma.paymentObligation.findMany({
      where: {
        ...(merchantId ? { merchantId } : {}),
        ...(period ? { period } : {}),
        ...(status ? { status } : {}),
        ...(conceptCode ? { concept: { code: conceptCode } } : {}),
      },
      include: {
        merchant: {
          include: { stall: true, merchantType: true },
        },
        concept: true,
        payment: {
          select: { operationNumber: true, paidAt: true, paymentMethod: true },
        },
      },
      orderBy: [{ period: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async findByMerchant(merchantId: string) {
    return this.prisma.paymentObligation.findMany({
      where: { merchantId },
      include: { concept: true, payment: true },
      orderBy: { dueDate: 'desc' },
    });
  }

  async generateMonthlyObligations(year: number, month: number) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const dueDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}T23:59:59`);

    // Get active merchants
    const merchants = await this.prisma.merchant.findMany({
      where: { isDeleted: false, status: MerchantStatus.ACTIVO },
      include: { merchantType: true },
    });

    // Get active rates for Alcabala, Cuota Mantenimiento y Agua
    const concepts = await this.prisma.paymentConcept.findMany({
      where: { code: { in: ['CUOTA_MANTENIMIENTO', 'CUOTA_AGUA', 'ALCABALA_DIARIA', 'ALCABALA', 'AGUA'] } },
      include: {
        rates: { where: { isActive: true } },
      },
    });

    const cuotaConcept = concepts.find((c) => c.code === 'CUOTA_MANTENIMIENTO' || c.code === 'ALCABALA');
    const aguaConcept = concepts.find((c) => c.code === 'CUOTA_AGUA' || c.code === 'AGUA');

    if (!cuotaConcept || !aguaConcept) {
      throw new BadRequestException('Conceptos de Cuota de Mantenimiento o Agua no encontrados en el catálogo');
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const m of merchants) {
      // 1. Cuota de Mantenimiento Mensual: Aplica para Socios
      if (m.merchantType.code === MerchantTypeEnum.SOCIO) {
        const cuotaRate = cuotaConcept.rates.find((r) => r.merchantTypeId === m.merchantTypeId);
        const amount = cuotaRate ? Number(cuotaRate.amount) : 10.00;

        const exists = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: m.id,
              conceptId: cuotaConcept.id,
              period,
            },
          },
        });

        if (!exists) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: m.id,
              conceptId: cuotaConcept.id,
              period,
              year,
              month,
              dueDate,
              amount,
              status: ObligationStatus.PENDIENTE,
            },
          });
          createdCount++;
        } else {
          skippedCount++;
        }
      }

      // 2. Agua: Aplica mensual para Socios y Ambulantes Fijos (a fin de mes)
      if (
        m.merchantType.code === MerchantTypeEnum.SOCIO ||
        m.merchantType.code === MerchantTypeEnum.AMBULANTE_FIJO
      ) {
        const aguaRate = aguaConcept.rates.find((r) => r.merchantTypeId === m.merchantTypeId);
        const amount = aguaRate
          ? Number(aguaRate.amount)
          : (m.merchantType.code === MerchantTypeEnum.SOCIO ? 6.00 : 3.00);

        const exists = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: m.id,
              conceptId: aguaConcept.id,
              period,
            },
          },
        });

        if (!exists) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: m.id,
              conceptId: aguaConcept.id,
              period,
              year,
              month,
              dueDate,
              amount,
              status: ObligationStatus.PENDIENTE,
            },
          });
          createdCount++;
        } else {
          skippedCount++;
        }
      }
    }

    return {
      period,
      createdCount,
      skippedCount,
      message: `Generación completada para el período ${period}: ${createdCount} obligaciones creadas, ${skippedCount} ya existían.`,
    };
  }

  async getMerchantPendingObligations(merchantId: string, referenceDate: Date = new Date()) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { merchantType: true, stall: true },
    });
    if (!merchant) throw new BadRequestException('Comerciante no encontrado');

    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    const day = referenceDate.getDate();
    const monthPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const dayPeriod = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const monthDueDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}T23:59:59`);
    const dayDueDate = new Date(`${dayPeriod}T23:59:59`);

    // Ensure catalog concepts exist with real codes
    const alcabalaConcept = await this.prisma.paymentConcept.findFirst({
      where: { code: { in: ['ALCABALA_DIARIA', 'ALCABALA'] } },
    });
    const cuotaSocialConcept = await this.prisma.paymentConcept.findFirst({
      where: { code: { in: ['CUOTA_MANTENIMIENTO', 'CUOTA_SOCIAL', 'ALCABALA'] } },
    });
    const aguaConcept = await this.prisma.paymentConcept.findFirst({
      where: { code: { in: ['CUOTA_AGUA', 'AGUA'] } },
    });

    const rates = await this.prisma.rate.findMany({ where: { isActive: true } });
    const getRateAmount = (conceptId: string, merchantTypeId: string, fallback: number) => {
      const specific = rates.find((r) => r.conceptId === conceptId && r.merchantTypeId === merchantTypeId);
      if (specific) return Number(specific.amount);
      const general = rates.find((r) => r.conceptId === conceptId && !r.merchantTypeId);
      if (general) return Number(general.amount);
      return fallback;
    };

    if (
      merchant.merchantType.code === MerchantTypeEnum.AMBULANTE_TEMPORAL ||
      merchant.merchantType.code === MerchantTypeEnum.AMBULANTE_FIJO
    ) {
      // 1. Ensure daily Alcabala exists for today
      if (alcabalaConcept) {
        const existsDaily = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: merchant.id,
              conceptId: alcabalaConcept.id,
              period: dayPeriod,
            },
          },
        });

        if (!existsDaily) {
          const defaultDaily = merchant.merchantType.code === MerchantTypeEnum.AMBULANTE_FIJO ? 3.00 : 4.00;
          const amt = getRateAmount(alcabalaConcept.id, merchant.merchantTypeId, defaultDaily);
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: alcabalaConcept.id,
              period: dayPeriod,
              year,
              month,
              day,
              dueDate: dayDueDate,
              amount: amt,
              status: ObligationStatus.PENDIENTE,
            },
          });
        }
      }

      // 2. If Ambulante Fijo, ensure monthly Agua exists (cobro fin de mes)
      if (merchant.merchantType.code === MerchantTypeEnum.AMBULANTE_FIJO && aguaConcept) {
        const existsAgua = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
            },
          },
        });

        if (!existsAgua) {
          const amt = getRateAmount(aguaConcept.id, merchant.merchantTypeId, 3.00);
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: amt,
              status: ObligationStatus.PENDIENTE,
            },
          });
        }
      }
    } else if (merchant.merchantType.code === MerchantTypeEnum.SOCIO) {
      // 1. Ensure monthly Cuota de Mantenimiento exists for this month (fin de mes)
      if (cuotaSocialConcept) {
        const existsCuota = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: merchant.id,
              conceptId: cuotaSocialConcept.id,
              period: monthPeriod,
            },
          },
        });

        if (!existsCuota) {
          const amt = getRateAmount(cuotaSocialConcept.id, merchant.merchantTypeId, 10.00);
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: cuotaSocialConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: amt,
              status: ObligationStatus.PENDIENTE,
            },
          });
        }
      }

      // 2. Ensure monthly Agua exists for this month (fin de mes)
      if (aguaConcept) {
        const existsAgua = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
            },
          },
        });

        if (!existsAgua) {
          const amt = getRateAmount(aguaConcept.id, merchant.merchantTypeId, 6.00);
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: amt,
              status: ObligationStatus.PENDIENTE,
            },
          });
        }
      }
    }

    // Retrieve all pending obligations for this merchant
    const pending = await this.prisma.paymentObligation.findMany({
      where: {
        merchantId,
        status: ObligationStatus.PENDIENTE,
      },
      include: { concept: true },
      orderBy: { dueDate: 'asc' },
    });

    // Also get obligations paid in current period for confirmation
    const paidRecent = await this.prisma.paymentObligation.findMany({
      where: {
        merchantId,
        status: ObligationStatus.PAGADO,
        OR: [{ period: dayPeriod }, { period: monthPeriod }],
      },
      include: { concept: true, payment: true },
      orderBy: { paidAt: 'desc' },
      take: 5,
    });

    const isSocio = merchant.merchantType.code === MerchantTypeEnum.SOCIO;
    const totalPendingAmount = pending.reduce((acc, o) => acc + Number(o.amount), 0);

    return {
      merchant: {
        id: merchant.id,
        name: `${merchant.lastName}, ${merchant.firstName}`,
        dni: merchant.dni,
        stall: merchant.stall?.code || 'Ambulante',
        typeName: merchant.merchantType.name,
        typeCode: merchant.merchantType.code,
        isSocio,
      },
      isUpToDate: pending.length === 0,
      statusMessage: pending.length === 0
        ? (isSocio
            ? '¡AL DÍA! Cuota social y servicio de agua del mes cancelados.'
            : '¡AL DÍA! Alcabala diaria de hoy cancelada.')
        : `Registra ${pending.length} obligación(es) pendiente(s) por S/ ${totalPendingAmount.toFixed(2)}`,
      pendingObligations: pending.map((p) => ({
        id: p.id,
        conceptId: p.conceptId,
        conceptCode: p.concept.code,
        conceptName: p.concept.name,
        period: p.period,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        status: p.status,
      })),
      recentlyPaid: paidRecent.map((pr) => ({
        id: pr.id,
        conceptName: pr.concept.name,
        period: pr.period,
        amount: Number(pr.amount),
        paidAt: pr.paidAt,
        operationNumber: pr.payment?.operationNumber || 'PAGADO',
      })),
      totalPendingAmount,
    };
  }

  async generateScheduledObligations(targetDate: Date = new Date()) {
    const merchants = await this.prisma.merchant.findMany({
      where: { isDeleted: false, status: MerchantStatus.ACTIVO },
      include: { merchantType: true },
    });

    let count = 0;
    for (const m of merchants) {
      await this.getMerchantPendingObligations(m.id, targetDate);
      count++;
    }

    return {
      message: `Programación automática de cobros ejecutada exitosamente para ${count} comerciantes activos.`,
      merchantsProcessed: count,
      date: targetDate.toISOString(),
    };
  }
}
