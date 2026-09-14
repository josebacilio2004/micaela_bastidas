import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CamerasService } from './cameras.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('CCTV Security Cameras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cameras')
export class CamerasController {
  constructor(private camerasService: CamerasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cámaras de seguridad del mercado' })
  findAll(@Query('activeOnly') activeOnly?: string, @Query('location') location?: string) {
    return this.camerasService.findAll({
      activeOnly: activeOnly === 'true',
      location,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener información de una cámara' })
  findOne(@Param('id') id: string) {
    return this.camerasService.findOne(id);
  }

  @Post()
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Registrar nueva cámara de seguridad' })
  create(@Body() dto: CreateCameraDto) {
    return this.camerasService.create(dto);
  }

  @Put(':id')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Actualizar parámetros de una cámara' })
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.camerasService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(RoleType.ADMINISTRADOR, RoleType.TESORERA)
  @ApiOperation({ summary: 'Activar o desactivar cámara' })
  toggleActive(@Param('id') id: string) {
    return this.camerasService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar cámara' })
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }

  @Post('seed')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Sembrar cámaras predeterminadas del mercado' })
  seed() {
    return this.camerasService.seedDefaultCameras();
  }
}
