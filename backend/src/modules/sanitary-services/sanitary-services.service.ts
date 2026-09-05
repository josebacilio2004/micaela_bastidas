import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SessionStatus, TicketStatus, CashRegisterStatus, AuditAction } from '@prisma/client';

@Injectable()
export class SanitaryServicesService {
  constructor(private prisma: PrismaService) {}

  async findActive(operatorId?: string) {
    return this.prisma.sanitaryServiceSession.findFirst({
      where: {
        status: SessionStatus.ABIERTO,
        ...(operatorId ? { operatorId } : {}),
      },
      include: {
        operator: { select: { fullName: true, username: true } },
        tickets: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getHistory() {
    return this.prisma.sanitaryServiceSession.findMany({
      include: {
        operator: { select: { fullName: true } },
        tickets: true,
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });
  }

  async startSession(dto: { notes?: string }, userId: string) {
    const active = await this.prisma.sanitaryServiceSession.findFirst({
      where: { operatorId: userId, status: SessionStatus.ABIERTO },
    });
    if (active) {
      return active;
    }

    // Associate with active cash register if any
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
    });

    return this.prisma.sanitaryServiceSession.create({
      data: {
        operatorId: userId,
        cashRegisterId: activeRegister?.id || null,
        startTime: new Date(),
        urinalCount: 0,
        urinalPrice: 0.50,
        urinalTotal: 0.00,
        toiletCount: 0,
        toiletPrice: 1.00,
        toiletTotal: 0.00,
        totalCollected: 0.00,
        status: SessionStatus.ABIERTO,
        notes: dto.notes,
      },
      include: { operator: { select: { fullName: true } } },
    });
  }

  async updateCounts(id: string, dto: { urinalDelta?: number; toiletDelta?: number; exactUrinals?: number; exactToilets?: number }) {
    const session = await this.prisma.sanitaryServiceSession.findUnique({ where: { id } });
    if (!session || session.status !== SessionStatus.ABIERTO) {
      throw new BadRequestException('Sesión de servicios no activa');
    }

    const urinalPrice = Number(session.urinalPrice);
    const toiletPrice = Number(session.toiletPrice);

    let urinalCount = session.urinalCount;
    let toiletCount = session.toiletCount;

    if (dto.exactUrinals !== undefined) urinalCount = dto.exactUrinals;
    else if (dto.urinalDelta !== undefined) urinalCount = Math.max(0, urinalCount + dto.urinalDelta);

    if (dto.exactToilets !== undefined) toiletCount = dto.exactToilets;
    else if (dto.toiletDelta !== undefined) toiletCount = Math.max(0, toiletCount + dto.toiletDelta);

    const urinalTotal = urinalCount * urinalPrice;
    const toiletTotal = toiletCount * toiletPrice;
    const totalCollected = urinalTotal + toiletTotal;

    return this.prisma.sanitaryServiceSession.update({
      where: { id },
      data: {
        urinalCount,
        urinalTotal,
        toiletCount,
        toiletTotal,
        totalCollected,
      },
    });
  }

  async closeSession(
    id: string,
    dto: {
      initialTicketNumber?: number;
      finalTicketNumber?: number;
      declaredTicketCount?: number;
      discrepancyReason?: string;
      notes?: string;
    },
    userId: string,
  ) {
    const session = await this.prisma.sanitaryServiceSession.findUnique({ where: { id } });
    if (!session || session.status !== SessionStatus.ABIERTO) {
      throw new BadRequestException('La sesión no está activa');
    }

    let calculatedTicketCount: number | null = null;
    let ticketDiscrepancy = 0;

    if (dto.initialTicketNumber !== undefined && dto.finalTicketNumber !== undefined) {
      if (dto.finalTicketNumber >= dto.initialTicketNumber) {
        calculatedTicketCount = dto.finalTicketNumber - dto.initialTicketNumber + 1;
      }
    }

    if (calculatedTicketCount !== null && dto.declaredTicketCount !== undefined) {
      ticketDiscrepancy = dto.declaredTicketCount - calculatedTicketCount;
    }

    if (ticketDiscrepancy !== 0 && !dto.discrepancyReason) {
      throw new BadRequestException(
        `Existe una discrepancia de tickets (${ticketDiscrepancy} tickets de diferencia). Debe ingresar el motivo de la diferencia obligatoriamente.`,
      );
    }

    const closed = await this.prisma.sanitaryServiceSession.update({
      where: { id },
      data: {
        status: SessionStatus.CERRADO,
        endTime: new Date(),
        initialTicketNumber: dto.initialTicketNumber,
        finalTicketNumber: dto.finalTicketNumber,
        declaredTicketCount: dto.declaredTicketCount,
        calculatedTicketCount,
        ticketDiscrepancy,
        discrepancyReason: dto.discrepancyReason,
        notes: dto.notes,
      },
    });

    if (calculatedTicketCount && calculatedTicketCount > 0) {
      await this.prisma.ticket.create({
        data: {
          sessionId: id,
          startNumber: dto.initialTicketNumber!,
          endNumber: dto.finalTicketNumber!,
          totalIssued: calculatedTicketCount,
          unitPrice: 1.00,
          totalAmount: Number(session.totalCollected),
          status: ticketDiscrepancy !== 0 ? TicketStatus.DISCREPANCIA : TicketStatus.VERIFICADO,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CLOSE,
        module: 'SANITARY_SERVICES',
        entityName: 'SanitaryServiceSession',
        entityId: id,
        newValues: {
          totalCollected: session.totalCollected,
          ticketDiscrepancy,
        },
      },
    });

    return closed;
  }
}
