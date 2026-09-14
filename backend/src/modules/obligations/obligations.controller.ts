import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ObligationsService } from './obligations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType, ObligationStatus } from '@prisma/client';

@ApiTags('Payment Obligations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('obligations')
export class ObligationsController {
  constructor(private obligationsService: ObligationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar obligaciones con filtros de comerciante, período y estado' })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'period', required: false, example: '2026-09' })
  @ApiQuery({ name: 'status', required: false, enum: ObligationStatus })
  @ApiQuery({ name: 'conceptCode', required: false })
  findAll(
    @Query('merchantId') merchantId?: string,
    @Query('period') period?: string,
    @Query('status') status?: ObligationStatus,
    @Query('conceptCode') conceptCode?: string,
  ) {
    return this.obligationsService.findAll({ merchantId, period, status, conceptCode });
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Obtener obligaciones de un comerciante específico' })
  findByMerchant(@Param('merchantId') merchantId: string) {
    return this.obligationsService.findByMerchant(merchantId);
  }

  @Get('merchant/:merchantId/pending')
  @ApiOperation({ summary: 'Obtener obligaciones pendientes y programadas con prevención de cobro duplicado' })
  findPendingByMerchant(@Param('merchantId') merchantId: string) {
    return this.obligationsService.getMerchantPendingObligations(merchantId);
  }

  @Post('generate-monthly')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Generar obligaciones mensuales de Alcabala y Agua para todos los comerciantes' })
  generateMonthly(@Body() body: { year: number; month: number }) {
    return this.obligationsService.generateMonthlyObligations(body.year, body.month);
  }

  @Post('generate-scheduled')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Ejecutar programación automática diaria y mensual para todos los comerciantes activos' })
  generateScheduled() {
    return this.obligationsService.generateScheduledObligations();
  }
}
