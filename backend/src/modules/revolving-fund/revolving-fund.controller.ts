import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
