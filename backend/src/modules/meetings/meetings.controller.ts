import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Listar todas las asambleas y reuniones de socios' })
  findAll() {
    return this.meetingsService.findAll();
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

  @Post()
  @ApiOperation({ summary: 'Crear nueva asamblea o reunión general' })
  create(
    @Body() dto: { title: string; date: string; time: string; location: string; description?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.create(dto, userId);
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
}
