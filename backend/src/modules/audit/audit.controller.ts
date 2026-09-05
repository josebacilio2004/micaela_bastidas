import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType, AuditAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles(RoleType.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar bitácora de auditoría del sistema' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'take', required: false, example: 50 })
  findAll(
    @Query('module') module?: string,
    @Query('action') action?: AuditAction,
    @Query('userId') userId?: string,
    @Query('take') take = 50,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(action ? { action } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: Number(take),
    });
  }
}
