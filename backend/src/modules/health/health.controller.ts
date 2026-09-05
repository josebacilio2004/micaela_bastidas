import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Comprobar estado de salud de la API y de PostgreSQL' })
  async check() {
    let dbStatus = 'down';
    let latencyMs = -1;
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
      latencyMs = Date.now() - start;
    } catch (e) {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      system: 'MERCADO DE ABASTOS MICAELA BASTIDAS - BACKEND API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs,
      },
    };
  }
}
