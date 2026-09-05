import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones del sistema' })
  findAll() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  @Put(':key')
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar una configuración del sistema' })
  update(@Param('key') key: string, @Body('value') value: string) {
    return this.prisma.systemSetting.update({
      where: { key },
      data: { value },
    });
  }
}
