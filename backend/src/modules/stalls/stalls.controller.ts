import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StallsService, CreateStallDto, UpdateStallDto } from './stalls.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StallStatus } from '@prisma/client';

@ApiTags('Stalls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StallsController {
  constructor(private stallsService: StallsService) {}

  @Get('sectors')
  @ApiOperation({ summary: 'Listar todos los sectores del mercado' })
  findAllSectors() {
    return this.stallsService.findAllSectors();
  }

  @Get('stalls/giros')
  @ApiOperation({ summary: 'Listar giros comerciales con contadores de puestos' })
  findAllGiros() {
    return this.stallsService.findAllGiros();
  }

  @Get('stalls')
  @ApiOperation({ summary: 'Listar puestos / espacios de venta' })
  @ApiQuery({ name: 'sectorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: StallStatus })
  @ApiQuery({ name: 'giro', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAllStalls(
    @Query('sectorId') sectorId?: string,
    @Query('status') status?: StallStatus,
    @Query('giro') giro?: string,
    @Query('search') search?: string,
  ) {
    return this.stallsService.findAllStalls({ sectorId, status, giro, search });
  }

  @Get('stalls/:id')
  @ApiOperation({ summary: 'Obtener un puesto por ID' })
  findOne(@Param('id') id: string) {
    return this.stallsService.findOne(id);
  }

  @Post('stalls')
  @ApiOperation({ summary: 'Crear un nuevo puesto' })
  createStall(@Body() dto: CreateStallDto) {
    return this.stallsService.createStall(dto);
  }

  @Put('stalls/:id')
  @ApiOperation({ summary: 'Actualizar un puesto' })
  updateStall(
    @Param('id') id: string,
    @Body() dto: UpdateStallDto,
  ) {
    return this.stallsService.updateStall(id, dto);
  }

  @Delete('stalls/:id')
  @ApiOperation({ summary: 'Eliminar un puesto' })
  deleteStall(@Param('id') id: string) {
    return this.stallsService.deleteStall(id);
  }

  @Post('stalls/reorder-by-giro')
  @ApiOperation({ summary: 'Reordenar numeración de puestos por Giro correlativamente (1, 2, 3...)' })
  reorderStalls(@Body() body?: { giro?: string }) {
    return this.stallsService.reorderStallsByGiro(body?.giro);
  }
}
