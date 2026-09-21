import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRentalDto {
  @ApiProperty({ description: 'Nombre completo del arrendatario', required: false })
  @IsString()
  @IsOptional()
  tenantName?: string;

  @ApiProperty({ description: 'Teléfono de contacto', required: false })
  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @ApiProperty({ description: 'Giro o rubro comercial', required: false })
  @IsString()
  @IsOptional()
  businessCategory?: string;

  @ApiProperty({ description: 'Estado del contrato (ACTIVO, FINALIZADO, RESCINDIDO)', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Términos o cláusulas adicionales', required: false })
  @IsString()
  @IsOptional()
  contractTerms?: string;

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
