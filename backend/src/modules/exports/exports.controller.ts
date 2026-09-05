import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Get('excel')
  @ApiOperation({ summary: 'Exportar informe completo a Excel XLSX multihoja estilizado' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-09-30' })
  async exportExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.exportsService.generateExcelReport(startDate, endDate);
    const filename = `Reporte_Mercado_Micaela_Bastidas_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('csv')
  @ApiOperation({ summary: 'Exportar lista de pagos en formato CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csvData = await this.exportsService.generatePaymentsCsv(startDate, endDate);
    const filename = `Pagos_Micaela_Bastidas_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  }
}
