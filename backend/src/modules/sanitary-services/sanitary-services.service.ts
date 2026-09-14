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

  async getDailyReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.sanitaryServiceSession.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        operator: { select: { fullName: true, username: true } },
        tickets: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const totalUrinals = sessions.reduce((sum, s) => sum + s.urinalCount, 0);
    const totalUrinalsAmount = sessions.reduce((sum, s) => sum + Number(s.urinalTotal), 0);
    const totalToilets = sessions.reduce((sum, s) => sum + s.toiletCount, 0);
    const totalToiletsAmount = sessions.reduce((sum, s) => sum + Number(s.toiletTotal), 0);
    const totalCollected = sessions.reduce((sum, s) => sum + Number(s.totalCollected), 0);
    const totalDiscrepancy = sessions.reduce((sum, s) => sum + (s.ticketDiscrepancy || 0), 0);

    const validInitTickets = sessions.map((s) => s.initialTicketNumber).filter((n): n is number => typeof n === 'number' && n > 0);
    const validFinalTickets = sessions.map((s) => s.finalTicketNumber).filter((n): n is number => typeof n === 'number' && n > 0);

    const minTicket = validInitTickets.length > 0 ? Math.min(...validInitTickets) : null;
    const maxTicket = validFinalTickets.length > 0 ? Math.max(...validFinalTickets) : null;

    return {
      date: startOfDay.toISOString().split('T')[0],
      sessionsCount: sessions.length,
      sessions,
      summary: {
        totalUrinals,
        totalUrinalsAmount,
        totalToilets,
        totalToiletsAmount,
        totalCollected,
        totalDiscrepancy,
        minTicket,
        maxTicket,
        ticketRange: minTicket && maxTicket ? `${minTicket} al ${maxTicket}` : 'Sin boletos registrados',
      },
    };
  }

  async startSession(dto: { notes?: string; operatorId?: string; date?: string }, userId: string) {
    const active = await this.prisma.sanitaryServiceSession.findFirst({
      where: { status: SessionStatus.ABIERTO },
      include: { operator: { select: { fullName: true, username: true } } },
    });
    if (active) {
      return active;
    }

    const assignedOperatorId = dto.operatorId || userId;
    const sessionDate = dto.date ? new Date(`${dto.date}T08:00:00`) : new Date();

    // Associate with active cash register if any
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
    });

    const dateFormatted = sessionDate.toLocaleDateString('es-PE');
    const noteText = dto.notes || `Servicios Higiénicos del Día - ${dateFormatted}`;

    return this.prisma.sanitaryServiceSession.create({
      data: {
        operatorId: assignedOperatorId,
        cashRegisterId: activeRegister?.id || null,
        startTime: sessionDate,
        urinalCount: 0,
        urinalPrice: 0.50,
        urinalTotal: 0.00,
        toiletCount: 0,
        toiletPrice: 0.50,
        toiletTotal: 0.00,
        totalCollected: 0.00,
        status: SessionStatus.ABIERTO,
        notes: noteText,
      },
      include: { operator: { select: { fullName: true, username: true } } },
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
      urinalCount?: number;
      toiletCount?: number;
      discrepancyReason?: string;
      notes?: string;
    },
    userId: string,
  ) {
    let session: any;
    if (id === 'active' || id === 'current' || id.startsWith('offline')) {
      session = await this.prisma.sanitaryServiceSession.findFirst({
        where: { status: SessionStatus.ABIERTO },
        orderBy: { startTime: 'desc' },
      });
    } else {
      session = await this.prisma.sanitaryServiceSession.findUnique({ where: { id } });
    }

    if (!session) {
      session = await this.prisma.sanitaryServiceSession.findFirst({
        where: { status: SessionStatus.ABIERTO },
        orderBy: { startTime: 'desc' },
      });
      if (!session) {
        throw new BadRequestException('No existe ninguna sesión de servicios higiénicos abierta para cerrar.');
      }
    }

    if (session.status === SessionStatus.CERRADO) {
      return session; // Idempotencia si ya fue cerrada
    }

    const sessionId = session.id;

    let urinalCount = session.urinalCount;
    let toiletCount = session.toiletCount;
    if (dto.urinalCount !== undefined) urinalCount = dto.urinalCount;
    if (dto.toiletCount !== undefined) toiletCount = dto.toiletCount;

    const urinalPrice = Number(session.urinalPrice) || 0.50;
    const toiletPrice = Number(session.toiletPrice) || 1.00;
    const urinalTotal = urinalCount * urinalPrice;
    const toiletTotal = toiletCount * toiletPrice;
    const totalCollected = urinalTotal + toiletTotal;

    let calculatedTicketCount: number | null = null;
    let ticketDiscrepancy = 0;

    if (dto.initialTicketNumber !== undefined && dto.finalTicketNumber !== undefined) {
      if (dto.finalTicketNumber >= dto.initialTicketNumber) {
        calculatedTicketCount = dto.finalTicketNumber - dto.initialTicketNumber + 1;
      }
    }

    const declared = dto.declaredTicketCount ?? (urinalCount + toiletCount);

    if (calculatedTicketCount !== null && declared !== undefined) {
      ticketDiscrepancy = declared - calculatedTicketCount;
    }

    if (ticketDiscrepancy !== 0 && !dto.discrepancyReason) {
      throw new BadRequestException(
        `Existe una discrepancia de tickets (${ticketDiscrepancy} tickets de diferencia). Debe ingresar el motivo de la diferencia obligatoriamente.`,
      );
    }

    const closed = await this.prisma.sanitaryServiceSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CERRADO,
        endTime: new Date(),
        urinalCount,
        urinalTotal,
        toiletCount,
        toiletTotal,
        totalCollected,
        initialTicketNumber: dto.initialTicketNumber,
        finalTicketNumber: dto.finalTicketNumber,
        declaredTicketCount: declared,
        calculatedTicketCount,
        ticketDiscrepancy,
        discrepancyReason: dto.discrepancyReason,
        notes: dto.notes,
      },
    });

    if (calculatedTicketCount && calculatedTicketCount > 0) {
      await this.prisma.ticket.create({
        data: {
          sessionId,
          startNumber: dto.initialTicketNumber!,
          endNumber: dto.finalTicketNumber!,
          totalIssued: calculatedTicketCount,
          unitPrice: 1.00,
          totalAmount: totalCollected,
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
        entityId: sessionId,
        newValues: {
          totalCollected,
          ticketDiscrepancy,
        },
      },
    });

    return closed;
  }

  async issueEntryTicket(sessionId: string) {
    let session = await this.prisma.sanitaryServiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== SessionStatus.ABIERTO) {
      session = await this.prisma.sanitaryServiceSession.findFirst({
        where: { status: SessionStatus.ABIERTO },
        orderBy: { startTime: 'desc' },
      });
      if (!session) {
        throw new BadRequestException('No hay ninguna sesión de servicios higiénicos abierta');
      }
    }

    const currentCount = await this.prisma.sanitaryEntryTicket.count({
      where: { sessionId: session.id },
    });
    const ticketNumber = currentCount + 1;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ticketCode = `MB-SSHH-${dateStr}-${String(ticketNumber).padStart(4, '0')}`;

    const entryTicket = await this.prisma.sanitaryEntryTicket.create({
      data: {
        sessionId: session.id,
        ticketNumber,
        ticketCode,
        amount: 0.50,
      },
    });

    // Update session counts and total collected
    const newUrinalCount = session.urinalCount + 1;
    const newTotal = Number(session.totalCollected) + 0.50;
    await this.prisma.sanitaryServiceSession.update({
      where: { id: session.id },
      data: {
        urinalCount: newUrinalCount,
        urinalTotal: newUrinalCount * 0.50,
        totalCollected: newTotal,
      },
    });

    return {
      success: true,
      ticket: entryTicket,
      session: {
        id: session.id,
        urinalCount: newUrinalCount,
        totalCollected: newTotal,
      },
    };
  }

  async validateEntryTicket(ticketCode: string, validatorId?: string) {
    if (!ticketCode || !ticketCode.trim()) {
      throw new BadRequestException('Código de boleto inválido');
    }

    const cleanCode = ticketCode.trim();
    const ticket = await this.prisma.sanitaryEntryTicket.findUnique({
      where: { ticketCode: cleanCode },
      include: { session: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Boleto "${cleanCode}" no registrado en el sistema`);
    }

    if (ticket.isValidated) {
      const validatedTime = ticket.validatedAt
        ? new Date(ticket.validatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'hora previa';
      throw new BadRequestException(`⚠️ ALERTA: Este boleto ya fue utilizado y validado a las ${validatedTime}`);
    }

    const validated = await this.prisma.sanitaryEntryTicket.update({
      where: { id: ticket.id },
      data: {
        isValidated: true,
        validatedAt: new Date(),
        validatedById: validatorId || null,
      },
    });

    return {
      success: true,
      message: `✓ INGRESO AUTORIZADO - Boleto #${ticket.ticketNumber} validado exitosamente`,
      ticket: validated,
    };
  }

  async getSessionTickets(sessionId: string) {
    return this.prisma.sanitaryEntryTicket.findMany({
      where: { sessionId },
      orderBy: { ticketNumber: 'desc' },
      take: 100,
    });
  }
}
