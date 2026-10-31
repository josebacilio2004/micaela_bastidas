import { Controller, Get, Post, Param, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RevolvingFundService } from './revolving-fund.service';

@ApiTags('Revolving Fund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('revolving-fund')
export class RevolvingFundController {
  constructor(private rfService: RevolvingFundService) {}

  @Get('loans')
  @ApiOperation({ summary: 'Listar todos los préstamos' })
  async findAllLoans() {
    return this.rfService.findAllLoans();
  }

  @Get('loans/:id')
  async findLoanById(@Param('id') id: string) {
    return this.rfService.findLoanById(id);
  }

  @Get('loans/:id/contract')
  @ApiOperation({ summary: 'Obtener contrato oficial con cronograma de amortización' })
  async getLoanContract(@Param('id') id: string) {
    return this.rfService.getLoanContract(id);
  }

  @Get('loans/:id/download-docx')
  @ApiOperation({ summary: 'Descargar documento Word del contrato de crédito' })
  async downloadDocx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.rfService.generateDocx(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Post('loans/:id/extend')
  @ApiOperation({ summary: 'Extender plazo de crédito por vencimiento' })
  async extendLoan(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.rfService.extendLoanTerm(id, {
      ...body,
      userId: user?.id,
    });
  }

  @Post('loans')
  @ApiOperation({ summary: 'Registrar nuevo préstamo (colocación)' })
  async createLoan(@Body() body: any, @CurrentUser() user: any) {
    return this.rfService.createLoan({
      ...body,
      createdById: user?.id,
    });
  }

  @Get('collections')
  @ApiOperation({ summary: 'Listar cobranzas y amortizaciones' })
  async findAllCollections() {
    return this.rfService.findAllCollections();
  }

  @Post('collections')
  @ApiOperation({ summary: 'Registrar cobro / amortización de préstamo' })
  async createCollection(@Body() body: any, @CurrentUser() user: any) {
    return this.rfService.createCollection({
      ...body,
      createdById: user?.id,
    });
  }
}
