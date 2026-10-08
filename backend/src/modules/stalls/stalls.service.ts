import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StallStatus } from '@prisma/client';

export interface CreateStallDto {
  code: string;
  sectorId: string;
  giro?: string;
  stallNumber?: number;
  locationDescription?: string;
  status?: StallStatus;
  observations?: string;
  merchantId?: string;
}

export interface UpdateStallDto {
  code?: string;
  sectorId?: string;
  giro?: string;
  stallNumber?: number;
  locationDescription?: string;
  status?: StallStatus;
  observations?: string;
  merchantId?: string | null;
}

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

  async findAllGiros() {
    // Extraer giros únicos de puestos y sectores
    const [stallGiros, sectors] = await Promise.all([
      this.prisma.marketStall.groupBy({
        by: ['giro'],
        _count: { id: true },
        where: { giro: { not: null } },
      }),
      this.prisma.sector.findMany({ select: { id: true, name: true, code: true } }),
    ]);

    const girosMap = new Map<string, { giro: string; totalStalls: number; occupiedCount: number; freeCount: number }>();

    // Inicializar con giros estándar del mercado
    const standardGiros = [
      'Carnes y Pescados',
      'Frutas y Verduras',
      'Abarrotes y Granos',
      'Comidas y Jugos',
      'Zona Ambulatoria Externa',
    ];

    for (const g of standardGiros) {
      girosMap.set(g, { giro: g, totalStalls: 0, occupiedCount: 0, freeCount: 0 });
    }

    // Agregar giros existentes
    for (const item of stallGiros) {
      if (item.giro && !girosMap.has(item.giro)) {
        girosMap.set(item.giro, { giro: item.giro, totalStalls: 0, occupiedCount: 0, freeCount: 0 });
      }
    }

    // Calcular estadísticas
    const allStalls = await this.prisma.marketStall.findMany({
      select: { id: true, giro: true, status: true, sector: { select: { name: true } } },
    });

    for (const st of allStalls) {
      const gName = st.giro || st.sector?.name || 'General';
      if (!girosMap.has(gName)) {
        girosMap.set(gName, { giro: gName, totalStalls: 0, occupiedCount: 0, freeCount: 0 });
      }
      const entry = girosMap.get(gName)!;
      entry.totalStalls += 1;
      if (st.status === StallStatus.OCUPADO) {
        entry.occupiedCount += 1;
      } else if (st.status === StallStatus.LIBRE) {
        entry.freeCount += 1;
      }
    }

    return Array.from(girosMap.values());
  }

  async findAllStalls(params?: { sectorId?: string; status?: StallStatus; giro?: string; search?: string }) {
    const { sectorId, status, giro, search } = params || {};

    const where: any = {};
    if (sectorId) where.sectorId = sectorId;
    if (status) where.status = status;
    if (giro && giro.trim() !== '') {
      where.OR = [
        { giro: { equals: giro, mode: 'insensitive' } },
        { sector: { name: { contains: giro, mode: 'insensitive' } } },
      ];
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      const searchConditions = [
        { code: { contains: q, mode: 'insensitive' } },
        { locationDescription: { contains: q, mode: 'insensitive' } },
        { observations: { contains: q, mode: 'insensitive' } },
        { assignedMerchant: { firstName: { contains: q, mode: 'insensitive' } } },
        { assignedMerchant: { lastName: { contains: q, mode: 'insensitive' } } },
        { assignedMerchant: { dni: { contains: q, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    return this.prisma.marketStall.findMany({
      where,
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
            photoUrl: true,
            qrCode: true,
            businessCategory: true,
          },
        },
      },
      orderBy: [
        { giro: 'asc' },
        { stallNumber: 'asc' },
        { code: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const stall = await this.prisma.marketStall.findUnique({
      where: { id },
      include: {
        sector: true,
        assignedMerchant: true,
        rentals: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!stall) throw new NotFoundException('Puesto no encontrado');
    return stall;
  }

  async createStall(dto: CreateStallDto) {
    const exists = await this.prisma.marketStall.findUnique({ where: { code: dto.code.trim().toUpperCase() } });
    if (exists) throw new ConflictException(`El puesto con el código "${dto.code}" ya existe`);

    const sector = await this.prisma.sector.findUnique({ where: { id: dto.sectorId } });
    if (!sector) throw new NotFoundException('Sector no encontrado');

    const assignedGiro = dto.giro?.trim() || sector.name;

    let numberInGiro = dto.stallNumber;
    if (numberInGiro === undefined || numberInGiro === null) {
      const lastStall = await this.prisma.marketStall.findFirst({
        where: { giro: assignedGiro },
        orderBy: { stallNumber: 'desc' },
      });
      numberInGiro = (lastStall?.stallNumber || 0) + 1;
    }

    const stall = await this.prisma.marketStall.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        sectorId: dto.sectorId,
        giro: assignedGiro,
        stallNumber: Number(numberInGiro),
        locationDescription: dto.locationDescription?.trim(),
        status: dto.merchantId ? StallStatus.OCUPADO : (dto.status || StallStatus.LIBRE),
        observations: dto.observations?.trim(),
        assignedAt: dto.merchantId ? new Date() : null,
      },
      include: { sector: true, assignedMerchant: true },
    });

    if (dto.merchantId) {
      await this.prisma.merchant.update({
        where: { id: dto.merchantId },
        data: { stallId: stall.id },
      });
    }

    return this.findOne(stall.id);
  }

  async updateStall(id: string, dto: UpdateStallDto) {
    const stall = await this.prisma.marketStall.findUnique({
      where: { id },
      include: { assignedMerchant: true, sector: true },
    });
    if (!stall) throw new NotFoundException('Puesto no encontrado');

    if (dto.code && dto.code.trim().toUpperCase() !== stall.code) {
      const existingWithCode = await this.prisma.marketStall.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (existingWithCode && existingWithCode.id !== id) {
        throw new ConflictException(`Ya existe otro puesto con el código "${dto.code}"`);
      }
    }

    if (dto.merchantId !== undefined) {
      if (dto.merchantId === null || dto.merchantId === '') {
        await this.prisma.merchant.updateMany({
          where: { stallId: id },
          data: { stallId: null },
        });
        if (!dto.status) {
          dto.status = StallStatus.LIBRE;
        }
      } else {
        await this.prisma.merchant.updateMany({
          where: { stallId: id, id: { not: dto.merchantId } },
          data: { stallId: null },
        });
        await this.prisma.merchant.update({
          where: { id: dto.merchantId },
          data: { stallId: id },
        });
        dto.status = StallStatus.OCUPADO;
      }
    }

    const updatedData: any = {};
    if (dto.code) updatedData.code = dto.code.trim().toUpperCase();
    if (dto.sectorId) updatedData.sectorId = dto.sectorId;
    if (dto.giro !== undefined) updatedData.giro = dto.giro?.trim() || null;
    if (dto.stallNumber !== undefined) updatedData.stallNumber = Number(dto.stallNumber);
    if (dto.locationDescription !== undefined) updatedData.locationDescription = dto.locationDescription?.trim() || null;
    if (dto.status) updatedData.status = dto.status;
    if (dto.observations !== undefined) updatedData.observations = dto.observations?.trim() || null;
    if (dto.merchantId) {
      updatedData.assignedAt = new Date();
    } else if (dto.merchantId === null || dto.merchantId === '') {
      updatedData.assignedAt = null;
    }

    await this.prisma.marketStall.update({
      where: { id },
      data: updatedData,
    });

    return this.findOne(id);
  }

  async deleteStall(id: string) {
    const stall = await this.prisma.marketStall.findUnique({
      where: { id },
      include: { rentals: true },
    });
    if (!stall) throw new NotFoundException('Puesto no encontrado');

    if (stall.rentals && stall.rentals.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el puesto ${stall.code} porque cuenta con ${stall.rentals.length} contrato(s) de alquiler registrado(s).`,
      );
    }

    await this.prisma.merchant.updateMany({
      where: { stallId: id },
      data: { stallId: null },
    });

    await this.prisma.marketStall.delete({ where: { id } });

    return {
      success: true,
      message: `Puesto ${stall.code} eliminado correctamente.`,
    };
  }

  /**
   * Reorganizar y renumerar automáticamente todos los puestos agrupados por Giro
   * Para que cada giro empiece correlativamente en el orden 1, 2, 3...
   */
  async reorderStallsByGiro(targetGiro?: string) {
    const stalls = await this.prisma.marketStall.findMany({
      include: { sector: true, assignedMerchant: true },
      orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
    });

    const giroGroups = new Map<string, typeof stalls>();

    for (const st of stalls) {
      const gName = st.giro || st.sector?.name || 'General';
      if (targetGiro && gName !== targetGiro) continue;

      if (!giroGroups.has(gName)) {
        giroGroups.set(gName, []);
      }
      giroGroups.get(gName)!.push(st);
    }

    let updatedCount = 0;

    for (const [gName, group] of giroGroups.entries()) {
      group.sort((a, b) => {
        if (a.stallNumber && b.stallNumber) return a.stallNumber - b.stallNumber;
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      });

      let counter = 1;
      for (const st of group) {
        await this.prisma.marketStall.update({
          where: { id: st.id },
          data: {
            giro: gName,
            stallNumber: counter,
          },
        });
        counter++;
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Se renumeraron ${updatedCount} puestos ordenados correlativamente por cada giro.`,
      girosProcessed: Array.from(giroGroups.keys()),
    };
  }
}
