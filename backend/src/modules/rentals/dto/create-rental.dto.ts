import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRentalDto {
  @ApiProperty({ description: 'ID del puesto a alquilar (debe estar en estado LIBRE)' })
  @IsString()
  @IsNotEmpty()
  stallId: string;

  @ApiProperty({ description: 'Nombre completo del arrendatario/inquilino' })
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @ApiProperty({ description: 'DNI del arrendatario' })
  @IsString()
  @IsNotEmpty()
  tenantDni: string;

  @ApiProperty({ description: 'Teléfono de contacto', required: false })
  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @ApiProperty({ description: 'Giro o rubro comercial', required: false })
  @IsString()
  @IsOptional()
  businessCategory?: string;

  @ApiProperty({ description: 'ID del comerciante si ya está empadronado', required: false })
  @IsString()
  @IsOptional()
  merchantId?: string;

  @ApiProperty({ description: 'Fecha de inicio del contrato (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Cantidad de meses de duración del contrato (ej. 6, 12)', default: 6 })
  @IsNumber()
  @Min(1)
  @Max(60)
  monthsCount: number;

  @ApiProperty({ description: 'Canon de alquiler mensual pactado en soles', default: 150.00 })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiProperty({ description: 'Tasa de interés mensual aplicada en % (ej. 0% o 2%)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  interestRate?: number;

  @ApiProperty({ description: 'Monto de garantía o depósito de alquiler', default: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @ApiProperty({ description: 'Términos o cláusulas adicionales del contrato', required: false })
  @IsString()
  @IsOptional()
  contractTerms?: string;

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
