import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'tesorera' })
  @IsString()
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  username: string;

  @ApiProperty({ example: 'Micaela2026!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
