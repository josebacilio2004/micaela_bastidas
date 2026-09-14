import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';

@Injectable()
export class CamerasService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { activeOnly?: boolean; location?: string }) {
    const where: any = {};
    if (query?.activeOnly) {
      where.isActive = true;
    }
    if (query?.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    return this.prisma.camera.findMany({
      where,
      orderBy: [{ location: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) {
      throw new NotFoundException('Cámara no encontrada');
    }
    return camera;
  }

  async create(dto: CreateCameraDto) {
    return this.prisma.camera.create({
      data: {
        name: dto.name,
        location: dto.location,
        deviceId: dto.deviceId || null,
        streamUrl: dto.streamUrl || null,
        streamType: dto.streamType || 'LOCAL_USB',
        resolution: dto.resolution || 'HD_720P',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        notes: dto.notes || null,
      },
    });
  }

  async update(id: string, dto: UpdateCameraDto) {
    await this.findOne(id);
    return this.prisma.camera.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.location ? { location: dto.location } : {}),
        ...(dto.deviceId !== undefined ? { deviceId: dto.deviceId } : {}),
        ...(dto.streamUrl !== undefined ? { streamUrl: dto.streamUrl } : {}),
        ...(dto.streamType ? { streamType: dto.streamType } : {}),
        ...(dto.resolution ? { resolution: dto.resolution } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async toggleActive(id: string) {
    const camera = await this.findOne(id);
    return this.prisma.camera.update({
      where: { id },
      data: { isActive: !camera.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.camera.delete({ where: { id } });
  }

  async seedDefaultCameras() {
    const count = await this.prisma.camera.count();
    if (count > 0) return;

    const defaults = [
      {
        name: 'Cámara 01 - Puerta Principal / Acceso',
        location: 'Ingreso Principal (Av. Principal)',
        streamType: 'LOCAL_USB',
        resolution: 'HD_1080P',
        notes: 'Monitoreo de afluencia general y control peatonal',
      },
      {
        name: 'Cámara 02 - Pasaje Carnes y Abarrotes',
        location: 'Sector Central / Pasaje Carnes',
        streamType: 'LOCAL_USB',
        resolution: 'HD_720P',
        notes: 'Supervisión de puestos interiores y pasillo de tránsito',
      },
      {
        name: 'Cámara 03 - Servicios Higiénicos / Pasillo',
        location: 'Zona de Servicios Higiénicos (SSHH)',
        streamType: 'LOCAL_USB',
        resolution: 'HD_720P',
        notes: 'Validación visual de torniquete/puerta de ingreso SSHH',
      },
      {
        name: 'Cámara 04 - Caja Central y Administración',
        location: 'Módulo de Tesorería y Administración',
        streamType: 'LOCAL_USB',
        resolution: 'HD_1080P',
        notes: 'Enfoque de seguridad para ventanilla de recaudación y arqueo',
      },
    ];

    for (const d of defaults) {
      await this.prisma.camera.create({ data: d });
    }
    console.log('Default cameras seeded successfully');
  }
}
