import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CashRegisterStatus, CashMovementType } from '@prisma/client';

@Injectable()
export class RevolvingFundService {
  constructor(private prisma: PrismaService) {}

  // --- LOANS (PRESTAMOS) ---
  async findAllLoans() {
    return this.prisma.loan.findMany({
      include: {
        merchant: {
          select: { id: true, firstName: true, lastName: true, dni: true, internalCode: true },
        },
        collections: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findLoanById(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        merchant: {
          include: {
            stall: true,
            sector: true,
          },
        },
        collections: { orderBy: { date: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    return loan;
  }

  async createLoan(data: {
    merchantId?: string;
    borrowerName: string;
    borrowerDni: string;
    amount: number;
    termMonths?: number;
    interestRate?: number;
    notes?: string;
    createdById?: string;
  }) {
    const count = await this.prisma.loan.count();
    const orderNumber = 'FR-PREST-' + String(count + 1).padStart(4, '0');

    const principal = Number(data.amount);
    const months = Number(data.termMonths || 1);
    const rate = Number(data.interestRate || 0);
    const totalInterest = (principal * rate * months) / 100;
    const totalAmount = Number((principal + totalInterest).toFixed(2));

    return this.prisma.loan.create({
      data: {
        orderNumber,
        merchantId: data.merchantId && data.merchantId !== '' ? data.merchantId : null,
        borrowerName: data.borrowerName,
        borrowerDni: data.borrowerDni,
        amount: principal,
        termMonths: months,
        interestRate: rate,
        totalAmount,
        status: 'VIGENTE',
        notes: data.notes,
        createdById: data.createdById,
      },
      include: { merchant: true },
    });
  }

  // --- COLLECTIONS (COBRANZAS) ---
  async findAllCollections() {
    return this.prisma.loanCollection.findMany({
      include: {
        loan: {
          select: { orderNumber: true, borrowerName: true, amount: true, status: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createCollection(data: {
    loanId: string;
    description: string;
    principalAmount: number;
    interestAmount: number;
    paymentMethod?: any;
    receiptNumber?: string;
    createdById?: string;
  }) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: data.loanId },
      include: { collections: true },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');

    const count = await this.prisma.loanCollection.count();
    const orderNumber = 'FR-COB-' + String(count + 1).padStart(4, '0');

    const principal = Number(data.principalAmount || 0);
    const interest = Number(data.interestAmount || 0);
    const total = Number((principal + interest).toFixed(2));

    // Registrar ingreso en caja activa si es cobro en efectivo o general
    const activeRegister = await this.prisma.cashRegister.findFirst({
      where: { status: CashRegisterStatus.ABIERTO },
      orderBy: { openedAt: 'desc' },
    });

    if (activeRegister && (data.paymentMethod === 'EFECTIVO' || !data.paymentMethod)) {
      await this.prisma.cashMovement.create({
        data: {
          cashRegisterId: activeRegister.id,
          type: CashMovementType.INGRESO,
          concept: `Fondo Rotatorio (${loan.orderNumber}): ${data.description || 'Amortización'} - ${loan.borrowerName}`,
          amount: total,
          reference: data.receiptNumber || orderNumber,
          userId: data.createdById || activeRegister.openedById,
        },
      });
    }

    const collection = await this.prisma.loanCollection.create({
      data: {
        orderNumber,
        loanId: data.loanId,
        borrowerName: loan.borrowerName,
        description: data.description || 'Amortización de cuota',
        principalAmount: principal,
        interestAmount: interest,
        totalAmount: total,
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        receiptNumber: data.receiptNumber,
        createdById: data.createdById,
      },
    });

    // Check total amortized vs loan totalAmount
    const totalCollected = loan.collections.reduce((sum, c) => sum + Number(c.totalAmount), 0) + total;
    if (totalCollected >= Number(loan.totalAmount)) {
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: { status: 'CANCELADO' },
      });
    }

    return collection;
  }

  /**
   * Generar contrato legal oficial completo con las 4 secciones del Word:
   * 1. Solicitud Formal de Préstamo con Aprobación
   * 2. Documento de Compromiso y Comprobante de Liquidación
   * 3. Contrato de Compromiso de Pago (9 Cláusulas Oficiales)
   * 4. Cronograma Oficial de Amortización y Ficha de Control (CP)
   */
  async getLoanContract(id: string) {
    const loan = await this.findLoanById(id);

    let merchant = loan.merchant;
    if (!merchant && loan.borrowerDni) {
      merchant = await this.prisma.merchant.findUnique({
        where: { dni: loan.borrowerDni },
        include: {
          stall: true,
          sector: true,
        },
      });
    }

    const principal = Number(loan.amount);
    const months = Number(loan.termMonths) || 1;
    const rate = Number(loan.interestRate || 0);
    const totalInterest = (principal * rate * months) / 100;
    const totalToPay = principal + totalInterest;

    const monthlyPrincipal = Number((principal / months).toFixed(2));
    const monthlyInterest = Number((totalInterest / months).toFixed(2));
    const monthlyTotal = Number((totalToPay / months).toFixed(2));

    const startDate = new Date(loan.date);
    const MESES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    const day = startDate.getDate();
    const monthName = MESES[startDate.getMonth()];
    const year = startDate.getFullYear();
    const dateFormatted = `${day} de ${monthName} del ${year}`;
    const dateSlash = `${String(day).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${year}`;

    const schedule: any[] = [];
    let remainingBalance = totalToPay;
    let accumulatedPrincipal = 0;
    let accumulatedInterest = 0;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);

      // Si es la última cuota, cuadrar cualquier céntimo residual
      let currPrincipal = monthlyPrincipal;
      let currInterest = monthlyInterest;
      if (i === months) {
        currPrincipal = Number((principal - accumulatedPrincipal).toFixed(2));
        currInterest = Number((totalInterest - accumulatedInterest).toFixed(2));
      }
      accumulatedPrincipal = Number((accumulatedPrincipal + currPrincipal).toFixed(2));
      accumulatedInterest = Number((accumulatedInterest + currInterest).toFixed(2));

      const currTotal = Number((currPrincipal + currInterest).toFixed(2));
      remainingBalance = Math.max(0, Number((remainingBalance - currTotal).toFixed(2)));

      const isPaid = (loan.collections && loan.collections.length >= i) || loan.status === 'CANCELADO';
      const dDay = dueDate.getDate();
      const dMonth = dueDate.getMonth() + 1;
      const dYear = dueDate.getFullYear();
      const dueDateSlash = `${String(dDay).padStart(2, '0')}/${String(dMonth).padStart(2, '0')}/${dYear}`;

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        dueDateSlash,
        principalAmount: currPrincipal.toFixed(2),
        interestAmount: currInterest.toFixed(2),
        totalInstallment: currTotal.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2),
        status: isPaid ? 'PAGADO' : 'PENDIENTE',
      });
    }

    const firstDueDateSlash = schedule[0]?.dueDateSlash || dateSlash;
    const lastDueDateSlash = schedule[schedule.length - 1]?.dueDateSlash || dateSlash;
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + months);

    // Separar apellidos y nombres
    let lastName = merchant?.lastName || '';
    let firstName = merchant?.firstName || '';
    if (!lastName && loan.borrowerName) {
      if (loan.borrowerName.includes(',')) {
        const parts = loan.borrowerName.split(',');
        lastName = parts[0].trim();
        firstName = parts.slice(1).join(',').trim();
      } else {
        const words = loan.borrowerName.trim().split(/\s+/);
        if (words.length >= 3) {
          lastName = words.slice(0, 2).join(' ');
          firstName = words.slice(2).join(' ');
        } else if (words.length === 2) {
          lastName = words[0];
          firstName = words[1];
        } else {
          lastName = loan.borrowerName;
          firstName = '';
        }
      }
    }

    const borrowerAddress = merchant?.address || 'JR. SANTOS ATAHUALPA N° 949 SECTOR N° 8 J.P.V. EL TAMBO';
    const borrowerPhone = merchant?.phone || '----------';
    const borrowerBusinessCategory = merchant?.businessCategory || 'ABARROTES';
    const borrowerStallCode = merchant?.stall?.code || 'PUESTO ASOCIADO';

    return {
      title: 'DOCUMENTO OFICIAL DEL FONDO ROTATORIO: CONTRATO, SOLICITUD, LIQUIDACIÓN Y CRONOGRAMA',
      orderNumber: loan.orderNumber,
      association: 'Asociación de Pequeños Comerciantes del Mercado de Abastos “MICAELA BASTIDAS” de “J.P.V” El Tambo – Huancayo',
      associationShort: 'APCOMA - “M.B”',
      ruc: '20486253109',
      date: dateSlash,
      dateFormatted,
      day,
      monthName,
      year,
      president: {
        name: 'GARCIA COCA FREDDY',
        dni: '20122038',
        role: 'PRESIDENTE DE LA APCOMA - “M.B”',
      },
      treasurer: {
        role: 'ENCARGADO(A) DEL FONDO ROTATORIO DE LA APCOMA “M.B”',
      },
      borrower: {
        fullName: loan.borrowerName,
        name: loan.borrowerName,
        lastName,
        firstName,
        dni: loan.borrowerDni,
        address: borrowerAddress,
        phone: borrowerPhone,
        businessCategory: borrowerBusinessCategory,
        stallCode: borrowerStallCode,
        internalCode: merchant?.internalCode || 'MB-001',
      },
      loanDetails: {
        principalAmount: principal.toFixed(2),
        principalInWords: numeroALetras(principal),
        interestRateMonthly: rate.toFixed(2),
        termMonths: months,
        monthlyInterestAmount: monthlyInterest.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        totalAmountToPay: totalToPay.toFixed(2),
        totalAmountInWords: numeroALetras(totalToPay),
        monthlyQuota: monthlyTotal.toFixed(2),
        paymentFrequency: 'MENSUAL',
        status: loan.status,
        startDateSlash: dateSlash,
        firstDueDateSlash,
        endDateSlash: lastDueDateSlash,
        startDateFormatted: dateFormatted,
        endDateFormatted: `${endDate.getDate()} de ${MESES[endDate.getMonth()]} del ${endDate.getFullYear()}`,
      },
      schedule,
      clauses: [
        'PRIMERO: la asociación en su finalidad de apoyar a los socios trabajadores de APCOMAMB, disponiendo de recursos provenientes de fuentes de (PAGOS ANTERIORES DEL FONDO ROTATORIO Y PAGOS DIARIOS) a fin de prestar un monto de dinero de acuerdo a las necesidades de cada uno de los beneficiarios.',
        `SEGUNDO: La Asociación a través de sus órganos competentes a solicitud del beneficiario otorga un préstamo el día ${dateFormatted}, EL TAMBO – HUANCAYO, por la suma de S/. ${principal.toFixed(2)} soles, sujeto a intereses efectuados en pagos MENSUALES en plazo de ${months} MESES que inicia el ${dateSlash} y culmina el ${lastDueDateSlash}. La devolución será de acuerdo a la fecha establecida para su cancelación o sus cuotas de pago pero si es diario o semanal se adjuntara un cronograma de pagos al presente COMPROMISO DE PAGO DE FONDO ROTATORIO dicho préstamo será utilizado con la finalidad de que el beneficiario pueda utilizar como apoyo o Incremento de su actividad económica o para fines que crea conveniente.`,
        'TERCERO: Queda establecido que el monto integro del préstamo otorgado al beneficiario, este se obliga a cancelar en la fecha que le corresponde a la persona encargada de tal acto, la cual se otorgara un recibo de pago por el cual usted estará al pendiente de sus pagos; llevando un control a través del cronograma firmado por el BENEFICIARIO.',
        'CUARTO: Si se diera el caso de que el BENEFICIARIO no puede cancelar su deuda en la fecha programada solicitara su ampliación previo documento ante la sustentación frente a la ASAMBLEA GENERAL.',
        'QUINTO: Queda en garantía el Puesto de cada socio el cual constituye primera y preferente garantía real sobre la totalidad de sus bienes. Pudiendo pasar a la administración de la APCOMA-MB, corriendo el riesgo de quedar fuera de la asociación.',
        'SEXTO: Son causales la resolución del contrato:\n1. Falta de pago oportuno de uno o mas cuotas al cronograma de pago.\n2. El incumplimiento de cualquiera de las condiciones y prohibiciones establecidas en el presente contrato.',
        'SÉPTIMO: Todas las intervenciones en este contrato se someterán a la Asamblea General de la APCOMAMB, siendo validas por tanto las NOTIFICACIONES O MEMORANDUM que se cursan a los socios BENEFICIARIOS.',
        'OCTAVO: Realizado el desembolso y la verificación del dinero entregado. EL BENEFICIARIO no tendrá lugar a reclamos de ninguna índole una vez retirado del lugar del desembolso.',
        'NOVENO: No Existe El Abono A Capital Ni Interés, Todo Calculo De Interés Sera Al Monto Del Capital Prestado Independientemente De Pagar Saldos A Favor Del Capital , De Cancelar El Capital , Se Aplicara El Recalculo De Interés Al Interés Faltante De Pago . El Beneficiario No Tendrá Lugar A Reclamos Dadas La Condiciones Del Préstamo.',
      ],
    };
  }
}

function numeroALetras(num: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const diez_diecinueve = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertirGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let output = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) output += centenas[c] + ' ';
    if (d === 1) {
      output += diez_diecinueve[u];
    } else if (d === 2 && u > 0) {
      output += 'VEINTI' + unidades[u];
    } else {
      if (d > 0) output += decenas[d] + (u > 0 ? ' Y ' : '');
      if (u > 0) output += unidades[u];
    }
    return output.trim();
  }

  const partes = Math.abs(num).toFixed(2).split('.');
  const entero = parseInt(partes[0], 10);
  const centavos = partes[1];

  if (entero === 0) return `CERO Y ${centavos}/100`;

  let letras = '';
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones === 1) {
    letras += 'UN MILLÓN ';
  } else if (millones > 1) {
    letras += convertirGrupo(millones) + ' MILLONES ';
  }

  if (miles === 1) {
    letras += 'MIL ';
  } else if (miles > 1) {
    letras += convertirGrupo(miles) + ' MIL ';
  }

  if (resto > 0) {
    letras += convertirGrupo(resto);
  }

  return `${letras.trim()} Y ${centavos}/100`;
}
