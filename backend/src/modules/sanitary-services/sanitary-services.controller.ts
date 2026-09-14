import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SanitaryServicesService } from './sanitary-services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Sanitary Services & Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sanitary-services')
export class SanitaryServicesController {
  constructor(private sanitaryService: SanitaryServicesService) {}

  @Get('active')
  @ApiOperation({ summary: 'Obtener sesión de servicios higiénicos activa del operador o del día' })
  findActive(@CurrentUser('id') userId: string) {
    return this.sanitaryService.findActive(userId);
  }

  @Get('daily-report')
  @ApiOperation({ summary: 'Reporte diario consolidado de SSHH para contabilidad' })
  getDailyReport(@Query('date') date?: string) {
    return this.sanitaryService.getDailyReport(date);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de turnos de servicios higiénicos' })
  getHistory() {
    return this.sanitaryService.getHistory();
  }

  @Post('start')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA, RoleType.SERVICIOS_HIGIENICOS)
  @ApiOperation({ summary: 'Iniciar sesión diaria de servicios higiénicos' })
  startSession(
    @Body() dto: { notes?: string; operatorId?: string; date?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.sanitaryService.startSession(dto, userId);
  }

  @Post(':id/counts')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA, RoleType.SERVICIOS_HIGIENICOS)
  @ApiOperation({ summary: 'Actualizar conteo rápido de miccionarios o retretes' })
  updateCounts(
    @Param('id') id: string,
    @Body() dto: { urinalDelta?: number; toiletDelta?: number; exactUrinals?: number; exactToilets?: number },
  ) {
    return this.sanitaryService.updateCounts(id, dto);
  }

  @Post(':id/close')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA, RoleType.SERVICIOS_HIGIENICOS)
  @ApiOperation({ summary: 'Cerrar turno de servicios higiénicos y validar tickets' })
  closeSession(
    @Param('id') id: string,
    @Body() dto: {
      initialTicketNumber?: number;
      finalTicketNumber?: number;
      declaredTicketCount?: number;
      urinalCount?: number;
      toiletCount?: number;
      discrepancyReason?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.sanitaryService.closeSession(id, dto, userId);
  }

  @Post(':id/issue-ticket')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA, RoleType.SERVICIOS_HIGIENICOS)
  @ApiOperation({ summary: 'Emitir boleto de ingreso único con QR (Tarifa plana S/ 0.50)' })
  issueTicket(@Param('id') id: string) {
    return this.sanitaryService.issueEntryTicket(id);
  }

  @Post('validate-ticket')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA, RoleType.SERVICIOS_HIGIENICOS)
  @ApiOperation({ summary: 'Escanear y validar boleto de ingreso QR en puerta' })
  validateTicket(
    @Body() body: { ticketCode: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.sanitaryService.validateEntryTicket(body.ticketCode, userId);
  }

  @Get(':id/tickets')
  @ApiOperation({ summary: 'Listar boletos emitidos y validados de la sesión' })
  getTickets(@Param('id') id: string) {
    return this.sanitaryService.getSessionTickets(id);
  }
}
