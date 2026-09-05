import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, MerchantStatus } from '@prisma/client';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  @Get('merchants')
  @ApiOperation({ summary: 'Listar comerciantes con búsqueda y filtros' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por DNI, Nombres, Código o Puesto' })
  @ApiQuery({ name: 'typeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: MerchantStatus })
  @ApiQuery({ name: 'sectorId', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('typeId') typeId?: string,
    @Query('status') status?: MerchantStatus,
    @Query('sectorId') sectorId?: string,
  ) {
    return this.merchantsService.findAll({ search, typeId, status, sectorId });
  }

  @Get('merchant-types')
  @ApiOperation({ summary: 'Listar tipos de comerciante (Socio, Ambulante Fijo, Temporal)' })
  findTypes() {
    return this.merchantsService.findTypes();
  }

  @Get('merchants/:id')
  @ApiOperation({ summary: 'Obtener detalle completo de comerciante y su historial' })
  findOne(@Param('id') id: string) {
    return this.merchantsService.findOne(id);
  }

  @Post('merchants')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar nuevo comerciante en el padrón' })
  create(@Body() dto: CreateMerchantDto, @CurrentUser('id') userId: string) {
    return this.merchantsService.create(dto, userId);
  }

  @Put('merchants/:id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Editar datos de un comerciante' })
  update(@Param('id') id: string, @Body() dto: UpdateMerchantDto, @CurrentUser('id') userId: string) {
    return this.merchantsService.update(id, dto, userId);
  }

  @Delete('merchants/:id')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar comerciante (Soft-delete conservando historial financiero)' })
  softDelete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.merchantsService.softDelete(id, userId);
  }
}
