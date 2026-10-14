import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Periodicity } from '@prisma/client';

@Injectable()
export class ConceptsService {
  constructor(private prisma: PrismaService) {}

  async findAllConcepts() {
    return this.prisma.paymentConcept.findMany({
      include: {
        rates: {
          where: { isActive: true },
          include: { merchantType: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllRates() {
    return this.prisma.rate.findMany({
      include: {
        concept: true,
        merchantType: true,
      },
      orderBy: [{ concept: { name: 'asc' } }, { startDate: 'desc' }],
    });
  }

  async createConcept(dto: {
    code: string;
    name: string;
    description?: string;
    periodicity?: Periodicity;
  }) {
    const existing = await this.prisma.paymentConcept.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un concepto con el código "${dto.code}"`);
    }

    return this.prisma.paymentConcept.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        periodicity: dto.periodicity || Periodicity.MENSUAL,
        isActive: true,
      },
    });
  }

  async updateConcept(
    id: string,
    dto: { name?: string; description?: string; periodicity?: Periodicity; isActive?: boolean },
  ) {
    const concept = await this.prisma.paymentConcept.findUnique({ where: { id } });
    if (!concept) throw new NotFoundException('Concepto no encontrado');

    return this.prisma.paymentConcept.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.periodicity ? { periodicity: dto.periodicity } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteConcept(id: string) {
    const concept = await this.prisma.paymentConcept.findUnique({ where: { id } });
    if (!concept) throw new NotFoundException('Concepto no encontrado');

    return this.prisma.paymentConcept.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createRate(dto: {
    conceptId: string;
    merchantTypeId?: string;
    amount: number;
    startDate: string;
    endDate?: string;
  }) {
    // Deactivate previous active rate for the same concept and merchantType
    await this.prisma.rate.updateMany({
      where: {
        conceptId: dto.conceptId,
        merchantTypeId: dto.merchantTypeId || null,
        isActive: true,
      },
      data: { isActive: false, endDate: new Date() },
    });

    return this.prisma.rate.create({
      data: {
        conceptId: dto.conceptId,
        merchantTypeId: dto.merchantTypeId || null,
        amount: dto.amount,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: true,
      },
      include: { concept: true, merchantType: true },
    });
  }

  async updateRate(id: string, dto: { amount?: number; isActive?: boolean; endDate?: string }) {
    return this.prisma.rate.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
      },
      include: { concept: true, merchantType: true },
    });
  }

  async deleteRate(id: string) {
    const rate = await this.prisma.rate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Tarifa no encontrada');

    return this.prisma.rate.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    });
  }
}
