import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateStaffPaymentDto {
  @ApiProperty({ example: 'uuid-staff-id' })
  @IsString()
  @IsNotEmpty()
  staffMemberId: string;

  @ApiProperty({ example: '2026-09' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ example: 1300.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.EFECTIVO })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'REC-0012' })
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'Pago puntual mes de septiembre' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true, description: 'Registrar automáticamente como egreso en la caja diaria activa' })
  @IsOptional()
  registerCashExpense?: boolean;
}
