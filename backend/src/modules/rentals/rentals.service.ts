import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { PayInstallmentDto } from './dto/pay-installment.dto';
import { StallStatus, CashRegisterStatus, CashMovementType, PaymentMethod } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Pre-visualización del cronograma de cuotas con tasa de interés (sin persistir)
   */
  previewSchedule(dto: {
    startDate: string;
    monthsCount: number;
    monthlyRent: number;
    interestRate?: number;
  }) {
    const months = Number(dto.monthsCount) || 1;
    const rent = Number(dto.monthlyRent) || 0;
    const rate = Number(dto.interestRate) || 0;
    const interestPerMonth = Number((rent * (rate / 100)).toFixed(2));
    const totalPerMonth = Number((rent + interestPerMonth).toFixed(2));

    const start = new Date(dto.startDate);
    const installments = [];

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + i - 1);

      installments.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        rentAmount: rent,
        interestAmount: interestPerMonth,
        totalAmount: totalPerMonth,
      });
    }

    return {
      monthsCount: months,
      monthlyRent: rent,
      interestRate: rate,
      monthlyInterest: interestPerMonth,
      monthlyTotal: totalPerMonth,
      totalContractAmount: Number((totalPerMonth * months).toFixed(2)),
      installments,
    };
  }

  async findAll(query?: {
    status?: string;
    search?: string;
    stallCode?: string;
    sort?: string;
  }) {
    const where: any = {};
    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.stallCode) {
      where.stallCode = { contains: query.stallCode, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { tenantName: { contains: query.search, mode: 'insensitive' } },
        { tenantDni: { contains: query.search, mode: 'insensitive' } },
        { contractNumber: { contains: query.search, mode: 'insensitive' } },
        { stallCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = [{ createdAt: 'desc' }];
    if (query?.sort === 'alphabetical_asc') {
      orderBy = [{ tenantName: 'asc' }];
    } else if (query?.sort === 'alphabetical_desc') {
      orderBy = [{ tenantName: 'desc' }];
    } else if (query?.sort === 'stall_asc') {
      orderBy = [{ stallCode: 'asc' }];
    }

    const contracts = await this.prisma.stallRentalContract.findMany({
      where,
      include: {
        stall: { select: { id: true, code: true, sector: { select: { code: true, name: true } } } },
        merchant: { select: { id: true, firstName: true, lastName: true, dni: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy,
    });

    // Calcular estadísticas y progreso por contrato
    return contracts.map((c) => {
      const totalInstallments = c.installments.length;
      const paidInstallments = c.installments.filter((i) => i.status === 'PAGADO');
      const paidCount = paidInstallments.length;
      const pendingCount = totalInstallments - paidCount;

      const firstPending = c.installments.find((i) => i.status === 'PENDIENTE');
      const currentQuota = firstPending ? firstPending.installmentNumber : totalInstallments;

      const totalPaidAmount = paidInstallments.reduce((acc, i) => acc + Number(i.totalAmount), 0);
      const totalPendingAmount = c.installments
        .filter((i) => i.status !== 'PAGADO')
        .reduce((acc, i) => acc + Number(i.totalAmount), 0);

      return {
        ...c,
        progress: {
          totalInstallments,
          paidCount,
          pendingCount,
          currentQuota,
          isCompleted: pendingCount === 0 && totalInstallments > 0,
          totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
          totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
          nextDueDate: firstPending ? firstPending.dueDate : null,
        },
      };
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.stallRentalContract.findUnique({
      where: { id },
      include: {
        stall: { include: { sector: true } },
        merchant: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!contract) throw new NotFoundException('Contrato de alquiler no encontrado');

    const totalInstallments = contract.installments.length;
    const paidInstallments = contract.installments.filter((i) => i.status === 'PAGADO');
    const firstPending = contract.installments.find((i) => i.status === 'PENDIENTE');

    return {
      ...contract,
      progress: {
        totalInstallments,
        paidCount: paidInstallments.length,
        pendingCount: totalInstallments - paidInstallments.length,
        currentQuota: firstPending ? firstPending.installmentNumber : totalInstallments,
        isCompleted: paidInstallments.length === totalInstallments,
      },
    };
  }

  async create(dto: CreateRentalDto, userId?: string) {
    // 1. Verificar puesto
    const stall = await this.prisma.marketStall.findUnique({
      where: { id: dto.stallId },
      include: { sector: true },
    });
    if (!stall) throw new NotFoundException('Puesto no encontrado');

    if (stall.status === StallStatus.OCUPADO) {
      throw new BadRequestException(`El puesto ${stall.code} ya se encuentra ocupado.`);
    }

    // 2. Correlativo contrato
    const count = await this.prisma.stallRentalContract.count();
    const contractNumber = 'ALQ-' + String(count + 1).padStart(5, '0');

    // 3. Fechas y montos
    const startDate = new Date(dto.startDate);
    const months = Number(dto.monthsCount) || 6;
    const rent = Number(dto.monthlyRent);
    const rate = Number(dto.interestRate || 0);

    const interestPerMonth = Number((rent * (rate / 100)).toFixed(2));
    const totalPerMonth = Number((rent + interestPerMonth).toFixed(2));
    const totalAmount = Number((totalPerMonth * months).toFixed(2));

    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + months);

    // 3.5. Buscar o crear el Comerciante de tipo INQUILINO en la tabla Merchant para sincronizar con el Padrón
    let merchantId = dto.merchantId || null;
    if (dto.tenantDni) {
      let merchant = await this.prisma.merchant.findUnique({
        where: { dni: dto.tenantDni.trim() },
      });

      if (!merchant) {
        const inquilinoType = await this.prisma.merchantType.findFirst({
          where: { code: 'INQUILINO' },
        });

        if (inquilinoType) {
          const parts = dto.tenantName.trim().split(' ');
          const firstName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
          const lastName = parts.length > 1 ? parts[0] : 'Inquilino';
          const countM = await this.prisma.merchant.count();
          const internalCode = `INQ-${String(countM + 1).padStart(4, '0')}`;
          const qrCode = `MB-INQ-${dto.tenantDni.trim()}`;

          merchant = await this.prisma.merchant.create({
            data: {
              internalCode,
              qrCode,
              firstName,
              lastName,
              dni: dto.tenantDni.trim(),
              phone: dto.tenantPhone?.trim() || null,
              merchantType: { connect: { id: inquilinoType.id } },
              stall: stall?.id ? { connect: { id: stall.id } } : undefined,
              businessCategory: dto.businessCategory?.trim() || 'Comercio General',
              status: 'ACTIVO',
              isDeleted: false,
            },
          });
        }
      } else {
        if (!merchant.stallId) {
          await this.prisma.merchant.update({
            where: { id: merchant.id },
            data: { stallId: stall.id },
          });
        }
      }

      if (merchant) {
        merchantId = merchant.id;
      }
    }

    // 4. Crear contrato e installments en transacción
    const contract = await this.prisma.$transaction(async (tx) => {
      // Marcar puesto como ocupado
      await tx.marketStall.update({
        where: { id: stall.id },
        data: {
          status: StallStatus.OCUPADO,
          observations: `Alquilado a ${dto.tenantName.trim()} (DNI: ${dto.tenantDni.trim()})`,
        },
      });

      const newContract = await tx.stallRentalContract.create({
        data: {
          contractNumber,
          stallId: stall.id,
          stallCode: stall.code,
          sectorCode: stall.sector?.code || 'SEC-GEN',
          tenantName: dto.tenantName.trim(),
          tenantDni: dto.tenantDni.trim(),
          tenantPhone: dto.tenantPhone?.trim() || null,
          businessCategory: dto.businessCategory?.trim() || 'Comercio General',
          merchantId: merchantId,
          startDate,
          endDate,
          monthsCount: months,
          monthlyRent: rent,
          interestRate: rate,
          totalAmount,
          depositAmount: dto.depositAmount ? Number(dto.depositAmount) : 0,
          status: 'ACTIVO',
          contractTerms: dto.contractTerms?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdById: userId || null,
        },
      });

      // Crear cronograma de cuotas
      for (let i = 1; i <= months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i - 1);

        await tx.stallRentalInstallment.create({
          data: {
            contractId: newContract.id,
            installmentNumber: i,
            dueDate,
            rentAmount: rent,
            interestAmount: interestPerMonth,
            totalAmount: totalPerMonth,
            status: 'PENDIENTE',
          },
        });
      }

      return newContract;
    });

    return this.findOne(contract.id);
  }

  async update(id: string, dto: UpdateRentalDto) {
    const contract = await this.prisma.stallRentalContract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contrato de alquiler no encontrado');

    const updated = await this.prisma.stallRentalContract.update({
      where: { id },
      data: {
        ...(dto.tenantName ? { tenantName: dto.tenantName.trim() } : {}),
        ...(dto.tenantPhone !== undefined ? { tenantPhone: dto.tenantPhone?.trim() || null } : {}),
        ...(dto.businessCategory ? { businessCategory: dto.businessCategory.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.contractTerms !== undefined ? { contractTerms: dto.contractTerms?.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });

    if (contract.merchantId && (dto.tenantName || dto.tenantPhone !== undefined || dto.businessCategory)) {
      const parts = (dto.tenantName || contract.tenantName).trim().split(' ');
      await this.prisma.merchant.update({
        where: { id: contract.merchantId },
        data: {
          ...(dto.tenantName ? {
            firstName: parts.length > 1 ? parts.slice(1).join(' ') : parts[0],
            lastName: parts.length > 1 ? parts[0] : 'Inquilino',
          } : {}),
          ...(dto.tenantPhone !== undefined ? { phone: dto.tenantPhone?.trim() || null } : {}),
          ...(dto.businessCategory ? { businessCategory: dto.businessCategory.trim() } : {}),
        },
      }).catch(() => null);
    }

    return updated;
  }

  async payInstallment(
    contractId: string,
    installmentNumber: number,
    dto: PayInstallmentDto,
    userId?: string,
  ) {
    const contract = await this.prisma.stallRentalContract.findUnique({
      where: { id: contractId },
      include: { stall: true },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');

    const installment = await this.prisma.stallRentalInstallment.findUnique({
      where: {
        contractId_installmentNumber: {
          contractId,
          installmentNumber,
        },
      },
    });
    if (!installment) throw new NotFoundException(`Cuota N° ${installmentNumber} no encontrada`);

    if (installment.status === 'PAGADO') {
      throw new BadRequestException(`La cuota N° ${installmentNumber} ya fue cobrada previamente`);
    }

    const receiptNumber = dto.receiptNumber || `VCH-ALQ-${Date.now().toString().slice(-6)}`;
    let cashRegisterId: string | null = null;

    // Registrar en caja activa si solicitado
    if (dto.registerCashIncome !== false) {
      const activeRegister = await this.prisma.cashRegister.findFirst({
        where: { status: CashRegisterStatus.ABIERTO },
        orderBy: { openedAt: 'desc' },
      });

      if (activeRegister) {
        cashRegisterId = activeRegister.id;
        await this.prisma.cashMovement.create({
          data: {
            cashRegisterId: activeRegister.id,
            type: CashMovementType.INGRESO,
            concept: `Alquiler Puesto ${contract.stallCode} - Cuota ${installmentNumber}/${contract.monthsCount} (${contract.tenantName})`,
            amount: installment.totalAmount,
            reference: receiptNumber,
            userId: userId || activeRegister.openedById,
          },
        });
      }
    }

    const updatedInstallment = await this.prisma.stallRentalInstallment.update({
      where: { id: installment.id },
      data: {
        status: 'PAGADO',
        paidAt: new Date(),
        paymentMethod: dto.paymentMethod || PaymentMethod.EFECTIVO,
        receiptNumber,
        notes: dto.notes?.trim() || null,
        cashRegisterId,
      },
    });

    // Registrar en tabla Payment para historial unificado de cobranzas
    try {
      let concept = await this.prisma.paymentConcept.findUnique({
        where: { code: 'ALQUILER_INQUILINO' },
      });
      if (!concept) {
        concept = await this.prisma.paymentConcept.create({
          data: {
            code: 'ALQUILER_INQUILINO',
            name: 'Alquiler de Puesto (Inquilinos)',
            periodicity: 'MENSUAL',
            isActive: true,
          },
        });
      }

      let validMerchantId: string | null = null;
      if (contract.merchantId) {
        const m = await this.prisma.merchant.findUnique({ where: { id: contract.merchantId }, select: { id: true } });
        if (m) validMerchantId = m.id;
      }
      if (!validMerchantId && contract.tenantDni) {
        const m = await this.prisma.merchant.findUnique({ where: { dni: contract.tenantDni }, select: { id: true } });
        if (m) validMerchantId = m.id;
      }

      const collectorUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      const defaultUserId = userId || collectorUser?.id || '';

      const period = installment.dueDate
        ? `${new Date(installment.dueDate).getFullYear()}-${String(new Date(installment.dueDate).getMonth() + 1).padStart(2, '0')}`
        : new Date().toISOString().slice(0, 7);

      let opNumber = receiptNumber;
      const opExists = await this.prisma.payment.findUnique({ where: { operationNumber: opNumber } });
      if (opExists) {
        opNumber = `MB-ALQ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      }

      await this.prisma.payment.create({
        data: {
          operationNumber: opNumber,
          merchantId: validMerchantId,
          conceptId: concept.id,
          amount: installment.totalAmount,
          period: `${period} (Cuota ${installmentNumber})`,
          paymentMethod: dto.paymentMethod || PaymentMethod.EFECTIVO,
          cashRegisterId,
          collectedById: defaultUserId,
          notes: `Alquiler Puesto ${contract.stallCode} - Cuota ${installmentNumber}/${contract.monthsCount} (${contract.tenantName})`,
          paidAt: new Date(),
        },
      });
    } catch (errPayment) {
      console.warn('Nota: Pago en tabla Payment registrado o duplicado omitido:', errPayment);
    }

    // Comprobar si todas las cuotas han sido canceladas
    const pendingRemaining = await this.prisma.stallRentalInstallment.count({
      where: { contractId, status: 'PENDIENTE' },
    });
    if (pendingRemaining === 0) {
      await this.prisma.stallRentalContract.update({
        where: { id: contractId },
        data: { status: 'FINALIZADO' },
      });
    }

    return {
      message: `Cuota ${installmentNumber} cobrada exitosamente`,
      installment: updatedInstallment,
      receiptNumber,
    };
  }

  async terminateContract(id: string, reason?: string) {
    const contract = await this.prisma.stallRentalContract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contrato no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.stallRentalContract.update({
        where: { id },
        data: {
          status: 'RESCINDIDO',
          notes: reason ? `${contract.notes || ''} [Rescindido: ${reason}]`.trim() : contract.notes,
        },
      });

      // Liberar puesto
      await tx.marketStall.update({
        where: { id: contract.stallId },
        data: {
          status: StallStatus.LIBRE,
          observations: 'Puesto liberado por término de contrato de alquiler',
        },
      });
    });

    return { message: `Contrato ${contract.contractNumber} rescindido y puesto ${contract.stallCode} liberado.` };
  }

  async getContractDocument(id: string) {
    const contract = await this.findOne(id);
    return {
      title: 'CONTRATO PRIVADO DE ARRENDAMIENTO DE PUESTO COMERCIAL',
      association: 'ASOCIACIÓN DE COMERCIANTES DEL MERCADO DE ABASTOS MICAELA BASTIDAS',
      ruc: '20486000001',
      address: 'Mercado de Abastos Micaela Bastidas, Pabellón Central, Huancayo',
      contractNumber: contract.contractNumber,
      stallCode: contract.stallCode,
      sectorName: contract.stall?.sector?.name || 'Sector General',
      tenant: {
        name: contract.tenantName,
        dni: contract.tenantDni,
        phone: contract.tenantPhone || 'No registrado',
        businessCategory: contract.businessCategory || 'Comercio General',
      },
      terms: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        durationMonths: contract.monthsCount,
        monthlyRent: Number(contract.monthlyRent).toFixed(2),
        interestRate: Number(contract.interestRate).toFixed(2),
        totalAmount: Number(contract.totalAmount).toFixed(2),
        depositAmount: Number(contract.depositAmount).toFixed(2),
      },
      schedule: contract.installments.map((inst) => ({
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        rentAmount: Number(inst.rentAmount).toFixed(2),
        interestAmount: Number(inst.interestAmount).toFixed(2),
        totalAmount: Number(inst.totalAmount).toFixed(2),
        status: inst.status,
        receiptNumber: inst.receiptNumber,
      })),
      clauses: [
        'PRIMERA (DEL OBJETO): EL ARRENDADOR da en arrendamiento el puesto comercial identificado para uso estricto del giro autorizado.',
        'SEGUNDA (DEL PLAZO): El plazo del presente contrato es improrrogable salvo acuerdo expreso de la Junta Directiva.',
        'TERCERA (DEL PAGO): El canon se pagará puntualmente conforme al cronograma de amortización establecido.',
        'CUARTA (DE LAS NORMAS SANITARIAS): El ARRENDATARIO se compromete a respetar las ordenanzas de salubridad y limpieza del mercado.',
        'QUINTA (DE LA RESOLUCIÓN): El retraso de dos cuotas consecutivas facultará la reversión inmediata del puesto a favor de la asociación.',
      ],
    };
  }

  async delete(id: string) {
    const contract = await this.prisma.stallRentalContract.findUnique({
      where: { id },
      include: { installments: true },
    });
    if (!contract) throw new NotFoundException('Contrato de alquiler no encontrado');

    const paidCount = contract.installments.filter((i) => i.status === 'PAGADO').length;
    if (paidCount > 0) {
      throw new BadRequestException(`No se puede eliminar el contrato porque ya registra ${paidCount} cuotas pagadas. En su lugar, rescíndalo.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stallRentalInstallment.deleteMany({ where: { contractId: id } });
      await tx.stallRentalContract.delete({ where: { id } });
      if (contract.stallId) {
        await tx.marketStall.update({
          where: { id: contract.stallId },
          data: { status: StallStatus.LIBRE, observations: null },
        });
      }
    });

    return { message: `Contrato ${contract.contractNumber} eliminado exitosamente y puesto liberado.` };
  }
}
