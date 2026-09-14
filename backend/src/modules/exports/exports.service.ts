import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  isAlcabalaConcept,
  isWaterConcept,
  isAssemblyConcept,
} from '../../common/utils/concept-classifier.util';

@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  async generateExcelReport(startDate?: string, endDate?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mercado de Abastos Micaela Bastidas';
    workbook.created = new Date();

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [payments, merchants, obligations, sessions, registers] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          isVoided: false,
          ...(startDate || endDate ? { paidAt: dateFilter } : {}),
        },
        include: {
          concept: true,
          merchant: { include: { stall: true, merchantType: true } },
          collectedBy: true,
        },
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.merchant.findMany({
        where: { isDeleted: false },
        include: { stall: true, merchantType: true, sector: true },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.paymentObligation.findMany({
        where: { status: 'PENDIENTE' },
        include: { merchant: { include: { stall: true } }, concept: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.sanitaryServiceSession.findMany({
        include: { operator: true },
        orderBy: { startTime: 'desc' },
        take: 100,
      }),
      this.prisma.cashRegister.findMany({
        include: { openedBy: true, closedBy: true },
        orderBy: { openedAt: 'desc' },
        take: 50,
      }),
    ]);

    // HOJA 1: RESUMEN EJECUTIVO
    const wsSummary = workbook.addWorksheet('Resumen General');
    wsSummary.columns = [
      { header: 'Concepto / Módulo', key: 'concepto', width: 35 },
      { header: 'Monto Total (S/)', key: 'monto', width: 22 },
      { header: 'Nro Operaciones', key: 'cantidad', width: 18 },
    ];

    const alcabalaPayments = payments.filter((p) => isAlcabalaConcept(p.concept.code, p.concept.name));
    const alcabalaSum = alcabalaPayments.reduce((a, b) => a + Number(b.amount), 0);

    const waterPayments = payments.filter((p) => isWaterConcept(p.concept.code, p.concept.name));
    const aguaSum = waterPayments.reduce((a, b) => a + Number(b.amount), 0);

    const otherPayments = payments.filter(
      (p) => !isAlcabalaConcept(p.concept.code, p.concept.name) && !isWaterConcept(p.concept.code, p.concept.name),
    );
    const otrosSum = otherPayments.reduce((a, b) => a + Number(b.amount), 0);

    const sshhSum = sessions.reduce((a, b) => a + Number(b.totalCollected), 0);
    const pendingSum = obligations.reduce((a, b) => a + Number(b.amount), 0);
    const totalGeneral = payments.reduce((a, b) => a + Number(b.amount), 0) + sshhSum;

    wsSummary.addRow({ concepto: 'Alcabala y Cuotas de Puesto (Socios y Ambulantes)', monto: alcabalaSum, cantidad: alcabalaPayments.length });
    wsSummary.addRow({ concepto: 'Servicio de Agua Potable', monto: aguaSum, cantidad: waterPayments.length });
    if (otrosSum > 0) {
      wsSummary.addRow({ concepto: 'Otros Pagos y Multas', monto: otrosSum, cantidad: otherPayments.length });
    }
    wsSummary.addRow({ concepto: 'Servicios Higiénicos (SSHH)', monto: sshhSum, cantidad: sessions.length });
    wsSummary.addRow({ concepto: 'TOTAL RECAUDADO', monto: totalGeneral, cantidad: payments.length + sessions.length });
    wsSummary.addRow({ concepto: 'OBLIGACIONES PENDIENTES (Morosidad)', monto: pendingSum, cantidad: obligations.length });

    this.styleHeaderRow(wsSummary);

    // HOJA 2: PAGOS
    const wsPayments = workbook.addWorksheet('Pagos');
    wsPayments.columns = [
      { header: 'N° Operación', key: 'op', width: 22 },
      { header: 'Fecha y Hora', key: 'fecha', width: 20 },
      { header: 'DNI', key: 'dni', width: 14 },
      { header: 'Comerciante', key: 'comerciante', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Puesto', key: 'puesto', width: 12 },
      { header: 'Concepto', key: 'concepto', width: 20 },
      { header: 'Período', key: 'periodo', width: 14 },
      { header: 'Monto (S/)', key: 'monto', width: 15 },
      { header: 'Método', key: 'metodo', width: 15 },
      { header: 'Cobrado Por', key: 'responsable', width: 25 },
    ];

    payments.forEach((p) => {
      wsPayments.addRow({
        op: p.operationNumber,
        fecha: p.paidAt.toISOString().replace('T', ' ').substring(0, 19),
        dni: p.merchant?.dni || 'N/A',
        comerciante: p.merchant ? `${p.merchant.lastName}, ${p.merchant.firstName}` : 'N/A',
        tipo: p.merchant?.merchantType?.name || 'N/A',
        puesto: p.merchant?.stall?.code || 'N/A',
        concepto: p.concept.name,
        periodo: p.period,
        monto: Number(p.amount),
        metodo: p.paymentMethod,
        responsable: p.collectedBy.fullName,
      });
    });
    this.styleHeaderRow(wsPayments);

    // HOJA 3: SERVICIOS HIGIÉNICOS
    const wsSSHH = workbook.addWorksheet('Servicios_Higienicos');
    wsSSHH.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Operador', key: 'operador', width: 25 },
      { header: 'Miccionarios (0.50)', key: 'miccionarios', width: 20 },
      { header: 'Retretes (1.00)', key: 'retretes', width: 18 },
      { header: 'Total (S/)', key: 'total', width: 16 },
      { header: 'Ticket Inicial', key: 't_ini', width: 15 },
      { header: 'Ticket Final', key: 't_fin', width: 15 },
      { header: 'Discrepancia', key: 'disc', width: 15 },
      { header: 'Estado', key: 'estado', width: 14 },
    ];

    sessions.forEach((s) => {
      wsSSHH.addRow({
        fecha: s.startTime.toISOString().split('T')[0],
        operador: s.operator.fullName,
        miccionarios: s.urinalCount,
        retretes: s.toiletCount,
        total: Number(s.totalCollected),
        t_ini: s.initialTicketNumber || '-',
        t_fin: s.finalTicketNumber || '-',
        disc: s.ticketDiscrepancy,
        estado: s.status,
      });
    });
    this.styleHeaderRow(wsSSHH);

    // HOJA 4: PADRÓN DE COMERCIANTES
    const wsMerchants = workbook.addWorksheet('Comerciantes');
    wsMerchants.columns = [
      { header: 'Código', key: 'code', width: 16 },
      { header: 'DNI', key: 'dni', width: 14 },
      { header: 'Apellidos y Nombres', key: 'name', width: 32 },
      { header: 'Teléfono', key: 'phone', width: 15 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Sector', key: 'sector', width: 25 },
      { header: 'Puesto', key: 'stall', width: 12 },
      { header: 'Rubro', key: 'category', width: 22 },
      { header: 'Estado', key: 'status', width: 14 },
    ];

    merchants.forEach((m) => {
      wsMerchants.addRow({
        code: m.internalCode,
        dni: m.dni,
        name: `${m.lastName}, ${m.firstName}`,
        phone: m.phone || '-',
        type: m.merchantType.name,
        sector: m.sector?.name || 'Ambulatorio',
        stall: m.stall?.code || 'Sin asignar',
        category: m.businessCategory || '-',
        status: m.status,
      });
    });
    this.styleHeaderRow(wsMerchants);

    // HOJA 5: MOROSOS / PENDIENTES
    const wsPending = workbook.addWorksheet('Pendientes');
    wsPending.columns = [
      { header: 'Comerciante', key: 'comerciante', width: 30 },
      { header: 'DNI', key: 'dni', width: 14 },
      { header: 'Puesto', key: 'puesto', width: 12 },
      { header: 'Concepto', key: 'concepto', width: 20 },
      { header: 'Período', key: 'periodo', width: 14 },
      { header: 'Monto Pendiente (S/)', key: 'monto', width: 20 },
      { header: 'Vencimiento', key: 'vencimiento', width: 16 },
    ];

    obligations.forEach((o) => {
      wsPending.addRow({
        comerciante: `${o.merchant.lastName}, ${o.merchant.firstName}`,
        dni: o.merchant.dni,
        puesto: o.merchant.stall?.code || 'Sin asignar',
        concepto: o.concept.name,
        periodo: o.period,
        monto: Number(o.amount),
        vencimiento: o.dueDate.toISOString().split('T')[0],
      });
    });
    this.styleHeaderRow(wsPending);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generatePaymentsCsv(startDate?: string, endDate?: string): Promise<string> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const payments = await this.prisma.payment.findMany({
      where: {
        isVoided: false,
        ...(startDate || endDate ? { paidAt: dateFilter } : {}),
      },
      include: {
        concept: true,
        merchant: { include: { stall: true, merchantType: true } },
        collectedBy: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    const headers = ['Operacion', 'Fecha', 'DNI', 'Comerciante', 'Tipo', 'Puesto', 'Concepto', 'Periodo', 'Monto', 'Metodo', 'Responsable'];
    const rows = payments.map((p) => [
      p.operationNumber,
      p.paidAt.toISOString().replace('T', ' ').substring(0, 19),
      p.merchant?.dni || '',
      p.merchant ? `"${p.merchant.lastName} ${p.merchant.firstName}"` : '',
      p.merchant?.merchantType?.name || '',
      p.merchant?.stall?.code || '',
      `"${p.concept.name}"`,
      p.period,
      Number(p.amount).toFixed(2),
      p.paymentMethod,
      `"${p.collectedBy.fullName}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private styleHeaderRow(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' }, // Esmeralda institucional
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  }
}
