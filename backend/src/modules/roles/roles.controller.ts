import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de roles' })
  findAll() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
