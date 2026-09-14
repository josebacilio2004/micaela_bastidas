import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashRegistersService } from './cash-registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, CashMovementType } from '@prisma/client';

@ApiTags('Cash Registers & Closings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private cashRegistersService: CashRegistersService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener la caja abierta actualmente' })
  findCurrentActive() {
    return this.cashRegistersService.findCurrentActive();
  }

  @Get('daily-consolidated')
  @ApiOperation({ summary: 'Reporte general diario consolidado de todos los servicios y cajas' })
  getDailyConsolidated(@Query('date') date?: string) {
    return this.cashRegistersService.getDailyConsolidated(date);
  }

  @Get()
  @ApiOperation({ summary: 'Listar historial de cajas y cierres' })
  findAll() {
    return this.cashRegistersService.findAll();
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Obtener resumen y arqueo de caja previo al cierre' })
  getClosingSummary(@Param('id') id: string) {
    return this.cashRegistersService.getClosingSummary(id);
  }

  @Post('open')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Abrir una nueva caja con monto inicial' })
  openRegister(
    @Body() dto: { name: string; openingAmount: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegistersService.openRegister(dto, userId);
  }

  @Post(':id/movements')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar movimiento extraordinario de ingreso o egreso en caja' })
  addMovement(
    @Param('id') id: string,
    @Body() dto: { type: CashMovementType; concept: string; amount: number; reference?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegistersService.addMovement(id, dto, userId);
  }

  @Post(':id/close')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Cerrar caja y registrar arqueo con control de diferencias' })
  closeRegister(
    @Param('id') id: string,
    @Body() dto: { countedCash: number; closingObservations?: string; discrepancyReason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegistersService.closeRegister(id, dto, userId);
  }

  @Post(':id/reopen')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reapertura autorizada de caja cerrada (Solo Administrador con justificación)' })
  reopenRegister(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegistersService.reopenRegister(id, reason, userId);
  }
}
