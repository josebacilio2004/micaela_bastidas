import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FaenasService } from './faenas.service';

@ApiTags('Faenas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('faenas')
export class FaenasController {
  constructor(private faenasService: FaenasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar faenas comunales' })
  async findAll() {
    return this.faenasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una faena' })
  async findOne(@Param('id') id: string) {
    return this.faenasService.findOne(id);
  }

  @Get(':id/fines')
  @ApiOperation({ summary: 'Listar multas generadas para la faena' })
  async getFines(@Param('id') id: string) {
    return this.faenasService.getFines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva faena de limpieza' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    return this.faenasService.create({
      title: body.title,
      date: body.date,
      time: body.time,
      sectorToClean: body.sectorToClean,
      description: body.description,
      fineAmount: body.fineAmount,
      createdById: user?.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos de una faena' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.faenasService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una faena programada' })
  async delete(@Param('id') id: string) {
    return this.faenasService.delete(id);
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Registrar asistencia a faena por QR o DNI' })
  async registerAttendance(
    @Param('id') id: string,
    @Body() body: { dniOrCode: string },
    @CurrentUser() user: any,
  ) {
    return this.faenasService.registerAttendance(id, body.dniOrCode, user?.id);
  }

  @Post(':id/toggle-attendance')
  @ApiOperation({ summary: 'Alternar asistencia individual a faena' })
  async toggleAttendance(
    @Param('id') id: string,
    @Body() body: { merchantId: string; present: boolean },
    @CurrentUser() user: any,
  ) {
    return this.faenasService.toggleAttendance(id, body.merchantId, body.present, user?.id);
  }

  @Post(':id/bulk-attendance')
  @ApiOperation({ summary: 'Actualizar asistencias a faena en lote' })
  async bulkAttendance(
    @Param('id') id: string,
    @Body() body: { items: { merchantId: string; present: boolean }[] },
    @CurrentUser() user: any,
  ) {
    return this.faenasService.bulkUpdateAttendance(id, body.items, user?.id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalizar faena y aplicar multas automáticas a socios ausentes' })
  async finalize(@Param('id') id: string) {
    return this.faenasService.finalizeFaena(id);
  }
}

