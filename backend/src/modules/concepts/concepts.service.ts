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
}
