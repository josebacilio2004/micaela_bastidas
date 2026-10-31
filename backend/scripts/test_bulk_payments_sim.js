const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBulkPaymentsSim() {
  console.log('Testing bulk payment simulation for 107 socios...');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `MB-${yyyy}${mm}${dd}-`;

  await prisma.$transaction(async (tx) => {
    const lastPaymentToday = await tx.payment.findFirst({
      where: { operationNumber: { startsWith: prefix } },
      orderBy: { operationNumber: 'desc' },
      select: { operationNumber: true },
    });

    let nextSeq = 1;
    if (lastPaymentToday && lastPaymentToday.operationNumber) {
      const parts = lastPaymentToday.operationNumber.split('-');
      const seqNum = parseInt(parts[2], 10);
      if (!isNaN(seqNum) && seqNum >= nextSeq) {
        nextSeq = seqNum + 1;
      }
    }

    console.log(`Initial sequence: ${nextSeq}`);

    const generated = [];
    for (let i = 0; i < 107; i++) {
      let opNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
      nextSeq++;

      while (await tx.payment.findUnique({ where: { operationNumber: opNumber }, select: { id: true } })) {
        opNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
        nextSeq++;
      }
      generated.push(opNumber);
    }

    console.log(`Generated 107 unique operation numbers:`);
    console.log(`First: ${generated[0]}`);
    console.log(`Last: ${generated[106]}`);
    
    // Check for any duplicates in generated array
    const set = new Set(generated);
    if (set.size !== 107) {
      throw new Error(`Duplicate generated! Set size: ${set.size}, Expected: 107`);
    }

    console.log('✓ Success: All 107 operation numbers are 100% unique and collision-free!');
  });

  await prisma.$disconnect();
}

testBulkPaymentsSim().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
