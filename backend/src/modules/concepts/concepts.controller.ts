import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConceptsService } from './concepts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType, Periodicity } from '@prisma/client';

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

  @Get('concepts')
  @ApiOperation({ summary: 'Alias para listar conceptos de pago' })
  findAllConceptsAlias() {
    return this.conceptsService.findAllConcepts();
  }

  @Post('payment-concepts')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Crear nuevo concepto de pago' })
  createConcept(
    @Body() dto: { code: string; name: string; description?: string; periodicity?: Periodicity },
  ) {
    return this.conceptsService.createConcept(dto);
  }

  @Put('payment-concepts/:id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Actualizar concepto de pago' })
  updateConcept(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; periodicity?: Periodicity; isActive?: boolean },
  ) {
    return this.conceptsService.updateConcept(id, dto);
  }

  @Delete('payment-concepts/:id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Desactivar concepto de pago' })
  deleteConcept(@Param('id') id: string) {
    return this.conceptsService.deleteConcept(id);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Listar historial y catálogo de tarifas' })
  findAllRates() {
    return this.conceptsService.findAllRates();
  }

  @Post('rates')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Crear o actualizar tarifa con vigencia' })
  createRate(
    @Body() dto: { conceptId: string; merchantTypeId?: string; amount: number; startDate: string; endDate?: string },
  ) {
    return this.conceptsService.createRate(dto);
  }

  @Put('rates/:id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Modificar vigencia o monto de tarifa' })
  updateRate(
    @Param('id') id: string,
    @Body() dto: { amount?: number; isActive?: boolean; endDate?: string },
  ) {
    return this.conceptsService.updateRate(id, dto);
  }

  @Delete('rates/:id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Desactivar tarifa' })
  deleteRate(@Param('id') id: string) {
    return this.conceptsService.deleteRate(id);
  }
}
