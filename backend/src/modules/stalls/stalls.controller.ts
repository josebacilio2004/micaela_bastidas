import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StallsService } from './stalls.service';
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

  @Get('stalls')
  @ApiOperation({ summary: 'Listar puestos / espacios de venta' })
  @ApiQuery({ name: 'sectorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: StallStatus })
  findAllStalls(
    @Query('sectorId') sectorId?: string,
    @Query('status') status?: StallStatus,
  ) {
    return this.stallsService.findAllStalls(sectorId, status);
  }

  @Post('stalls')
  @ApiOperation({ summary: 'Crear un nuevo puesto' })
  createStall(@Body() dto: { code: string; sectorId: string; locationDescription?: string }) {
    return this.stallsService.createStall(dto);
  }

  @Put('stalls/:id')
  @ApiOperation({ summary: 'Actualizar un puesto' })
  updateStall(
    @Param('id') id: string,
    @Body() dto: { locationDescription?: string; status?: StallStatus; observations?: string },
  ) {
    return this.stallsService.updateStall(id, dto);
  }
}
