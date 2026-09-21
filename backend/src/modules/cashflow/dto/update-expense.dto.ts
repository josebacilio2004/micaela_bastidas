import { IsString, IsOptional, IsNumber, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class UpdateExpenseDto {
  @ApiProperty({ description: 'Categoría de egreso', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Concepto o detalle del gasto', required: false })
  @IsString()
  @IsOptional()
  concept?: string;

  @ApiProperty({ description: 'Monto del egreso en soles', required: false })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Fecha del egreso (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ description: 'Beneficiario o proveedor', required: false })
  @IsString()
  @IsOptional()
  beneficiary?: string;

  @ApiProperty({ description: 'Tipo de comprobante', required: false })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiProperty({ description: 'Número del comprobante', required: false })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ description: 'URL del comprobante adjunto', required: false })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({ description: 'Medio de pago', enum: PaymentMethod, required: false })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Estado (PAGADO, PENDIENTE, ANULADO)', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Notas u observaciones', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
