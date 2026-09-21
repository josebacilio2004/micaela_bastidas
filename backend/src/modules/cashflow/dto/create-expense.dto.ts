import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Categoría de egreso',
    example: 'SERVICIOS_BASICOS',
    enum: [
      'PLANILLA_PERSONAL',
      'SERVICIOS_BASICOS',
      'MANTENIMIENTO_OBRAS',
      'ADMINISTRATIVOS_LEGALES',
      'PUBLICIDAD_PERIFONEO',
      'IMPREVISTOS_OTROS',
    ],
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Concepto o detalle del gasto', example: 'Pago Sedam Huancayo Servicio de Agua Potable' })
  @IsString()
  @IsNotEmpty()
  concept: string;

  @ApiProperty({ description: 'Monto del egreso en soles', example: 450.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Fecha del egreso (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ description: 'Beneficiario o proveedor del pago', example: 'SEDAM HUANCAYO S.A.' })
  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  @ApiProperty({ description: 'Tipo de comprobante de pago', example: 'FACTURA', default: 'FACTURA' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiProperty({ description: 'Número del comprobante (Factura/Boleta/Recibo)', example: 'F001-0023412', required: false })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ description: 'URL de comprobante digital / foto adjunta', required: false })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({ description: 'Medio de pago', enum: PaymentMethod, default: PaymentMethod.EFECTIVO })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Registrar salida física en la caja de tesorería abierta', default: true })
  @IsOptional()
  registerCashExpense?: boolean;

  @ApiProperty({ description: 'Observaciones o notas adicionales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
