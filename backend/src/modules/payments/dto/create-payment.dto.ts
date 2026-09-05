import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  merchantId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  obligationId?: string;

  @ApiProperty({ example: 10.00 })
  @IsNumber()
  @Min(0.1)
  amount: number;

  @ApiProperty({ example: '2026-09' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.EFECTIVO })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cashRegisterId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
