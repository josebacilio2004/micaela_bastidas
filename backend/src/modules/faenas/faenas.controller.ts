import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
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
  async findOne(@Param('id') id: string) {
    return this.faenasService.findOne(id);
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

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Registrar asistencia a faena por QR o DNI' })
  async registerAttendance(
    @Param('id') id: string,
    @Body() body: { dniOrCode: string },
    @CurrentUser() user: any,
  ) {
    return this.faenasService.registerAttendance(id, body.dniOrCode, user?.id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalizar faena y aplicar multas automáticas a socios ausentes' })
  async finalize(@Param('id') id: string) {
    return this.faenasService.finalizeFaena(id);
  }
}
