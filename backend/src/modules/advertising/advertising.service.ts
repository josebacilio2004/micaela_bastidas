import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CashMovementType, CashRegisterStatus, AuditAction } from '@prisma/client';

@Injectable()
export class AdvertisingService {
  private readonly logger = new Logger(AdvertisingService.name);

  constructor(private prisma: PrismaService) {}

  // --- GUIONES PRE-ESCRITOS (CRUD) ---
  async findScripts(category?: string) {
    try {
      let scripts = await this.prisma.advertisingScript.findMany({
        where: {
          isActive: true,
          ...(category && category !== 'ALL' ? { category } : {}),
        },
        orderBy: { title: 'asc' },
      });

      // Si no hay ningún guión registrado aún, sembrar plantillas predeterminadas del mercado
      if (scripts.length === 0 && (!category || category === 'ALL')) {
        await this.seedDefaultScripts();
        scripts = await this.prisma.advertisingScript.findMany({
          where: { isActive: true },
          orderBy: { title: 'asc' },
        });
      }

      return scripts;
    } catch (err: any) {
      this.logger.error('Error al obtener guiones publicitarios: ' + err.message);
      return [];
    }
  }

  private async seedDefaultScripts() {
    const defaults = [
      {
        title: 'Citación a Asamblea General Extraordinaria',
        category: 'ASAMBLEA',
        content: 'Atención señores comerciantes y socios de la Asociación Micaela Bastidas: Se les recuerda que la Asamblea General Extraordinaria se llevará a cabo a las 4:00 PM en el patio principal. Su asistencia es obligatoria portando su DNI.',
        estimatedDurationSeconds: 25,
      },
      {
        title: 'Convocatoria a Faena Comunal de Limpieza',
        category: 'FAENA',
        content: 'Estimados socios y comerciantes: Este domingo se realizará la gran faena comunal de limpieza y desinfección general en todos los sectores. Por disposición de la asamblea, la asistencia y puntualidad son de estricto cumplimiento.',
        estimatedDurationSeconds: 25,
      },
      {
        title: 'Aviso de Cobranza de Mantenimiento y Agua',
        category: 'AVISO_COBRANZA',
        content: 'Señores comerciantes: Se les informa que la tesorería se encuentra atendiendo para la regularización de las cuotas de mantenimiento mensual y consumo de agua. Por favor acérquense a la oficina de administración.',
        estimatedDurationSeconds: 20,
      },
      {
        title: 'Promoción Comercial - Puestos de Carnes y Pescados',
        category: 'PROMOCION_SOCIO',
        content: '¡Atención caseros y amas de casa! El pabellón de carnes y pescados ofrece productos frescos del día a los mejores precios del mercado. ¡Aprovechen nuestras grandes ofertas!',
        estimatedDurationSeconds: 20,
      },
      {
        title: 'Comunicado de Seguridad y Cuidado de Puestos',
        category: 'COMUNICADO_GENERAL',
        content: 'Aviso importante a todos los comerciantes: Se les solicita mantener los pasadizos libres de mercadería y verificar las conexiones eléctricas y candados antes del horario de cierre.',
        estimatedDurationSeconds: 20,
      },
    ];

    for (const item of defaults) {
      await this.prisma.advertisingScript.create({
        data: {
          ...item,
          isActive: true,
        },
      }).catch(() => null);
    }
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
        estimatedDurationSeconds: Number(dto.estimatedDurationSeconds) || 30,
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
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.estimatedDurationSeconds !== undefined ? { estimatedDurationSeconds: Number(dto.estimatedDurationSeconds) } : {}),
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
    try {
      return await this.prisma.advertisement.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      this.logger.error('Error al listar publicidades: ' + err.message);
      return [];
    }
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
    paymentMethod?: string;
    notes?: string;
  }) {
    let finalAmount = data.amount !== undefined && data.amount !== null ? Number(data.amount) : 0;

    // Si viene rateId o conceptCode, consultar tarifa oficial si el monto no fue ingresado
    if (finalAmount <= 0) {
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
    }

    const count = await this.prisma.advertisement.count().catch(() => 0);
    const code = 'PUB-' + String(count + 1).padStart(5, '0');

    const ad = await this.prisma.advertisement.create({
      data: {
        code,
        title: data.title.trim(),
        advertiserName: data.advertiserName.trim(),
        type: data.type || 'PERIFONEO_AUDIO',
        audioUrl: data.audioUrl || null,
        textScript: data.textScript || null,
        amount: finalAmount,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        playbackTimes: data.playbackTimes || ['09:00', '12:00', '16:00'],
        status: 'ACTIVO',
        createdById: data.createdById || null,
      },
    });

    // REGISTRO AUTOMÁTICO EN LA CAJA ACTIVA (INGRESO)
    let cashInfo = {
      registeredInCash: false,
      cashRegisterName: null as string | null,
      cashMovementId: null as string | null,
      cashWarning: null as string | null,
    };

    if (finalAmount > 0) {
      try {
        const activeRegister = await this.prisma.cashRegister.findFirst({
          where: { status: CashRegisterStatus.ABIERTO },
          orderBy: { openedAt: 'desc' },
        });

        if (activeRegister) {
          const movement = await this.prisma.cashMovement.create({
            data: {
              cashRegisterId: activeRegister.id,
              type: CashMovementType.INGRESO,
              concept: `Publicidad: ${ad.title} (${ad.advertiserName})`,
              amount: finalAmount,
              reference: `TKT-${ad.code}`,
              userId: data.createdById || activeRegister.openedById,
            },
          });

          cashInfo.registeredInCash = true;
          cashInfo.cashRegisterName = activeRegister.name;
          cashInfo.cashMovementId = movement.id;

          // Registro en auditoría
          if (data.createdById) {
            await this.prisma.auditLog.create({
              data: {
                userId: data.createdById,
                action: AuditAction.CREATE,
                module: 'ADVERTISING',
                entityName: 'Advertisement',
                entityId: ad.id,
                newValues: {
                  code: ad.code,
                  title: ad.title,
                  amount: finalAmount,
                  cashMovementId: movement.id,
                  cashRegisterId: activeRegister.id,
                },
              },
            }).catch(() => null);
          }
        } else {
          cashInfo.cashWarning = 'No hay ninguna caja abierta en este momento. El cobro quedó registrado en publicidad, pero recuerde abrir caja en Tesorería para el arqueo de efectivo.';
        }
      } catch (err: any) {
        this.logger.error('Error al asentar cobro de publicidad en caja: ' + err.message);
        cashInfo.cashWarning = 'Error al registrar en caja: ' + err.message;
      }
    }

    const ticket = this.formatTicket(ad, cashInfo);
    return { ...ad, cashInfo, ticket };
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

  private formatTicket(ad: any, cashInfo?: any) {
    const times = Array.isArray(ad.playbackTimes) ? ad.playbackTimes.join(', ') : (ad.playbackTimes || 'Rotativo');
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
      registeredInCash: cashInfo?.registeredInCash ?? true,
      cashRegisterName: cashInfo?.cashRegisterName || 'Caja General del Mercado',
    };
  }

  async delete(id: string) {
    return this.prisma.advertisement.delete({ where: { id } });
  }
}
