import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService, SyncPushOperation } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sync Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('push')
  @ApiOperation({ summary: 'Subir lote de operaciones offline generadas en el móvil (Idempotente)' })
  push(
    @Body('deviceId') deviceId: string,
    @Body('operations') operations: SyncPushOperation[],
    @CurrentUser('id') userId: string,
  ) {
    return this.syncService.pushBatch(deviceId, userId, operations);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Descargar novedades incrementales del servidor hacia SQLite' })
  pull(@Query('cursor') cursor?: string) {
    return this.syncService.pullIncremental(cursor);
  }

  @Get('status')
  @ApiOperation({ summary: 'Consultar estado general de dispositivos y lotes de sincronización' })
  getStatus() {
    return this.syncService.getSyncStatus();
  }

  @Get('export-package')
  @ApiOperation({ summary: 'Exportar paquete integral de datos contables para migración' })
  exportPackage() {
    return this.syncService.exportAccountingPackage();
  }

  @Post('import-package')
  @ApiOperation({ summary: 'Importar y fusionar paquete contable de la laptop de la contadora' })
  importPackage(
    @Body() pkg: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.syncService.importAccountingPackage(pkg, userId);
  }
}
