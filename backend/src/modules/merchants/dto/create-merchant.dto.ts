import { IsNotEmpty, IsString, Length, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantStatus } from '@prisma/client';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Pérez Mamani' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '45891234' })
  @IsString()
  @Length(8, 8, { message: 'El DNI debe contener exactamente 8 dígitos' })
  dni: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'uuid-merchant-type' })
  @IsString()
  @IsNotEmpty()
  merchantTypeId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sectorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  stallId?: string;

  @ApiPropertyOptional({ example: 'Carnes y Aves' })
  @IsString()
  @IsOptional()
  businessCategory?: string;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsEnum(MerchantStatus)
  @IsOptional()
  status?: MerchantStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observations?: string;
}
