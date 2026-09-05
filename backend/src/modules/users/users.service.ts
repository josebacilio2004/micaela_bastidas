import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        roles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email || undefined }] },
    });
    if (exists) throw new ConflictException('El nombre de usuario o correo ya está en uso');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
      },
    });

    if (dto.roles && dto.roles.length > 0) {
      const rolesDb = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      for (const r of rolesDb) {
        await this.prisma.userRole.create({
          data: { userId: user.id, roleId: r.id },
        });
      }
    }

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.roles) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      const rolesDb = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      for (const r of rolesDb) {
        await this.prisma.userRole.create({
          data: { userId: id, roleId: r.id },
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
  }
}
