import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      meeting: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', title: 'Asamblea Demo' }),
      },
      merchant: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'merc-1',
          dni: '45891234',
          qrCode: 'MB-QR-COM-00001',
          stall: { code: 'P-A01' },
        }),
        count: jest.fn().mockResolvedValue(100),
      },
      attendanceEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
  });

  it('should prevent duplicate attendance registration for the same meeting', async () => {
    // Simulate already attended
    prisma.attendanceEvent.findUnique.mockResolvedValue({
      id: 'att-1',
      scannedAt: new Date(),
    });

    await expect(
      service.registerAttendance('m1', {
        merchantIdentifier: 'MB-QR-COM-00001',
        idempotencyKey: 'idem-att-1',
      }, 'u-1'),
    ).rejects.toThrow(ConflictException);
  });
});
