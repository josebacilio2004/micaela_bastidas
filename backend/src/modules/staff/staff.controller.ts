import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { CreateStaffPaymentDto } from './dto/create-staff-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Staff & Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Listar personal de mercado ordenado alfabéticamente' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.staffService.findAll({ search, role, isActive });
  }

  @Get('payments')
  @ApiOperation({ summary: 'Listar pagos de planilla / sueldos' })
  @ApiQuery({ name: 'period', required: false, example: '2026-09' })
  @ApiQuery({ name: 'staffMemberId', required: false })
  findPayments(
    @Query('period') period?: string,
    @Query('staffMemberId') staffMemberId?: string,
  ) {
    return this.staffService.findPayments({ period, staffMemberId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un colaborador y su historial de pagos' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar nuevo personal' })
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Put(':id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Actualizar datos de colaborador' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Dar de baja colaborador (inactivo)' })
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }

  @Post('payments')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar pago de sueldo / planilla mensual' })
  createPayment(
    @Body() dto: CreateStaffPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.staffService.createPayment(dto, userId);
  }
}
