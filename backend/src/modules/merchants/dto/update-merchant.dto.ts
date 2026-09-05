import { IsOptional, IsString, Length, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantStatus } from '@prisma/client';

export class UpdateMerchantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @Length(8, 8)
  @IsOptional()
  dni?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  merchantTypeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sectorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  stallId?: string;

  @ApiPropertyOptional()
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
