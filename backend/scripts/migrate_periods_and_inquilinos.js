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

const officialInquilinos = [
  { code: 'MB-INQ-00001', name: 'HUATARUNCO CHUQUILLANQUI BETZABE', dni: '40123001', rent: 170.00, stall: 'INQ-01', cat: 'Abarrotes y Varios' },
  { code: 'MB-INQ-00002', name: 'MACHA CASALLO EDWIN', dni: '40123002', rent: 170.00, stall: 'INQ-02', cat: 'Verduras y Frutas' },
  { code: 'MB-INQ-00003', name: 'GONZALO ASTO ROCIO', dni: '40123003', rent: 170.00, stall: 'INQ-03', cat: 'Comercio General' },
  { code: 'MB-INQ-00004', name: 'OSCANOA RAMOS GINA PILAR', dni: '40123004', rent: 200.00, stall: 'INQ-04', cat: 'Carnicería / Aves' },
  { code: 'MB-INQ-00005', name: 'SALVATIERRA HUAMANI EDGAR', dni: '40123005', rent: 400.00, stall: 'INQ-05', cat: 'Abarrotes Mayorista' },
  { code: 'MB-INQ-00006', name: 'QUISPE QUISPE JUAN', dni: '40123006', rent: 400.00, stall: 'INQ-06', cat: 'Distribuidora Comercial' },
  { code: 'MB-INQ-00007', name: 'MUÑOZ CARDENAS JAVIER', dni: '40123007', rent: 180.00, stall: 'INQ-07', cat: 'Comidas y Bebidas' },
  { code: 'MB-INQ-00008', name: 'MIRANDA SOTO VICTORIA', dni: '40123008', rent: 150.00, stall: 'INQ-08', cat: 'Bazar y Plásticos' },
];

const officialAmbulantesFijos = [
  { code: 'MB-AF-00001', name: 'JUAN HUAMAN', cat: 'COMIDA' },
  { code: 'MB-AF-00002', name: 'MARITZA CALIXTO', cat: 'COMIDA' },
  { code: 'MB-AF-00003', name: 'ALBINA CARBAJAL', cat: 'FRUTA' },
  { code: 'MB-AF-00004', name: 'MARTHA HUAMAN', cat: 'COMIDA' },
  { code: 'MB-AF-00005', name: 'MARGARITA QUISPE', cat: 'COMIDA' },
  { code: 'MB-AF-00006', name: 'ELSA PALOMINO', cat: 'COMIDA' },
  { code: 'MB-AF-00007', name: 'ALFONSO DE LA CRUZ', cat: 'COMIDA' },
  { code: 'MB-AF-00008', name: 'GLADYS VILLANUEVA', cat: 'COMIDA' },
  { code: 'MB-AF-00009', name: 'FREDY HUAMAN', cat: 'CARNE' },
  { code: 'MB-AF-00010', name: 'MARINA VILCAPOMA', cat: 'CARNE' },
  { code: 'MB-AF-00011', name: 'MARIA PAQUIYAURI', cat: 'VARIOS' },
  { code: 'MB-AF-00012', name: 'YOVANA ROJAS', cat: 'CARNE' },
  { code: 'MB-AF-00013', name: 'EUGENIA ROJAS', cat: 'CARNE' },
  { code: 'MB-AF-00014', name: 'LIDIA CHUPURGO', cat: 'CARNE' },
  { code: 'MB-AF-00015', name: 'DELIA TAIPE', cat: 'CARNE' },
  { code: 'MB-AF-00016', name: 'PABLO CORDOVA', cat: 'VERDURA' },
  { code: 'MB-AF-00017', name: 'EVA ROJAS', cat: 'VARIOS' },
  { code: 'MB-AF-00018', name: 'HILDA HUARI', cat: 'OTROS' },
  { code: 'MB-AF-00019', name: 'VICTORIA ASTO', cat: 'OTROS' },
  { code: 'MB-AF-00020', name: 'TEOFILA SUAZO', cat: 'PAPA' },
  { code: 'MB-AF-00021', name: 'ISABEL SEDANO', cat: 'PAPA' },
  { code: 'MB-AF-00022', name: 'LOURDES CASTILLON', cat: 'PAPA' },
  { code: 'MB-AF-00023', name: 'MILA HILARIO', cat: 'PAPA' },
  { code: 'MB-AF-00024', name: 'MAXIMO HILARIO', cat: 'PAPA' },
  { code: 'MB-AF-00025', name: 'ALEJANDRO PARI', cat: 'PAPA' },
  { code: 'MB-AF-00026', name: 'DONATA PARI', cat: 'PAPA' },
  { code: 'MB-AF-00027', name: 'JESUS PARI', cat: 'PAPA' },
  { code: 'MB-AF-00028', name: 'HAYDEE QUISPE', cat: 'PAPA' },
  { code: 'MB-AF-00029', name: 'SONIA ROJAS', cat: 'PAPA' },
  { code: 'MB-AF-00030', name: 'JULIA LAURA', cat: 'PAPA' },
  { code: 'MB-AF-00031', name: 'DINA MENDOZA', cat: 'PAPA' },
  { code: 'MB-AF-00032', name: 'LIDIA PARIONA', cat: 'PAPA' },
  { code: 'MB-AF-00033', name: 'ELVIRA ROJAS', cat: 'PAPA' },
  { code: 'MB-AF-00034', name: 'FORTUNATA ROJAS', cat: 'PAPA' },
];

async function main() {
  console.log('================================================================');
  console.log('--- MIGRACIÓN INTEGRAL: TIPOS, SECTORES, INQUILINOS Y AMBULANTES ---');
  console.log('================================================================');

  // 1. ASEGURAR TIPOS DE COMERCIANTE
  console.log('--> 1. Verificando Tipos de Comerciantes...');
  const merchantTypes = [
    { code: 'SOCIO', name: 'Socio Titular', description: 'Comerciante socio del mercado con derecho estatutario y puesto asignado' },
    { code: 'INQUILINO', name: 'Inquilino', description: 'Arrendatario de puesto comercial o módulo del mercado' },
    { code: 'AMBULANTE_FIJO', name: 'Ambulante Fijo', description: 'Comerciante con espacio regular asignado en pasajes autorizados' },
    { code: 'AMBULANTE_TEMPORAL', name: 'Ambulante Temporal', description: 'Comerciante rotativo o de días de feria' },
  ];
  const typeMap = {};
  for (const mt of merchantTypes) {
    const upserted = await prisma.merchantType.upsert({
      where: { code: mt.code },
      update: { name: mt.name, description: mt.description },
      create: mt,
    });
    typeMap[mt.code] = upserted;
  }
  console.log('✓ Tipos de comerciantes asegurados:', Object.keys(typeMap).join(', '));

  // 2. ASEGURAR SECTORES
  console.log('--> 2. Verificando Sectores del Mercado...');
  const sectors = [
    { code: 'SEC-A', name: 'Sector Pabellón A (Carnes y Pescados)', description: 'Puestos interiores de carnicería y aves' },
    { code: 'SEC-B', name: 'Sector Pabellón B (Frutas, Verduras y Abarrotes)', description: 'Puestos interiores de abarrotes y verduras' },
    { code: 'SEC-C', name: 'Sector Pasajes / Ambulantes Fijos', description: 'Pasajes autorizados de comercio ambulatorio regular' },
    { code: 'SEC-INQ', name: 'Sector Módulos e Inquilinos Arrendatarios', description: 'Puestos y módulos en régimen de alquiler comercial' },
    { code: 'SEC-AMB', name: 'Sector Ambulantes Temporales', description: 'Área perimétrica y días de feria' },
  ];
  const sectorMap = {};
  for (const s of sectors) {
    const upserted = await prisma.sector.upsert({
      where: { code: s.code },
      update: { name: s.name, description: s.description },
      create: s,
    });
    sectorMap[s.code] = upserted;
  }
  console.log('✓ Sectores asegurados:', Object.keys(sectorMap).join(', '));

  // 3. ASEGURAR CONCEPTOS DE PAGO CLAVE
  console.log('--> 3. Verificando Conceptos de Pago...');
  const concepts = [
    { code: 'ALQUILER_INQUILINO', name: 'Alquiler de Puesto (Inquilinos)', periodicity: 'MENSUAL', description: 'Canon de arrendamiento para inquilinos del mercado' },
    { code: 'AGUA_INQUILINO', name: 'Agua Potable Inquilinos', periodicity: 'MENSUAL', description: 'Consumo de agua para puestos de inquilinos' },
    { code: 'ALCABALA', name: 'Alcabala / Derecho de Puesto', periodicity: 'MENSUAL', description: 'Cuota de mantenimiento y ocupación del puesto' },
    { code: 'AGUA', name: 'Servicio de Agua Potable', periodicity: 'MENSUAL', description: 'Consumo y mantenimiento de redes sanitarias' },
    { code: 'MULTA_ASAMBLEA', name: 'Multa por Inasistencia a Asamblea', periodicity: 'POR_USO', description: 'Sanción económica por inasistencia no justificada a asamblea general' },
    { code: 'MULTA_FAENA', name: 'Multa por Inasistencia a Faena', periodicity: 'POR_USO', description: 'Sanción económica por inasistencia a jornada de limpieza o faena comunal' },
  ];
  for (const c of concepts) {
    await prisma.paymentConcept.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  console.log('✓ Conceptos de pago clave asegurados');

  // 4. CARGA Y SINCRONIZACIÓN DE LOS 8 INQUILINOS
  console.log('--> 4. Sincronizando 8 Inquilinos oficiales con el Padrón y Contratos...');
  let contractIndex = await prisma.stallRentalContract.count();

  for (let idx = 0; idx < officialInquilinos.length; idx++) {
    const inq = officialInquilinos[idx];
    const parts = inq.name.trim().split(' ');
    const firstName = parts.slice(2).join(' ') || parts[1] || inq.name;
    const lastName = parts.slice(0, 2).join(' ') || parts[0];

    // Asegurar Puesto
    let stall = await prisma.marketStall.findUnique({
      where: { code: inq.stall },
    });
    if (!stall) {
      stall = await prisma.marketStall.create({
        data: {
          code: inq.stall,
          sectorId: sectorMap['SEC-INQ'].id,
          status: 'OCUPADO',
          observations: `Puesto arrendado a ${inq.name}`,
        },
      });
    } else {
      await prisma.marketStall.update({
        where: { id: stall.id },
        data: { status: 'OCUPADO', observations: `Puesto arrendado a ${inq.name}` },
      });
    }

    // Upsert Comerciante en Merchant
    let merchant = await prisma.merchant.findFirst({
      where: {
        OR: [{ dni: inq.dni }, { internalCode: inq.code }],
      },
    });

    if (merchant) {
      merchant = await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          internalCode: inq.code,
          qrCode: 'MB-QR-' + inq.dni,
          firstName,
          lastName,
          dni: inq.dni,
          merchantTypeId: typeMap['INQUILINO'].id,
          memberCondition: 'NO_APLICA',
          sectorId: sectorMap['SEC-INQ'].id,
          stallId: stall.id,
          businessCategory: inq.cat,
          status: 'ACTIVO',
        },
      });
    } else {
      merchant = await prisma.merchant.create({
        data: {
          internalCode: inq.code,
          qrCode: 'MB-QR-' + inq.dni,
          firstName,
          lastName,
          dni: inq.dni,
          merchantTypeId: typeMap['INQUILINO'].id,
          memberCondition: 'NO_APLICA',
          sectorId: sectorMap['SEC-INQ'].id,
          stallId: stall.id,
          businessCategory: inq.cat,
          status: 'ACTIVO',
        },
      });
    }

    // Asegurar Contrato de Alquiler en StallRentalContract
    const existingContract = await prisma.stallRentalContract.findFirst({
      where: {
        OR: [
          { merchantId: merchant.id },
          { tenantDni: inq.dni },
          { stallId: stall.id },
        ],
      },
    });

    if (!existingContract) {
      contractIndex++;
      const contractNumber = 'ALQ-' + String(contractIndex).padStart(5, '0');
      const startDate = new Date('2026-01-01T12:00:00.000Z');
      const months = 6;
      const rent = inq.rent;
      const totalAmount = rent * months;
      const endDate = new Date('2026-07-01T12:00:00.000Z');

      const newContract = await prisma.stallRentalContract.create({
        data: {
          contractNumber,
          stallId: stall.id,
          stallCode: stall.code,
          sectorCode: sectorMap['SEC-INQ'].code,
          tenantName: `${lastName} ${firstName}`.trim(),
          tenantDni: inq.dni,
          tenantPhone: '987654321',
          businessCategory: inq.cat,
          merchantId: merchant.id,
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

      // Generar 6 cuotas mensuales de cronograma
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
      console.log(`✓ Inquilino "${inq.name}": Creado en Padrón y generado contrato ${contractNumber} (Puesto: ${stall.code}, Renta: S/ ${rent})`);
    } else {
      console.log(`✓ Inquilino "${inq.name}": Registrado en Padrón (Contrato ${existingContract.contractNumber})`);
    }
  }

  // 5. CARGA Y SINCRONIZACIÓN DE LOS 34 AMBULANTES FIJOS
  console.log('--> 5. Sincronizando 34 Ambulantes Fijos con el Padrón de Comerciantes...');
  let afCreatedCount = 0;
  let afUpdatedCount = 0;

  for (let i = 0; i < officialAmbulantesFijos.length; i++) {
    const af = officialAmbulantesFijos[i];
    const dummyDni = (50000000 + i + 1).toString();
    const parts = af.name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || 'Ambulante';

    const existingAf = await prisma.merchant.findFirst({
      where: {
        OR: [{ dni: dummyDni }, { internalCode: af.code }],
      },
    });

    if (existingAf) {
      await prisma.merchant.update({
        where: { id: existingAf.id },
        data: {
          internalCode: af.code,
          qrCode: 'MB-QR-' + dummyDni,
          firstName,
          lastName,
          dni: dummyDni,
          merchantTypeId: typeMap['AMBULANTE_FIJO'].id,
          memberCondition: 'NO_APLICA',
          sectorId: sectorMap['SEC-C'].id,
          businessCategory: af.cat,
          status: 'ACTIVO',
        },
      });
      afUpdatedCount++;
    } else {
      await prisma.merchant.create({
        data: {
          internalCode: af.code,
          qrCode: 'MB-QR-' + dummyDni,
          firstName,
          lastName,
          dni: dummyDni,
          merchantTypeId: typeMap['AMBULANTE_FIJO'].id,
          memberCondition: 'NO_APLICA',
          sectorId: sectorMap['SEC-C'].id,
          businessCategory: af.cat,
          status: 'ACTIVO',
        },
      });
      afCreatedCount++;
    }
  }
  console.log(`✓ 34 Ambulantes Fijos sincronizados: ${afCreatedCount} creados, ${afUpdatedCount} actualizados`);

  // 6. ACTUALIZACIÓN DE FORMATO DE PERÍODOS DE ASAMBLEAS Y FAENAS
  console.log('--> 6. Actualizando períodos de multas de Asambleas y Faenas con fecha y mes exacto...');

  // Asambleas
  const meetings = await prisma.meeting.findMany();
  for (const m of meetings) {
    const shortId = m.id.slice(0, 8);
    const newPeriodFalta = formatPeriodDate(m.date, m.id, 'FALTA');
    const newPeriodTard = formatPeriodDate(m.date, m.id, 'TARD');

    const updatedObs = await prisma.paymentObligation.updateMany({
      where: {
        period: `FALTA-${shortId}`,
      },
      data: {
        period: newPeriodFalta,
      },
    });
    if (updatedObs.count > 0) {
      console.log(`Reunión "${m.title}": actualizadas ${updatedObs.count} obligaciones FALTA a "${newPeriodFalta}"`);
    }

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

  // Faenas
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
    if (updatedFaenaObs.count > 0) {
      console.log(`Faena "${f.title}": actualizadas ${updatedFaenaObs.count} obligaciones a "${newPeriodFaena}"`);
    }

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

  // Resumen final
  const [totalSocios, totalInq, totalAf, totalContracts] = await Promise.all([
    prisma.merchant.count({ where: { merchantType: { code: 'SOCIO' } } }),
    prisma.merchant.count({ where: { merchantType: { code: 'INQUILINO' } } }),
    prisma.merchant.count({ where: { merchantType: { code: 'AMBULANTE_FIJO' } } }),
    prisma.stallRentalContract.count({ where: { status: 'ACTIVO' } }),
  ]);

  console.log('================================================================');
  console.log(`✓ MIGRACIÓN Y SINCRONIZACIÓN EXITOSA:`);
  console.log(`  - Socios Titulares en Padrón: ${totalSocios}`);
  console.log(`  - Inquilinos en Padrón: ${totalInq}`);
  console.log(`  - Contratos de Alquiler Activos: ${totalContracts}`);
  console.log(`  - Ambulantes Fijos en Padrón: ${totalAf}`);
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Error fatal en migración:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
