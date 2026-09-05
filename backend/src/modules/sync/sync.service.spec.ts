import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      device: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', deviceId: 'dev-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      syncBatch: {
        create: jest.fn().mockResolvedValue({ id: 'b1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
      },
      paymentObligation: {
        update: jest.fn(),
      },
      cashRegister: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
      },
      syncOperation: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('should process payment idempotently when already existing', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'p-existing',
      operationNumber: 'MB-20260904-00001',
    });

    const result = await service.pushBatch('dev-1', 'u-1', [
      {
        operationId: 'op-1',
        idempotencyKey: 'idem-1',
        entity: 'payment',
        action: 'CREATE',
        payload: { amount: 10.0 },
      },
    ]);

    expect(result.syncedCount).toBe(1);
    expect(result.results[0].status).toBe('SYNCED');
    expect(result.results[0].serverId).toBe('p-existing');
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});
