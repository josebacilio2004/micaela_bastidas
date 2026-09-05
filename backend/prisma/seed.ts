import { PrismaClient, RoleType, MerchantTypeEnum, StallStatus, MerchantStatus, Periodicity, ObligationStatus, PaymentMethod, CashRegisterStatus, CashMovementType, SessionStatus, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING MERCADO DE ABASTOS MICAELA BASTIDAS ---');

  // 1. Roles
  const roles = [
    { name: RoleType.ADMINISTRADOR, description: 'Acceso total al sistema y configuraciones' },
    { name: RoleType.TESORERA, description: 'Gestión de padrón, cobros, caja y arqueos' },
    { name: RoleType.SERVICIOS_HIGIENICOS, description: 'Operación de turnos de servicios y control de tickets' },
    { name: RoleType.CONSULTA, description: 'Visualización de reportes e informes sin permisos de edición' },
  ];

  const createdRoles: Record<string, any> = {};
  for (const r of roles) {
    createdRoles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }
  console.log('✓ Roles creados');

  // 2. Users
  const passwordHash = await bcrypt.hash('Micaela2026!', 10);
  const users = [
    {
      username: 'admin',
      email: 'admin@micaelabastidas.pe',
      fullName: 'Carlos Morales Mendoza',
      phone: '987654321',
      role: RoleType.ADMINISTRADOR,
    },
    {
      username: 'tesorera',
      email: 'tesoreria@micaelabastidas.pe',
      fullName: 'María Elena Quispe Rojas',
      phone: '984123456',
      role: RoleType.TESORERA,
    },
    {
      username: 'sshh_operador',
      email: 'sshh@micaelabastidas.pe',
      fullName: 'Jorge Huamán Ramos',
      phone: '976543210',
      role: RoleType.SERVICIOS_HIGIENICOS,
    },
    {
      username: 'consulta',
      email: 'auditoria@micaelabastidas.pe',
      fullName: 'Lucía Fernández Castro',
      phone: '951234567',
      role: RoleType.CONSULTA,
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash },
      create: {
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        passwordHash,
      },
    });
    createdUsers[u.username] = user;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: createdRoles[u.role].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: createdRoles[u.role].id,
      },
    });
  }
  console.log('✓ Usuarios y asignación de roles completados');

  // 3. Merchant Types
  const merchantTypes = [
    { code: MerchantTypeEnum.SOCIO, name: 'Socio Titular', description: 'Comerciante titular socio del mercado con puesto asignado' },
    { code: MerchantTypeEnum.AMBULANTE_FIJO, name: 'Ambulante Fijo', description: 'Comerciante con espacio regular asignado en pasajes autorizados' },
    { code: MerchantTypeEnum.AMBULANTE_TEMPORAL, name: 'Ambulante Temporal', description: 'Comerciante rotativo o de días de feria' },
  ];
  const createdTypes: Record<string, any> = {};
  for (const mt of merchantTypes) {
    createdTypes[mt.code] = await prisma.merchantType.upsert({
      where: { code: mt.code },
      update: {},
      create: mt,
    });
  }

  // 4. Sectors
  const sectors = [
    { code: 'SEC-A', name: 'Sector Carnes y Pescados', description: 'Pabellón A: Venta de carnes rojas, aves y pescados' },
    { code: 'SEC-B', name: 'Sector Frutas y Verduras', description: 'Pabellón B: Frutas frescas y hortalizas' },
    { code: 'SEC-C', name: 'Sector Abarrotes y Granos', description: 'Pabellón C: Víveres, lácteos y productos secos' },
    { code: 'SEC-D', name: 'Sector Comidas y Jugos', description: 'Pabellón D: Puestos de comida preparada' },
    { code: 'SEC-AMB', name: 'Zona Ambulatoria Externa', description: 'Pasajes perimétricos y explanada exterior' },
  ];
  const createdSectors: Record<string, any> = {};
  for (const s of sectors) {
    createdSectors[s.code] = await prisma.sector.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  // 5. Market Stalls
  const stallsData = [
    { code: 'P-A01', sector: 'SEC-A', locationDescription: 'Frente al ingreso principal pasaje A' },
    { code: 'P-A02', sector: 'SEC-A', locationDescription: 'Pasaje A puesto 2' },
    { code: 'P-A03', sector: 'SEC-A', locationDescription: 'Pasaje A puesto 3' },
    { code: 'P-B01', sector: 'SEC-B', locationDescription: 'Pasaje central verduras puesto 1' },
    { code: 'P-B02', sector: 'SEC-B', locationDescription: 'Pasaje central verduras puesto 2' },
    { code: 'P-B03', sector: 'SEC-B', locationDescription: 'Pasaje central frutas puesto 3' },
    { code: 'P-C01', sector: 'SEC-C', locationDescription: 'Pasaje abarrotes tienda 1' },
    { code: 'P-C02', sector: 'SEC-C', locationDescription: 'Pasaje abarrotes tienda 2' },
    { code: 'P-D01', sector: 'SEC-D', locationDescription: 'Módulo de comida 1' },
    { code: 'P-D02', sector: 'SEC-D', locationDescription: 'Módulo de juguería 2' },
  ];
  const createdStalls: Record<string, any> = {};
  for (const st of stallsData) {
    createdStalls[st.code] = await prisma.marketStall.upsert({
      where: { code: st.code },
      update: {},
      create: {
        code: st.code,
        sectorId: createdSectors[st.sector].id,
        locationDescription: st.locationDescription,
        status: StallStatus.OCUPADO,
      },
    });
  }
  console.log('✓ Sectores y Puestos creados');

  // 6. Payment Concepts
  const concepts = [
    { code: 'ALCABALA', name: 'Alcabala / Derecho de Puesto', periodicity: Periodicity.MENSUAL, description: 'Cuota de mantenimiento y ocupación del puesto o espacio' },
    { code: 'AGUA', name: 'Servicio de Agua Potable', periodicity: Periodicity.MENSUAL, description: 'Consumo y mantenimiento de redes sanitarias de agua' },
    { code: 'MICCIONARIO', name: 'Uso de Miccionario', periodicity: Periodicity.POR_USO, description: 'Uso de urinario en servicios higiénicos' },
    { code: 'RETRETE', name: 'Uso de Retrete', periodicity: Periodicity.POR_USO, description: 'Uso de inodoro/retrete en servicios higiénicos' },
  ];
  const createdConcepts: Record<string, any> = {};
  for (const c of concepts) {
    createdConcepts[c.code] = await prisma.paymentConcept.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // 7. Rates
  const ratesData = [
    // Alcabala
    { concept: 'ALCABALA', type: MerchantTypeEnum.SOCIO, amount: 10.00 },
    { concept: 'ALCABALA', type: MerchantTypeEnum.AMBULANTE_FIJO, amount: 3.00 },
    { concept: 'ALCABALA', type: MerchantTypeEnum.AMBULANTE_TEMPORAL, amount: 3.00 },
    // Agua
    { concept: 'AGUA', type: MerchantTypeEnum.SOCIO, amount: 6.00 },
    { concept: 'AGUA', type: MerchantTypeEnum.AMBULANTE_FIJO, amount: 3.00 },
    // SSHH
    { concept: 'MICCIONARIO', type: null, amount: 0.50 },
    { concept: 'RETRETE', type: null, amount: 1.00 },
  ];
  for (const r of ratesData) {
    const conceptId = createdConcepts[r.concept].id;
    const typeId = r.type ? createdTypes[r.type].id : null;
    const existing = await prisma.rate.findFirst({
      where: {
        conceptId,
        merchantTypeId: typeId,
        isActive: true,
      },
    });
    if (!existing) {
      await prisma.rate.create({
        data: {
          conceptId,
          merchantTypeId: typeId,
          amount: r.amount,
          currency: 'PEN',
          startDate: new Date('2026-01-01'),
          isActive: true,
        },
      });
    }
  }
  console.log('✓ Conceptos y Tarifas configuradas');

  // 8. Merchants
  const merchantsData = [
    {
      internalCode: 'MB-COM-00001',
      firstName: 'Juan',
      lastName: 'Pérez Mamani',
      dni: '45891234',
      phone: '951753951',
      type: MerchantTypeEnum.SOCIO,
      stallCode: 'P-A01',
      sectorCode: 'SEC-A',
      businessCategory: 'Carnes de Res y Cerdo',
    },
    {
      internalCode: 'MB-COM-00002',
      firstName: 'Rosa',
      lastName: 'Gutiérrez Salazar',
      dni: '41235678',
      phone: '987321654',
      type: MerchantTypeEnum.SOCIO,
      stallCode: 'P-A02',
      sectorCode: 'SEC-A',
      businessCategory: 'Pollería y Aves',
    },
    {
      internalCode: 'MB-COM-00003',
      firstName: 'Pedro',
      lastName: 'Flores Condori',
      dni: '47852369',
      phone: '945612378',
      type: MerchantTypeEnum.SOCIO,
      stallCode: 'P-B01',
      sectorCode: 'SEC-B',
      businessCategory: 'Verduras y Tubérculos',
    },
    {
      internalCode: 'MB-COM-00004',
      firstName: 'Ana',
      lastName: 'Torres Quispe',
      dni: '43698521',
      phone: '978456123',
      type: MerchantTypeEnum.SOCIO,
      stallCode: 'P-B02',
      sectorCode: 'SEC-B',
      businessCategory: 'Frutas de Estación',
    },
    {
      internalCode: 'MB-COM-00005',
      firstName: 'Manuel',
      lastName: 'Castillo Vega',
      dni: '46321458',
      phone: '912345678',
      type: MerchantTypeEnum.SOCIO,
      stallCode: 'P-C01',
      sectorCode: 'SEC-C',
      businessCategory: 'Abarrotes en General',
    },
    {
      internalCode: 'MB-COM-00006',
      firstName: 'Doris',
      lastName: 'Mendoza Luque',
      dni: '49874512',
      phone: '998877665',
      type: MerchantTypeEnum.AMBULANTE_FIJO,
      stallCode: null,
      sectorCode: 'SEC-AMB',
      businessCategory: 'Hierbas y Especias',
    },
    {
      internalCode: 'MB-COM-00007',
      firstName: 'Segundo',
      lastName: 'Villanueva Díaz',
      dni: '42145698',
      phone: '965412389',
      type: MerchantTypeEnum.AMBULANTE_FIJO,
      stallCode: null,
      sectorCode: 'SEC-AMB',
      businessCategory: 'Bolsas y Plásticos',
    },
    {
      internalCode: 'MB-COM-00008',
      firstName: 'Gladys',
      lastName: 'Chávez Espinoza',
      dni: '48751236',
      phone: '932145698',
      type: MerchantTypeEnum.AMBULANTE_TEMPORAL,
      stallCode: null,
      sectorCode: 'SEC-AMB',
      businessCategory: 'Flores y Plantas',
    },
  ];

  const createdMerchants: Record<string, any> = {};
  for (const m of merchantsData) {
    const stallId = m.stallCode ? createdStalls[m.stallCode].id : null;
    const merchant = await prisma.merchant.upsert({
      where: { dni: m.dni },
      update: {},
      create: {
        internalCode: m.internalCode,
        qrCode: 'MB-QR-' + m.internalCode,
        firstName: m.firstName,
        lastName: m.lastName,
        dni: m.dni,
        phone: m.phone,
        merchantTypeId: createdTypes[m.type].id,
        sectorId: createdSectors[m.sectorCode].id,
        stallId: stallId,
        businessCategory: m.businessCategory,
        status: MerchantStatus.ACTIVO,
      },
    });
    createdMerchants[m.internalCode] = merchant;

    if (stallId) {
      await prisma.marketStall.update({
        where: { id: stallId },
        data: {
          status: StallStatus.OCUPADO,
          assignedAt: new Date(),
        },
      });
    }
  }
  console.log('✓ Comerciantes registrados y puestos asignados');

  // 9. Caja inicial de Tesorería (Abierta para hoy)
  const tesoreraUser = createdUsers['tesorera'];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const cashRegister = await prisma.cashRegister.create({
    data: {
      name: `Caja Principal Tesorería - ${todayStr}`,
      openedById: tesoreraUser.id,
      openingAmount: 150.00,
      openedAt: new Date(today.setHours(7, 30, 0, 0)),
      status: CashRegisterStatus.ABIERTO,
    },
  });

  // 10. Payment Obligations for Current Month (2026-09)
  const currentPeriod = '2026-09';
  const dueDate = new Date('2026-09-30T23:59:59');

  for (const m of merchantsData) {
    const merchant = createdMerchants[m.internalCode];
    if (m.type === MerchantTypeEnum.SOCIO) {
      // Alcabala S/ 10
      await prisma.paymentObligation.upsert({
        where: {
          merchantId_conceptId_period: {
            merchantId: merchant.id,
            conceptId: createdConcepts['ALCABALA'].id,
            period: currentPeriod,
          },
        },
        update: {},
        create: {
          merchantId: merchant.id,
          conceptId: createdConcepts['ALCABALA'].id,
          period: currentPeriod,
          year: 2026,
          month: 9,
          dueDate,
          amount: 10.00,
          status: ObligationStatus.PENDIENTE,
        },
      });

      // Agua S/ 6
      await prisma.paymentObligation.upsert({
        where: {
          merchantId_conceptId_period: {
            merchantId: merchant.id,
            conceptId: createdConcepts['AGUA'].id,
            period: currentPeriod,
          },
        },
        update: {},
        create: {
          merchantId: merchant.id,
          conceptId: createdConcepts['AGUA'].id,
          period: currentPeriod,
          year: 2026,
          month: 9,
          dueDate,
          amount: 6.00,
          status: ObligationStatus.PENDIENTE,
        },
      });
    } else if (m.type === MerchantTypeEnum.AMBULANTE_FIJO) {
      // Agua mensual ambulante S/ 3
      await prisma.paymentObligation.upsert({
        where: {
          merchantId_conceptId_period: {
            merchantId: merchant.id,
            conceptId: createdConcepts['AGUA'].id,
            period: currentPeriod,
          },
        },
        update: {},
        create: {
          merchantId: merchant.id,
          conceptId: createdConcepts['AGUA'].id,
          period: currentPeriod,
          year: 2026,
          month: 9,
          dueDate,
          amount: 3.00,
          status: ObligationStatus.PENDIENTE,
        },
      });
    }
  }
  console.log('✓ Obligaciones de pago mensuales generadas');

  // 11. Registrar algunos pagos de ejemplo (Juan Pérez pagó Alcabala y Agua)
  const juanPerez = createdMerchants['MB-COM-00001'];
  const alcabalaObligationJuan = await prisma.paymentObligation.findUnique({
    where: {
      merchantId_conceptId_period: {
        merchantId: juanPerez.id,
        conceptId: createdConcepts['ALCABALA'].id,
        period: currentPeriod,
      },
    },
  });

  if (alcabalaObligationJuan) {
    const payment = await prisma.payment.create({
      data: {
        operationNumber: 'MB-20260904-00001',
        merchantId: juanPerez.id,
        conceptId: createdConcepts['ALCABALA'].id,
        obligationId: alcabalaObligationJuan.id,
        amount: 10.00,
        period: currentPeriod,
        paymentMethod: PaymentMethod.EFECTIVO,
        cashRegisterId: cashRegister.id,
        collectedById: tesoreraUser.id,
        notes: 'Pago puntual Alcabala Septiembre',
      },
    });

    await prisma.paymentObligation.update({
      where: { id: alcabalaObligationJuan.id },
      data: {
        status: ObligationStatus.PAGADO,
        paidAt: new Date(),
      },
    });
  }

  // 12. Sesión de Servicios Higiénicos de prueba
  const sshhUser = createdUsers['sshh_operador'];
  const session = await prisma.sanitaryServiceSession.create({
    data: {
      operatorId: sshhUser.id,
      cashRegisterId: cashRegister.id,
      startTime: new Date(today.setHours(6, 0, 0, 0)),
      urinalCount: 30, // 30 x 0.50 = 15.00
      urinalPrice: 0.50,
      urinalTotal: 15.00,
      toiletCount: 45, // 45 x 1.00 = 45.00
      toiletPrice: 1.00,
      toiletTotal: 45.00,
      totalCollected: 60.00,
      initialTicketNumber: 501,
      finalTicketNumber: 575,
      declaredTicketCount: 75,
      calculatedTicketCount: 75,
      ticketDiscrepancy: 0,
      status: SessionStatus.ABIERTO,
      notes: 'Turno mañana sin incidentes',
    },
  });

  await prisma.ticket.create({
    data: {
      sessionId: session.id,
      startNumber: 501,
      endNumber: 575,
      totalIssued: 75,
      unitPrice: 1.00,
      totalAmount: 60.00,
      status: TicketStatus.VERIFICADO,
    },
  });
  console.log('✓ Sesión y control de tickets de servicios higiénicos inicializada');

  // 13. System Settings
  const settings = [
    { key: 'MARKET_NAME', value: 'Mercado de Abastos Micaela Bastidas', description: 'Nombre oficial de la institución' },
    { key: 'CURRENCY', value: 'PEN', description: 'Moneda oficial (Soles)' },
    { key: 'ALLOW_PARTIAL_PAYMENTS', value: 'false', description: 'Permitir pagos fraccionados' },
    { key: 'REQUIRE_TICKET_VALIDATION', value: 'true', description: 'Exigir validación de tickets en turnos SSHH' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✓ Configuraciones del sistema guardadas');
  
  // 14. Dispositivos Autorizados (Móviles)
  const tesoreraDev = await prisma.device.upsert({
    where: { deviceId: 'DEV-ANDROID-TESORERIA-01' },
    update: {},
    create: {
      deviceId: 'DEV-ANDROID-TESORERIA-01',
      name: 'Tablet Samsung Galaxy - Tesorería',
      userId: tesoreraUser.id,
      os: 'Android 14',
      appVersion: '1.2.0',
      lastSyncAt: new Date(),
    },
  });

  const sshhDev = await prisma.device.upsert({
    where: { deviceId: 'DEV-ANDROID-SSHH-01' },
    update: {},
    create: {
      deviceId: 'DEV-ANDROID-SSHH-01',
      name: 'Móvil Android - Operador SSHH',
      userId: createdUsers['sshh_operador'].id,
      os: 'Android 13',
      appVersion: '1.2.0',
      lastSyncAt: new Date(),
    },
  });
  console.log('✓ Dispositivos móviles registrados');

  // 15. Reuniones y Asistencia
  const meeting = await prisma.meeting.upsert({
    where: { id: 'meeting-asamblea-sep-2026' },
    update: {},
    create: {
      id: 'meeting-asamblea-sep-2026',
      title: 'Asamblea General Ordinaria de Socios - Septiembre 2026',
      date: new Date('2026-09-04'),
      time: '18:00',
      location: 'Auditorio Central del Mercado',
      description: 'Aprobación de balances, informe de recaudación y mantenimiento de techos',
      status: 'EN_CURSO',
      createdById: createdUsers['admin'].id,
    },
  });

  // Asistencias iniciales de Juan Pérez y Rosa Gutiérrez
  await prisma.attendanceEvent.upsert({
    where: {
      meetingId_merchantId: {
        meetingId: meeting.id,
        merchantId: createdMerchants['MB-COM-00001'].id,
      },
    },
    update: {},
    create: {
      meetingId: meeting.id,
      merchantId: createdMerchants['MB-COM-00001'].id,
      dni: '45891234',
      deviceId: tesoreraDev.deviceId,
      registeredById: tesoreraUser.id,
      idempotencyKey: 'att-juan-perez-sep2026',
      scannedAt: new Date('2026-09-04T18:05:00Z'),
    },
  });

  await prisma.attendanceEvent.upsert({
    where: {
      meetingId_merchantId: {
        meetingId: meeting.id,
        merchantId: createdMerchants['MB-COM-00002'].id,
      },
    },
    update: {},
    create: {
      meetingId: meeting.id,
      merchantId: createdMerchants['MB-COM-00002'].id,
      dni: '41235678',
      deviceId: tesoreraDev.deviceId,
      registeredById: tesoreraUser.id,
      idempotencyKey: 'att-rosa-gutierrez-sep2026',
      scannedAt: new Date('2026-09-04T18:12:00Z'),
    },
  });
  console.log('✓ Asamblea General y Asistencias iniciales configuradas');

  console.log('--- SEED COMPLETADO SATISFACTORIAMENTE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
