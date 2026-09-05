import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'secret';
              if (key === 'JWT_EXPIRES_IN') return '1d';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ username: 'inexistente', password: 'password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return user and tokens on valid login', async () => {
    const passwordHash = await bcrypt.hash('Micaela2026!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'tesorera',
      fullName: 'Tesorera Demo',
      email: 'tesoreria@mercado.pe',
      passwordHash,
      isActive: true,
      roles: [{ role: { name: 'TESORERA' } }],
    });
    prisma.user.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.login({ username: 'tesorera', password: 'Micaela2026!' });
    expect(result.user.username).toBe('tesorera');
    expect(result.accessToken).toBe('mock_token');
    expect(result.refreshToken).toBe('mock_token');
  });
});
