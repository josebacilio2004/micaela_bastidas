import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CashflowService } from './cashflow.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const uploadVouchersDir = join(process.cwd(), 'uploads', 'expense_vouchers');
if (!fs.existsSync(uploadVouchersDir)) {
  fs.mkdirSync(uploadVouchersDir, { recursive: true });
}

@ApiTags('Cashflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cashflow')
export class CashflowController {
  constructor(private cashflowService: CashflowService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen consolidado de ingresos, egresos y balance neto' })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cashflowService.getSummary({ startDate, endDate });
  }

  @Get('cashbook')
  @ApiOperation({ summary: 'Libro diario cronológico con ingresos y salidas del mercado' })
  async getCashbook(@Query('date') date?: string) {
    return this.cashflowService.getCashbook(date);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Listar egresos del mercado con filtros por categoría y fechas' })
  async findAllExpenses(
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.cashflowService.findAllExpenses({ category, startDate, endDate, status, search });
  }

  @Get('expenses/:id')
  async findOneExpense(@Param('id') id: string) {
    return this.cashflowService.findOneExpense(id);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Registrar nuevo egreso del mercado' })
  async createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: any) {
    return this.cashflowService.createExpense(dto, user?.id);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Actualizar datos de un egreso' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.cashflowService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Anular egreso registrado' })
  async deleteExpense(@Param('id') id: string) {
    return this.cashflowService.deleteExpense(id);
  }

  @Post('expenses/upload-voucher')
  @ApiOperation({ summary: 'Subir comprobante o factura digital de egreso' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadVouchersDir),
        filename: (_req, file, cb) => {
          const cleanName = 'egr-' + Date.now() + '-' + Math.round(Math.random() * 1e4) + extname(file.originalname).toLowerCase();
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    }),
  )
  async uploadVoucher(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Archivo no proporcionado');
    return {
      fileUrl: '/api/uploads/expense_vouchers/' + file.filename,
      fileName: file.originalname,
    };
  }
}
