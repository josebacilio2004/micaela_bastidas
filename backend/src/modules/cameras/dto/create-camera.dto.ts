import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCameraDto {
  @ApiProperty({ example: 'Cámara 01 - Puerta Principal' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Puerta Principal / Ingreso Peatonal' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: 'video-device-id-001' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'http://192.168.1.100:8080/stream' })
  @IsString()
  @IsOptional()
  streamUrl?: string;

  @ApiPropertyOptional({ example: 'LOCAL_USB', default: 'LOCAL_USB' })
  @IsString()
  @IsOptional()
  streamType?: string; // 'LOCAL_USB' | 'RTSP' | 'MJPEG' | 'IP_STREAM'

  @ApiPropertyOptional({ example: 'HD_720P', default: 'HD_720P' })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Cámara gran angular apuntando hacia el control de acceso' })
  @IsString()
  @IsOptional()
  notes?: string;
}
