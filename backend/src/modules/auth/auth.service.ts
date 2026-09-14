import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = user.roles.map((r) => r.role.name);
    const tokens = await this.generateTokens(user.id, user.username, roles);

    // Save refresh token hash
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        module: 'AUTH',
        entityName: 'User',
        entityId: user.id,
        newValues: { username: user.username, roles },
        ipAddress: ip,
        userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'jwt_refresh_super_secret_micaela_bastidas_key_2026_auth',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: { include: { role: true } } },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Sesión no válida');
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedException('Refresh token revocado o alterado');
      }

      const roles = user.roles.map((r) => r.role.name);
      const tokens = await this.generateTokens(user.id, user.username, roles);

      const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Token de actualización expirado o inválido');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Sesión cerrada correctamente' };
  }

  private async generateTokens(userId: string, username: string, roles: string[]) {
    const payload = { sub: userId, username, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'jwt_super_secret_micaela_bastidas_production_key_2026_auth',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'jwt_refresh_super_secret_micaela_bastidas_key_2026_auth',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    return { accessToken, refreshToken };
  }
}
