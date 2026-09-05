import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StallStatus } from '@prisma/client';

@Injectable()
export class StallsService {
  constructor(private prisma: PrismaService) {}

  async findAllSectors() {
    return this.prisma.sector.findMany({
      include: {
        _count: {
          select: { stalls: true, merchants: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findAllStalls(sectorId?: string, status?: StallStatus) {
    return this.prisma.marketStall.findMany({
      where: {
        ...(sectorId ? { sectorId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        sector: true,
        assignedMerchant: {
          select: {
            id: true,
            internalCode: true,
            firstName: true,
            lastName: true,
            dni: true,
            merchantType: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createStall(dto: { code: string; sectorId: string; locationDescription?: string }) {
    const exists = await this.prisma.marketStall.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('El puesto con este código ya existe');

    return this.prisma.marketStall.create({
      data: {
        code: dto.code,
        sectorId: dto.sectorId,
        locationDescription: dto.locationDescription,
        status: StallStatus.LIBRE,
      },
      include: { sector: true },
    });
  }

  async updateStall(id: string, dto: { locationDescription?: string; status?: StallStatus; observations?: string }) {
    return this.prisma.marketStall.update({
      where: { id },
      data: dto,
      include: { sector: true, assignedMerchant: true },
    });
  }
}
