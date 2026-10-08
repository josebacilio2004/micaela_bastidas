import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Meetings & Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las asambleas y reuniones de socios con filtro de fecha opcional' })
  @ApiQuery({ name: 'date', required: false, description: 'Filtrar por fecha específica (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  findAll(@Query('date') date?: string, @Query('status') status?: string) {
    return this.meetingsService.findAll({ date, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de reunión con lista de asistentes' })
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get(':id/quorum')
  @ApiOperation({ summary: 'Obtener métricas en vivo de quórum (Presentes / Ausentes / %)' })
  getQuorum(@Param('id') id: string) {
    return this.meetingsService.getQuorum(id);
  }

  @Get(':id/fines')
  @ApiOperation({ summary: 'Listar multas generadas para la asamblea' })
  getFines(@Param('id') id: string) {
    return this.meetingsService.getFines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva asamblea o reunión general' })
  create(
    @Body() dto: { title: string; date: string; time: string; location: string; description?: string; status?: any },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos de la asamblea' })
  update(
    @Param('id') id: string,
    @Body() dto: { title?: string; date?: string; time?: string; location?: string; description?: string },
  ) {
    return this.meetingsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de la asamblea (PROGRAMADA, EN_CURSO, FINALIZADA)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.meetingsService.updateStatus(id, status);
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Registrar asistencia mediante lectura de QR o DNI' })
  registerAttendance(
    @Param('id') meetingId: string,
    @Body() dto: { merchantIdentifier: string; idempotencyKey: string; deviceId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.registerAttendance(meetingId, dto, userId);
  }

  @Post(':id/toggle-attendance')
  @ApiOperation({ summary: 'Alternar asistencia individual de socio' })
  toggleAttendance(
    @Param('id') meetingId: string,
    @Body() dto: { merchantId: string; present: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.toggleAttendance(meetingId, dto.merchantId, dto.present, userId);
  }

  @Post(':id/bulk-attendance')
  @ApiOperation({ summary: 'Actualizar asistencias en lote' })
  bulkAttendance(
    @Param('id') meetingId: string,
    @Body() dto: { items: { merchantId: string; present: boolean }[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.bulkUpdateAttendance(meetingId, dto.items, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una asamblea programada' })
  delete(@Param('id') id: string) {
    return this.meetingsService.delete(id);
  }
}

