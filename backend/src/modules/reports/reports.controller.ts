import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas y KPIs del dashboard en tiempo real' })
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('daily')
  @ApiOperation({ summary: 'Reporte diario detallado con recaudación y arqueo' })
  @ApiQuery({ name: 'date', required: false, example: '2026-09-04' })
  getDailyReport(@Query('date') date?: string) {
    return this.reportsService.getDailyReport(date);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Reporte mensual de recaudación, morosidad y cumplimiento' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiQuery({ name: 'month', required: false, example: 9 })
  getMonthlyReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;
    return this.reportsService.getMonthlyReport(y, m);
  }

  @Get('defaulters')
  @ApiOperation({ summary: 'Lista de comerciantes con pagos pendientes (Morosos)' })
  getDefaulters() {
    return this.reportsService.getDefaulters();
  }
}
