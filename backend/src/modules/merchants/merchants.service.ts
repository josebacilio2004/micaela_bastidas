import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { formatMerchantCode } from '../../common/utils/code-generator.util';
import { StallStatus, MerchantStatus, AuditAction } from '@prisma/client';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { search?: string; typeId?: string; status?: MerchantStatus; sectorId?: string }) {
    const { search, typeId, status, sectorId } = query;
    return this.prisma.merchant.findMany({
      where: {
        isDeleted: false,
        ...(status ? { status } : {}),
        ...(typeId ? { merchantTypeId: typeId } : {}),
        ...(sectorId ? { sectorId } : {}),
        ...(search
          ? {
              OR: [
                { dni: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { stall: { code: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        merchantType: true,
        sector: true,
        stall: true,
        _count: {
          select: { obligations: { where: { status: 'PENDIENTE' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTypes() {
    return this.prisma.merchantType.findMany({ orderBy: { code: 'asc' } });
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id, isDeleted: false },
      include: {
        merchantType: true,
        sector: true,
        stall: true,
        obligations: {
          orderBy: { dueDate: 'desc' },
          include: { concept: true, payment: true },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 20,
          include: { concept: true, collectedBy: { select: { fullName: true } } },
        },
      },
    });
    if (!merchant) throw new NotFoundException('Comerciante no encontrado');
    return merchant;
  }

  async create(dto: CreateMerchantDto, userId?: string) {
    const existsDni = await this.prisma.merchant.findUnique({ where: { dni: dto.dni } });
    if (existsDni) throw new ConflictException('Ya existe un comerciante registrado con este DNI');

    // Auto generate sequential internal code
    const count = await this.prisma.merchant.count();
    const internalCode = formatMerchantCode(count + 1);

    // If stall assigned, verify stall is free
    if (dto.stallId) {
      const stall = await this.prisma.marketStall.findUnique({ where: { id: dto.stallId } });
      if (!stall) throw new NotFoundException('El puesto indicado no existe');
      if (stall.status === StallStatus.OCUPADO) {
        throw new BadRequestException('El puesto indicado ya se encuentra ocupado');
      }
    }

    const merchant = await this.prisma.merchant.create({
      data: {
        internalCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dni: dto.dni,
        phone: dto.phone,
        address: dto.address,
        merchantTypeId: dto.merchantTypeId,
        sectorId: dto.sectorId,
        stallId: dto.stallId,
        businessCategory: dto.businessCategory,
        status: dto.status || MerchantStatus.ACTIVO,
        observations: dto.observations,
        createdById: userId,
      },
      include: { merchantType: true, sector: true, stall: true },
    });

    if (dto.stallId) {
      await this.prisma.marketStall.update({
        where: { id: dto.stallId },
        data: { status: StallStatus.OCUPADO, assignedAt: new Date() },
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        module: 'MERCHANTS',
        entityName: 'Merchant',
        entityId: merchant.id,
        newValues: { internalCode, dni: dto.dni, fullName: `${dto.firstName} ${dto.lastName}` },
      },
    });

    return merchant;
  }

  async update(id: string, dto: UpdateMerchantDto, userId?: string) {
    const current = await this.findOne(id);

    if (dto.dni && dto.dni !== current.dni) {
      const exists = await this.prisma.merchant.findUnique({ where: { dni: dto.dni } });
      if (exists) throw new ConflictException('Ya existe un comerciante registrado con este DNI');
    }

    // Handle stall re-assignment if changed
    if (dto.stallId !== undefined && dto.stallId !== current.stallId) {
      if (current.stallId) {
        await this.prisma.marketStall.update({
          where: { id: current.stallId },
          data: { status: StallStatus.LIBRE, assignedAt: null },
        });
      }
      if (dto.stallId) {
        const newStall = await this.prisma.marketStall.findUnique({ where: { id: dto.stallId } });
        if (!newStall) throw new NotFoundException('El puesto indicado no existe');
        if (newStall.status === StallStatus.OCUPADO) {
          throw new BadRequestException('El nuevo puesto indicado ya se encuentra ocupado');
        }
        await this.prisma.marketStall.update({
          where: { id: dto.stallId },
          data: { status: StallStatus.OCUPADO, assignedAt: new Date() },
        });
      }
    }

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dni: dto.dni,
        phone: dto.phone,
        address: dto.address,
        merchantTypeId: dto.merchantTypeId,
        sectorId: dto.sectorId,
        stallId: dto.stallId,
        businessCategory: dto.businessCategory,
        status: dto.status,
        observations: dto.observations,
        updatedById: userId,
      },
      include: { merchantType: true, sector: true, stall: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        module: 'MERCHANTS',
        entityName: 'Merchant',
        entityId: id,
        previousValues: { dni: current.dni, status: current.status },
        newValues: { dni: updated.dni, status: updated.status },
      },
    });

    return updated;
  }

  async softDelete(id: string, userId?: string) {
    const merchant = await this.findOne(id);

    // Free stall if assigned
    if (merchant.stallId) {
      await this.prisma.marketStall.update({
        where: { id: merchant.stallId },
        data: { status: StallStatus.LIBRE, assignedAt: null },
      });
    }

    const deleted = await this.prisma.merchant.update({
      where: { id },
      data: { isDeleted: true, status: MerchantStatus.INACTIVO, stallId: null },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        module: 'MERCHANTS',
        entityName: 'Merchant',
        entityId: id,
        previousValues: { dni: merchant.dni, code: merchant.internalCode },
      },
    });

    return { message: 'Comerciante desactivado del padrón correctamente', id: deleted.id };
  }
}
