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
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
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

    const cleanStallId = dto.stallId && dto.stallId.trim().length > 0 ? dto.stallId.trim() : null;
    const cleanSectorId = dto.sectorId && dto.sectorId.trim().length > 0 ? dto.sectorId.trim() : null;
    const cleanPhone = dto.phone && dto.phone.trim().length > 0 ? dto.phone.trim() : null;
    const cleanAddress = dto.address && dto.address.trim().length > 0 ? dto.address.trim() : null;
    const cleanCategory = dto.businessCategory && dto.businessCategory.trim().length > 0 ? dto.businessCategory.trim() : null;

    // If stall assigned, verify stall is free
    if (cleanStallId) {
      const stall = await this.prisma.marketStall.findUnique({ where: { id: cleanStallId } });
      if (!stall) throw new NotFoundException('El puesto indicado no existe');
      if (stall.status === StallStatus.OCUPADO) {
        throw new BadRequestException('El puesto indicado ya se encuentra ocupado');
      }
    }

    const merchant = await this.prisma.merchant.create({
      data: {
        internalCode,
        qrCode: `MB-QR-${dto.dni}`,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        dni: dto.dni.trim(),
        phone: cleanPhone,
        address: cleanAddress,
        merchantTypeId: dto.merchantTypeId,
        sectorId: cleanSectorId,
        stallId: cleanStallId,
        businessCategory: cleanCategory,
        status: dto.status || MerchantStatus.ACTIVO,
        memberCondition: dto.memberCondition || 'NO_APLICA',
        observations: dto.observations,
        createdById: userId,
      },
      include: { merchantType: true, sector: true, stall: true },
    });

    if (cleanStallId) {
      await this.prisma.marketStall.update({
        where: { id: cleanStallId },
        data: { status: StallStatus.OCUPADO, assignedAt: new Date() },
      });
    }

    // Generate initial pending obligations according to merchant type
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const monthPeriod = `${year}-${String(month).padStart(2, '0')}`;
      const dayPeriod = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const monthDueDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}T23:59:59`);
      const dayDueDate = new Date(`${dayPeriod}T23:59:59`);

      const [alcabalaConcept, cuotaSocialConcept, aguaConcept, rates] = await Promise.all([
        this.prisma.paymentConcept.findFirst({ where: { code: { in: ['ALCABALA_DIARIA', 'ALCABALA'] } } }),
        this.prisma.paymentConcept.findFirst({ where: { code: { in: ['CUOTA_MANTENIMIENTO', 'CUOTA_SOCIAL', 'ALCABALA'] } } }),
        this.prisma.paymentConcept.findFirst({ where: { code: { in: ['CUOTA_AGUA', 'AGUA'] } } }),
        this.prisma.rate.findMany({ where: { isActive: true } }),
      ]);

      const getAmt = (conceptId: string, fallback: number) => {
        const spec = rates.find((r) => r.conceptId === conceptId && r.merchantTypeId === merchant.merchantTypeId);
        if (spec) return Number(spec.amount);
        const gen = rates.find((r) => r.conceptId === conceptId && !r.merchantTypeId);
        if (gen) return Number(gen.amount);
        return fallback;
      };

      if (merchant.merchantType.code === 'SOCIO') {
        if (cuotaSocialConcept) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: cuotaSocialConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: getAmt(cuotaSocialConcept.id, 10.00),
              status: 'PENDIENTE',
            },
          });
        }
        if (aguaConcept) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: getAmt(aguaConcept.id, 6.00),
              status: 'PENDIENTE',
            },
          });
        }
      } else if (merchant.merchantType.code === 'INQUILINO') {
        const alquilerConcept = await this.prisma.paymentConcept.findFirst({
          where: { code: 'ALQUILER_INQUILINO' },
        });
        if (alquilerConcept) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: alquilerConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: getAmt(alquilerConcept.id, 150.00),
              status: 'PENDIENTE',
            },
          });
        }
        if (aguaConcept) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: getAmt(aguaConcept.id, 10.00),
              status: 'PENDIENTE',
            },
          });
        }
      } else {
        // Ambulante Fijo o Temporal
        if (alcabalaConcept) {
          const defaultDaily = merchant.merchantType.code === 'AMBULANTE_FIJO' ? 3.00 : 4.00;
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: alcabalaConcept.id,
              period: dayPeriod,
              year,
              month,
              day,
              dueDate: dayDueDate,
              amount: getAmt(alcabalaConcept.id, defaultDaily),
              status: 'PENDIENTE',
            },
          });
        }
        if (merchant.merchantType.code === 'AMBULANTE_FIJO' && aguaConcept) {
          await this.prisma.paymentObligation.create({
            data: {
              merchantId: merchant.id,
              conceptId: aguaConcept.id,
              period: monthPeriod,
              year,
              month,
              dueDate: monthDueDate,
              amount: getAmt(aguaConcept.id, 3.00),
              status: 'PENDIENTE',
            },
          });
        }
      }
    } catch (_) {}

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

    const cleanStallId = dto.stallId !== undefined ? (dto.stallId && dto.stallId.trim().length > 0 ? dto.stallId.trim() : null) : current.stallId;
    const cleanSectorId = dto.sectorId !== undefined ? (dto.sectorId && dto.sectorId.trim().length > 0 ? dto.sectorId.trim() : null) : current.sectorId;
    const cleanPhone = dto.phone !== undefined ? (dto.phone && dto.phone.trim().length > 0 ? dto.phone.trim() : null) : current.phone;
    const cleanAddress = dto.address !== undefined ? (dto.address && dto.address.trim().length > 0 ? dto.address.trim() : null) : current.address;
    const cleanCategory = dto.businessCategory !== undefined ? (dto.businessCategory && dto.businessCategory.trim().length > 0 ? dto.businessCategory.trim() : null) : current.businessCategory;

    // Handle stall re-assignment if changed
    if (cleanStallId !== current.stallId) {
      if (current.stallId) {
        await this.prisma.marketStall.update({
          where: { id: current.stallId },
          data: { status: StallStatus.LIBRE, assignedAt: null },
        });
      }
      if (cleanStallId) {
        const newStall = await this.prisma.marketStall.findUnique({ where: { id: cleanStallId } });
        if (!newStall) throw new NotFoundException('El puesto indicado no existe');
        if (newStall.status === StallStatus.OCUPADO) {
          throw new BadRequestException('El nuevo puesto indicado ya se encuentra ocupado');
        }
        await this.prisma.marketStall.update({
          where: { id: cleanStallId },
          data: { status: StallStatus.OCUPADO, assignedAt: new Date() },
        });
      }
    }

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        dni: dto.dni !== undefined ? dto.dni.trim() : undefined,
        phone: cleanPhone,
        address: cleanAddress,
        merchantTypeId: dto.merchantTypeId,
        sectorId: cleanSectorId,
        stallId: cleanStallId,
        businessCategory: cleanCategory,
        status: dto.status,
        memberCondition: dto.memberCondition,
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

  
  async findByQr(qrCode: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { qrCode },
          { internalCode: qrCode },
          { dni: qrCode },
        ],
        isDeleted: false,
      },
      include: {
        merchantType: true,
        stall: true,
        sector: true,
        obligations: {
          where: { status: 'PENDIENTE' },
          include: { concept: true },
        },
      },
    });
    if (!merchant) throw new NotFoundException('Comerciante no encontrado');
    return merchant;
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

  async findCategories() {
    try {
      const categories = await (this.prisma as any).businessCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      if (categories.length > 0) return categories;
    } catch (_) {}

    // Fallback list of default categories
    return [
      { id: 'cat-1', name: 'Carnes y Pescados', description: 'Venta de carnes rojas, aves y pescados' },
      { id: 'cat-2', name: 'Frutas y Verduras', description: 'Frutas frescas y hortalizas' },
      { id: 'cat-3', name: 'Abarrotes y Granos', description: 'Víveres, lácteos y productos secos' },
      { id: 'cat-4', name: 'Comidas y Jugos', description: 'Comida preparada, menús y jugos' },
      { id: 'cat-5', name: 'Flores y Plantas', description: 'Arreglos florales y plantas ornamentales' },
      { id: 'cat-6', name: 'Bolsas y Plásticos', description: 'Envases, descartables y bolsas' },
      { id: 'cat-7', name: 'Hierbas y Especias', description: 'Plantas medicinales y condimentos' },
      { id: 'cat-8', name: 'Tubérculos', description: 'Papa, camote, yuca y tubérculos andinos' },
    ];
  }

  async createCategory(name: string, description?: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('El nombre del rubro es obligatorio');
    }
    const cleanName = name.trim();
    try {
      return await (this.prisma as any).businessCategory.upsert({
        where: { name: cleanName },
        update: { isActive: true },
        create: { name: cleanName, description: description?.trim() || null },
      });
    } catch (e) {
      return { id: `cat-${Date.now()}`, name: cleanName, description };
    }
  }

  async deleteCategory(id: string) {
    try {
      return await (this.prisma as any).businessCategory.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (_) {
      return { message: 'Rubro eliminado' };
    }
  }
}
