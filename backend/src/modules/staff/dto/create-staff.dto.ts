import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'Carlos Alberto' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Mendoza Quispe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '41208945' })
  @IsString()
  @IsNotEmpty()
  dni: string;

  @ApiPropertyOptional({ example: '984512345' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Vigilante Diurno' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 1300.00 })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Turno mañana-tarde' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateStaffDto extends CreateStaffDto {}
