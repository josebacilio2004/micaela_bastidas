import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdvertisingService {
  constructor(private prisma: PrismaService) {}

  // --- GUIONES PRE-ESCRITOS (CRUD) ---
  async findScripts(category?: string) {
    return this.prisma.advertisingScript.findMany({
      where: {
        isActive: true,
        ...(category && category !== 'ALL' ? { category } : {}),
      },
      orderBy: { title: 'asc' },
    });
  }

  async findScriptById(id: string) {
    const script = await this.prisma.advertisingScript.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Guión publicitario no encontrado');
    return script;
  }

  async createScript(dto: {
    title: string;
    category: string;
    content: string;
    estimatedDurationSeconds?: number;
  }) {
    return this.prisma.advertisingScript.create({
      data: {
        title: dto.title.trim(),
        category: dto.category.trim(),
        content: dto.content.trim(),
        estimatedDurationSeconds: dto.estimatedDurationSeconds || 30,
        isActive: true,
      },
    });
  }

  async updateScript(id: string, dto: {
    title?: string;
    category?: string;
    content?: string;
    estimatedDurationSeconds?: number;
    isActive?: boolean;
  }) {
    const script = await this.prisma.advertisingScript.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Guión publicitario no encontrado');

    return this.prisma.advertisingScript.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.content ? { content: dto.content.trim() } : {}),
        ...(dto.estimatedDurationSeconds !== undefined ? { estimatedDurationSeconds: dto.estimatedDurationSeconds } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteScript(id: string) {
    const script = await this.prisma.advertisingScript.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Guión publicitario no encontrado');
    return this.prisma.advertisingScript.update({ where: { id }, data: { isActive: false } });
  }

  // --- PUBLICIDADES / SPOTS ---
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
    rateId?: string;
    conceptCode?: string;
    startDate?: string;
    endDate?: string;
    playbackTimes?: string[];
    createdById?: string;
  }) {
    let finalAmount = data.amount ? Number(data.amount) : 0;

    // Si viene rateId o conceptCode, consultar tarifa oficial
    if (data.rateId) {
      const rate = await this.prisma.rate.findUnique({ where: { id: data.rateId } });
      if (rate) finalAmount = Number(rate.amount);
    } else if (data.conceptCode) {
      const concept = await this.prisma.paymentConcept.findUnique({
        where: { code: data.conceptCode },
        include: { rates: { where: { isActive: true }, take: 1 } },
      });
      if (concept && concept.rates.length > 0) {
        finalAmount = Number(concept.rates[0].amount);
      }
    }

    const count = await this.prisma.advertisement.count();
    const code = 'PUB-' + String(count + 1).padStart(5, '0');

    const ad = await this.prisma.advertisement.create({
      data: {
        code,
        title: data.title.trim(),
        advertiserName: data.advertiserName.trim(),
        type: data.type || 'PERIFONEO_AUDIO',
        audioUrl: data.audioUrl,
        textScript: data.textScript,
        amount: finalAmount,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        playbackTimes: data.playbackTimes || ['09:00', '12:00', '16:00'],
        status: 'ACTIVO',
        createdById: data.createdById || null,
      },
    });

    const ticket = this.formatTicket(ad);
    return { ...ad, ticket };
  }

  async update(id: string, data: {
    title?: string;
    advertiserName?: string;
    type?: string;
    audioUrl?: string;
    textScript?: string;
    amount?: number;
    playbackTimes?: string[];
    status?: string;
  }) {
    const adv = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!adv) throw new NotFoundException('Publicidad no encontrada');

    return this.prisma.advertisement.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.advertiserName ? { advertiserName: data.advertiserName.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.audioUrl !== undefined ? { audioUrl: data.audioUrl } : {}),
        ...(data.textScript !== undefined ? { textScript: data.textScript } : {}),
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.playbackTimes ? { playbackTimes: data.playbackTimes } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { status },
    });
  }

  async getTicket(id: string) {
    const ad = await this.findOne(id);
    return this.formatTicket(ad);
  }

  private formatTicket(ad: any) {
    const times = Array.isArray(ad.playbackTimes) ? ad.playbackTimes.join(', ') : 'Rotativo';
    return {
      ticketNumber: `TKT-${ad.code}`,
      title: 'MERCADO DE ABASTOS MICAELA BASTIDAS',
      subtitle: 'COMPROBANTE DE PUBLICIDAD Y DIFUSIÓN',
      adCode: ad.code,
      campaignTitle: ad.title,
      advertiser: ad.advertiserName,
      serviceType: ad.type === 'PERIFONEO_AUDIO' ? 'Perifoneo / Audio en Altavoces' : ad.type,
      playbackSchedule: times,
      amount: Number(ad.amount).toFixed(2),
      currency: 'PEN',
      issuedAt: new Date(ad.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      legalNote: 'El presente ticket acredita el pago por difusión publicitaria en las instalaciones del mercado.',
    };
  }

  async delete(id: string) {
    return this.prisma.advertisement.delete({ where: { id } });
  }
}
