import { Test, TestingModule } from '@nestjs/testing';
import { SanitaryServicesService } from './sanitary-services.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('SanitaryServicesService', () => {
  let service: SanitaryServicesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      sanitaryServiceSession: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ticket: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanitaryServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SanitaryServicesService>(SanitaryServicesService);
  });

  it('should compute totals correctly on updateCounts', async () => {
    prisma.sanitaryServiceSession.findUnique.mockResolvedValue({
      id: 's1',
      status: 'ABIERTO',
      urinalCount: 10,
      urinalPrice: 0.50,
      toiletCount: 5,
      toiletPrice: 1.00,
    });

    prisma.sanitaryServiceSession.update.mockImplementation((args: any) => args.data);

    const updated = await service.updateCounts('s1', { urinalDelta: 2, toiletDelta: 3 });
    // 12 * 0.50 = 6.00, 8 * 1.00 = 8.00 => total 14.00
    expect(updated.urinalCount).toBe(12);
    expect(updated.toiletCount).toBe(8);
    expect(updated.totalCollected).toBe(14);
  });

  it('should require discrepancy reason if tickets do not match calculated', async () => {
    prisma.sanitaryServiceSession.findUnique.mockResolvedValue({
      id: 's1',
      status: 'ABIERTO',
      totalCollected: 50.00,
    });

    // initial 100, final 120 => calculated = 21 tickets
    // declared = 20 tickets => discrepancy = -1
    // without reason, must throw BadRequestException
    await expect(
      service.closeSession('s1', {
        initialTicketNumber: 100,
        finalTicketNumber: 120,
        declaredTicketCount: 20,
      }, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });
});
