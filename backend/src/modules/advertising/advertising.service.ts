import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdvertisingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const adv = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!adv) throw new NotFoundException('Publicidad no encontrada');
    return adv;
  }

  async create(data: {
    title: string;
    advertiserName: string;
    type?: string;
    audioUrl?: string;
    textScript?: string;
    amount?: number;
    startDate?: string;
    endDate?: string;
    playbackTimes?: string[];
    createdById?: string;
  }) {
    const count = await this.prisma.advertisement.count();
    const code = 'PUB-' + String(count + 1).padStart(5, '0');

    return this.prisma.advertisement.create({
      data: {
        code,
        title: data.title,
        advertiserName: data.advertiserName,
        type: data.type || 'PERIFONEO_AUDIO',
        audioUrl: data.audioUrl,
        textScript: data.textScript,
        amount: data.amount ? Number(data.amount) : 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        playbackTimes: data.playbackTimes || ['09:00', '12:00', '16:00'],
        status: 'ACTIVO',
        createdById: data.createdById || null,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    return this.prisma.advertisement.delete({ where: { id } });
  }
}
