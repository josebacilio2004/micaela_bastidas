const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatPeriodDate(date, id, prefix) {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const monthName = MONTH_NAMES[d.getUTCMonth()];
  const shortId = id.slice(0, 8);
  return `${day}/${month}/${year} (${monthName} ${year}) - ${prefix}-${shortId}`;
}

async function main() {
  console.log('--- 1. ACTUALIZANDO PERÍODOS DE MULTAS DE ASAMBLEAS Y FAENAS ---');

  // A. Actualizar multas de reuniones existentes
  const meetings = await prisma.meeting.findMany();
  for (const m of meetings) {
    const shortId = m.id.slice(0, 8);
    const newPeriodFalta = formatPeriodDate(m.date, m.id, 'FALTA');
    const newPeriodTard = formatPeriodDate(m.date, m.id, 'TARD');

    // Actualizar obligaciones que tengan el formato antiguo FALTA-{shortId}
    const updatedObs = await prisma.paymentObligation.updateMany({
      where: {
        period: `FALTA-${shortId}`,
      },
      data: {
        period: newPeriodFalta,
      },
    });
    console.log(`Reunión "${m.title}" (${m.date.toISOString().slice(0, 10)}): actualizadas ${updatedObs.count} obligaciones FALTA a "${newPeriodFalta}"`);

    const updatedTard = await prisma.paymentObligation.updateMany({
      where: {
        period: `TARD-${shortId}`,
      },
      data: {
        period: newPeriodTard,
      },
    });
    if (updatedTard.count > 0) {
      console.log(`Reunión "${m.title}": actualizadas ${updatedTard.count} obligaciones TARD a "${newPeriodTard}"`);
    }

    // Actualizar pagos que tengan el período antiguo
    const updatedPayments = await prisma.payment.updateMany({
      where: {
        OR: [
          { period: `FALTA-${shortId}` },
          { period: { contains: `FALTA-${shortId}` } },
        ],
      },
      data: {
        period: newPeriodFalta,
      },
    });
    const meetingObs = await prisma.paymentObligation.findMany({
      where: { period: newPeriodFalta },
      select: { id: true },
    });
    if (meetingObs.length > 0) {
      await prisma.payment.updateMany({
        where: {
          obligationId: { in: meetingObs.map((o) => o.id) },
        },
        data: {
          period: newPeriodFalta,
        },
      });
    }
    if (updatedPayments.count > 0) {
      console.log(`Reunión "${m.title}": actualizados ${updatedPayments.count} pagos a "${newPeriodFalta}"`);
    }
  }

  // B. Actualizar faenas existentes
  const faenas = await prisma.faena.findMany();
  for (const f of faenas) {
    const shortId = f.id.slice(0, 8);
    const newPeriodFaena = formatPeriodDate(f.date, f.id, 'FAENA');

    const updatedFaenaObs = await prisma.paymentObligation.updateMany({
      where: {
        period: `FAENA-${shortId}`,
      },
      data: {
        period: newPeriodFaena,
      },
    });
    console.log(`Faena "${f.title}" (${f.date.toISOString().slice(0, 10)}): actualizadas ${updatedFaenaObs.count} obligaciones a "${newPeriodFaena}"`);

    const updatedFaenaPayments = await prisma.payment.updateMany({
      where: {
        OR: [
          { period: `FAENA-${shortId}` },
          { period: { contains: `FAENA-${shortId}` } },
        ],
      },
      data: {
        period: newPeriodFaena,
      },
    });
    const faenaObs = await prisma.paymentObligation.findMany({
      where: { period: newPeriodFaena },
      select: { id: true },
    });
    if (faenaObs.length > 0) {
      await prisma.payment.updateMany({
        where: {
          obligationId: { in: faenaObs.map((o) => o.id) },
        },
        data: {
          period: newPeriodFaena,
        },
      });
    }
    if (updatedFaenaPayments.count > 0) {
      console.log(`Faena "${f.title}": actualizados ${updatedFaenaPayments.count} pagos a "${newPeriodFaena}"`);
    }
  }

  console.log('--- 2. GENERANDO CONTRATOS Y PUESTOS PARA INQUILINOS DEL PADRÓN ---');

  const inquilinoType = await prisma.merchantType.findFirst({
    where: { code: 'INQUILINO' },
  });

  if (inquilinoType) {
    const inquilinos = await prisma.merchant.findMany({
      where: { merchantTypeId: inquilinoType.id },
      include: { stall: true },
    });

    const defaultRents = {
      '40123001': { rent: 170.0, stall: 'INQ-01', cat: 'Abarrotes y Varios' },
      '40123002': { rent: 170.0, stall: 'INQ-02', cat: 'Verduras y Frutas' },
      '40123003': { rent: 170.0, stall: 'INQ-03', cat: 'Comercio General' },
      '40123004': { rent: 200.0, stall: 'INQ-04', cat: 'Carnicería / Aves' },
      '40123005': { rent: 400.0, stall: 'INQ-05', cat: 'Abarrotes Mayorista' },
      '40123006': { rent: 400.0, stall: 'INQ-06', cat: 'Distribuidora Comercial' },
      '40123007': { rent: 180.0, stall: 'INQ-07', cat: 'Comidas y Bebidas' },
      '40123008': { rent: 150.0, stall: 'INQ-08', cat: 'Bazar y Plásticos' },
    };

    // Asegurar sector de Inquilinos
    let inquilinoSector = await prisma.sector.findFirst({
      where: { code: 'SEC-INQ' },
    });
    if (!inquilinoSector) {
      inquilinoSector = await prisma.sector.create({
        data: {
          code: 'SEC-INQ',
          name: 'Sector Módulos e Inquilinos Arrendatarios',
          description: 'Puestos y módulos en régimen de alquiler comercial',
        },
      });
    }

    let contractIndex = await prisma.stallRentalContract.count();

    for (const inq of inquilinos) {
      const conf = defaultRents[inq.dni] || { rent: 170.0, stall: `INQ-${inq.id.slice(-2)}`, cat: inq.businessCategory || 'Comercio General' };

      // Asegurar puesto
      let stall = await prisma.marketStall.findUnique({
        where: { code: conf.stall },
      });
      if (!stall) {
        stall = await prisma.marketStall.create({
          data: {
            code: conf.stall,
            sectorId: inquilinoSector.id,
            status: 'OCUPADO',
            observations: `Puesto arrendado a ${inq.lastName} ${inq.firstName}`,
          },
        });
      } else {
        await prisma.marketStall.update({
          where: { id: stall.id },
          data: { status: 'OCUPADO', observations: `Puesto arrendado a ${inq.lastName} ${inq.firstName}` },
        });
      }

      // Asignar puesto al comerciante
      await prisma.merchant.update({
        where: { id: inq.id },
        data: { stallId: stall.id, businessCategory: conf.cat },
      });

      // Verificar si ya tiene contrato
      const existingContract = await prisma.stallRentalContract.findFirst({
        where: {
          OR: [
            { merchantId: inq.id },
            { tenantDni: inq.dni },
          ],
        },
      });

      if (!existingContract) {
        contractIndex++;
        const contractNumber = 'ALQ-' + String(contractIndex).padStart(5, '0');
        const startDate = new Date('2026-01-01T12:00:00.000Z');
        const months = 6;
        const rent = conf.rent;
        const totalAmount = rent * months;
        const endDate = new Date('2026-07-01T12:00:00.000Z');

        const newContract = await prisma.stallRentalContract.create({
          data: {
            contractNumber,
            stallId: stall.id,
            stallCode: stall.code,
            sectorCode: inquilinoSector.code,
            tenantName: `${inq.lastName} ${inq.firstName}`.trim(),
            tenantDni: inq.dni,
            tenantPhone: inq.phone || '987654321',
            businessCategory: conf.cat,
            merchantId: inq.id,
            startDate,
            endDate,
            monthsCount: months,
            monthlyRent: rent,
            interestRate: 0,
            totalAmount,
            depositAmount: rent,
            status: 'ACTIVO',
            notes: 'Contrato vigente sincronizado con Padrón de Comerciantes',
          },
        });

        // Cronograma de 6 meses
        for (let i = 1; i <= months; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(startDate.getMonth() + i - 1);

          await prisma.stallRentalInstallment.create({
            data: {
              contractId: newContract.id,
              installmentNumber: i,
              dueDate,
              rentAmount: rent,
              interestAmount: 0,
              totalAmount: rent,
              status: i <= 2 ? 'PAGADO' : 'PENDIENTE',
              paidAt: i <= 2 ? new Date(dueDate) : null,
              receiptNumber: i <= 2 ? `REC-ALQ-20260${i}-${String(contractIndex).padStart(3, '0')}` : null,
              paymentMethod: 'EFECTIVO',
            },
          });
        }
        console.log(`Contrato ${contractNumber} creado para inquilino ${inq.lastName} ${inq.firstName} (Puesto: ${stall.code}, Renta: S/ ${rent})`);
      } else {
        console.log(`Inquilino ${inq.lastName} ya cuenta con contrato ${existingContract.contractNumber}`);
      }
    }
  }

  console.log('=== MIGRACIÓN Y SINCRONIZACIÓN EXITOSA ===');
}

main()
  .catch((e) => {
    console.error('Error en migración:', e);
  })
  .finally(() => prisma.$disconnect());
