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

    // Get active rates for Alcabala and Agua
    const concepts = await this.prisma.paymentConcept.findMany({
      where: { code: { in: ['ALCABALA', 'AGUA'] } },
      include: {
        rates: { where: { isActive: true } },
      },
    });

    const alcabalaConcept = concepts.find((c) => c.code === 'ALCABALA');
    const aguaConcept = concepts.find((c) => c.code === 'AGUA');

    if (!alcabalaConcept || !aguaConcept) {
      throw new BadRequestException('Conceptos de Alcabala o Agua no encontrados en el catálogo');
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const m of merchants) {
      // 1. Alcabala: Aplica mensual para Socios (para ambulantes es diario al momento del cobro o mensual)
      if (m.merchantType.code === MerchantTypeEnum.SOCIO) {
        const alcabalaRate = alcabalaConcept.rates.find((r) => r.merchantTypeId === m.merchantTypeId);
        const amount = alcabalaRate ? alcabalaRate.amount : 10.00;

        const exists = await this.prisma.paymentObligation.findUnique({
          where: {
            merchantId_conceptId_period: {
              merchantId: m.id,
              conceptId: alcabalaConcept.id,
              period,
            },
          },
        });

        if (!exists) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: m.id,
              conceptId: alcabalaConcept.id,
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

      // 2. Agua: Aplica mensual para Socios (S/ 6) y Ambulantes Fijos (S/ 3)
      if (
        m.merchantType.code === MerchantTypeEnum.SOCIO ||
        m.merchantType.code === MerchantTypeEnum.AMBULANTE_FIJO
      ) {
        const aguaRate = aguaConcept.rates.find((r) => r.merchantTypeId === m.merchantTypeId);
        const amount = aguaRate ? aguaRate.amount : (m.merchantType.code === MerchantTypeEnum.SOCIO ? 6.00 : 3.00);

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
}
