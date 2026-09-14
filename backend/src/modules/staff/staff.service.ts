import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { CreateStaffPaymentDto } from './dto/create-staff-payment.dto';
import { CashRegisterStatus, CashMovementType } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; role?: string; isActive?: boolean }) {
    const where: any = {};
    if (query?.role) {
      where.role = { contains: query.role, mode: 'insensitive' };
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query?.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { dni: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.staffMember.findMany({
      where,
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });
    if (!staff) throw new NotFoundException('Personal no encontrado');
    return staff;
  }

  async create(dto: CreateStaffDto) {
    const existing = await this.prisma.staffMember.findUnique({
      where: { dni: dto.dni },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un colaborador registrado con el DNI ${dto.dni}`);
    }

    return this.prisma.staffMember.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        dni: dto.dni.trim(),
        phone: dto.phone?.trim(),
        role: dto.role.trim(),
        salary: dto.salary,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        notes: dto.notes?.trim(),
      },
    });
  }

  async update(id: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Personal no encontrado');

    return this.prisma.staffMember.update({
      where: { id },
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        dni: dto.dni.trim(),
        phone: dto.phone?.trim(),
        role: dto.role.trim(),
        salary: dto.salary,
        isActive: dto.isActive !== undefined ? dto.isActive : staff.isActive,
        notes: dto.notes?.trim(),
      },
    });
  }

  async remove(id: string) {
    const staff = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Personal no encontrado');

    return this.prisma.staffMember.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findPayments(query?: { period?: string; staffMemberId?: string }) {
    const where: any = {};
    if (query?.period) where.period = query.period;
    if (query?.staffMemberId) where.staffMemberId = query.staffMemberId;

    return this.prisma.staffPayment.findMany({
      where,
      include: {
        staffMember: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async createPayment(dto: CreateStaffPaymentDto, userId: string) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id: dto.staffMemberId },
    });
    if (!staff) throw new NotFoundException('Personal no encontrado');

    // Check if payment already exists for this staff member and period
    const existing = await this.prisma.staffPayment.findUnique({
      where: {
        staffMemberId_period: {
          staffMemberId: dto.staffMemberId,
          period: dto.period,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`El colaborador ya tiene un pago registrado para el periodo ${dto.period}`);
    }

    let cashMovementId: string | null = null;

    // Optional or default registration in active cash register as EGRESO
    if (dto.registerCashExpense !== false) {
      const activeRegister = await this.prisma.cashRegister.findFirst({
        where: { status: CashRegisterStatus.ABIERTO },
        orderBy: { openedAt: 'desc' },
      });

      if (activeRegister) {
        const movement = await this.prisma.cashMovement.create({
          data: {
            cashRegisterId: activeRegister.id,
            type: CashMovementType.EGRESO,
            concept: `Pago de Sueldo: ${staff.lastName}, ${staff.firstName} (${dto.period})`,
            amount: dto.amount,
            reference: dto.receiptNumber || `PLANILLA-${dto.period}`,
            userId,
          },
        });
        cashMovementId = movement.id;
      }
    }

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    return this.prisma.staffPayment.create({
      data: {
        staffMemberId: dto.staffMemberId,
        period: dto.period,
        amount: dto.amount,
        paymentDate,
        paymentMethod: dto.paymentMethod || 'EFECTIVO',
        receiptNumber: dto.receiptNumber || `VCH-${Date.now().toString().slice(-6)}`,
        status: 'PAGADO',
        notes: dto.notes,
        cashMovementId,
        createdById: userId,
      },
      include: {
        staffMember: true,
      },
    });
  }
}
