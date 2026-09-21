import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { PayInstallmentDto } from './dto/pay-installment.dto';

@ApiTags('Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rentals')
export class RentalsController {
  constructor(private rentalsService: RentalsService) {}

  @Post('preview-schedule')
  @ApiOperation({ summary: 'Pre-visualizar cronograma de pagos con tasa de interés' })
  async previewSchedule(@Body() body: {
    startDate: string;
    monthsCount: number;
    monthlyRent: number;
    interestRate?: number;
  }) {
    return this.rentalsService.previewSchedule(body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos de alquiler de puestos con avance de cuotas' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('stallCode') stallCode?: string,
    @Query('sort') sort?: string,
  ) {
    return this.rentalsService.findAll({ status, search, stallCode, sort });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contrato de alquiler por ID' })
  async findOne(@Param('id') id: string) {
    return this.rentalsService.findOne(id);
  }

  @Get(':id/document')
  @ApiOperation({ summary: 'Obtener datos completos para contrato legal y cronograma imprimible' })
  async getContractDocument(@Param('id') id: string) {
    return this.rentalsService.getContractDocument(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo contrato de alquiler y generar cuotas' })
  async create(@Body() dto: CreateRentalDto, @CurrentUser() user: any) {
    return this.rentalsService.create(dto, user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de contrato de alquiler' })
  async update(@Param('id') id: string, @Body() dto: UpdateRentalDto) {
    return this.rentalsService.update(id, dto);
  }

  @Post(':id/installments/:num/pay')
  @ApiOperation({ summary: 'Registrar cobro de cuota de alquiler' })
  async payInstallment(
    @Param('id') id: string,
    @Param('num', ParseIntPipe) installmentNumber: number,
    @Body() dto: PayInstallmentDto,
    @CurrentUser() user: any,
  ) {
    return this.rentalsService.payInstallment(id, installmentNumber, dto, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Rescindir o finalizar contrato de alquiler y liberar puesto' })
  async terminate(@Param('id') id: string, @Query('reason') reason?: string) {
    return this.rentalsService.terminateContract(id, reason);
  }
}
