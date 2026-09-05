import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConceptsService } from './concepts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Payment Concepts & Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ConceptsController {
  constructor(private conceptsService: ConceptsService) {}

  @Get('payment-concepts')
  @ApiOperation({ summary: 'Listar conceptos de pago (Alcabala, Agua, etc.) y tarifas vigentes' })
  findAllConcepts() {
    return this.conceptsService.findAllConcepts();
  }

  @Get('rates')
  @ApiOperation({ summary: 'Listar historial y catálogo de tarifas' })
  findAllRates() {
    return this.conceptsService.findAllRates();
  }

  @Post('rates')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear o actualizar tarifa con vigencia' })
  createRate(
    @Body() dto: { conceptId: string; merchantTypeId?: string; amount: number; startDate: string; endDate?: string },
  ) {
    return this.conceptsService.createRate(dto);
  }

  @Put('rates/:id')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Modificar vigencia o monto de tarifa' })
  updateRate(
    @Param('id') id: string,
    @Body() dto: { amount?: number; isActive?: boolean; endDate?: string },
  ) {
    return this.conceptsService.updateRate(id, dto);
  }
}
