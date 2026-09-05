import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MeetingStatus } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.meeting.findMany({
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        attendances: {
          include: {
            merchant: { include: { stall: true, merchantType: true } },
            registeredBy: { select: { fullName: true } },
          },
          orderBy: { scannedAt: 'desc' },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    return meeting;
  }

  async create(dto: { title: string; date: string; time: string; location: string; description?: string }, userId: string) {
    return this.prisma.meeting.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        time: dto.time,
        location: dto.location,
        description: dto.description,
        status: MeetingStatus.EN_CURSO,
        createdById: userId,
      },
    });
  }

  async registerAttendance(
    meetingId: string,
    dto: { merchantIdentifier: string; idempotencyKey: string; deviceId?: string },
    userId: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // Merchant lookup by QR code, DNI or internal code
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { qrCode: dto.merchantIdentifier },
          { dni: dto.merchantIdentifier },
          { internalCode: dto.merchantIdentifier },
        ],
        isDeleted: false,
      },
      include: { stall: true, merchantType: true },
    });

    if (!merchant) {
      throw new NotFoundException('Socio no encontrado con el código/DNI escaneado');
    }

    // Check if already attended
    const existing = await this.prisma.attendanceEvent.findUnique({
      where: {
        meetingId_merchantId: {
          meetingId,
          merchantId: merchant.id,
        },
      },
    });

    if (existing) {
      const timeStr = existing.scannedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      throw new ConflictException(`Este socio ya registró asistencia a las ${timeStr}`);
    }

    const attendance = await this.prisma.attendanceEvent.create({
      data: {
        meetingId,
        merchantId: merchant.id,
        dni: merchant.dni,
        deviceId: dto.deviceId,
        registeredById: userId,
        idempotencyKey: dto.idempotencyKey,
      },
      include: {
        merchant: { include: { stall: true } },
      },
    });

    return {
      message: 'Asistencia registrada con éxito',
      attendance,
      merchant,
    };
  }

  async getQuorum(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendances: { select: { merchantId: true } },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const totalSocios = await this.prisma.merchant.count({
      where: { merchantType: { code: 'SOCIO' }, isDeleted: false },
    });

    const attendedCount = meeting.attendances.length;
    const absentCount = Math.max(0, totalSocios - attendedCount);
    const quorumPercentage = totalSocios > 0 ? (attendedCount / totalSocios) * 100 : 0;

    return {
      meetingId,
      totalSocios,
      attendedCount,
      absentCount,
      quorumPercentage: Number(quorumPercentage.toFixed(1)),
      hasQuorum: quorumPercentage >= 50.0,
    };
  }
}
