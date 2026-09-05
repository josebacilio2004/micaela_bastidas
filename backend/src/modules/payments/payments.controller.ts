import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pagos con búsqueda, filtros y paginación' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'conceptId', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'cashRegisterId', required: false })
  @ApiQuery({ name: 'take', required: false, example: 50 })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  findAll(@Query() query: any) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener comprobante y detalle de pago por ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar nuevo pago de Alcabala o Agua (Soporta Idempotency-Key)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Clave única para evitar pagos duplicados' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    return this.paymentsService.create(dto, userId, idempotencyKey);
  }

  @Post(':id/void')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Anular un pago registrado con justificación obligatoria' })
  voidPayment(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.voidPayment(id, reason, userId);
  }
}
