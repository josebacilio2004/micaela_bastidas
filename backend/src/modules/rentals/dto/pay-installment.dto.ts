import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class PayInstallmentDto {
  @ApiProperty({ description: 'Método de pago', enum: PaymentMethod, default: PaymentMethod.EFECTIVO })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Número de comprobante / recibo o voucher', required: false })
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @ApiProperty({ description: 'Monto a pagar (si se omite, se usa el total de la cuota)', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Notas u observaciones del cobro', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Número de cuota (opcional si viene en el cuerpo)', required: false })
  @IsNumber()
  @IsOptional()
  installmentNumber?: number;

  @ApiProperty({ description: 'Registrar movimiento de ingreso en la caja de tesorería activa', default: true })
  @IsOptional()
  registerCashIncome?: boolean;
}
