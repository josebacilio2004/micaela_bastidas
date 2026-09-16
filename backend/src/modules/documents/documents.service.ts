import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(concept?: string, merchantId?: string, search?: string) {
    return this.prisma.marketDocument.findMany({
      where: {
        ...(concept && concept !== 'ALL' ? { concept } : {}),
        ...(merchantId ? { merchantId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        merchant: {
          select: { id: true, firstName: true, lastName: true, dni: true, internalCode: true },
        },
        uploadedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.marketDocument.findUnique({
      where: { id },
      include: {
        merchant: true,
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async create(data: {
    title: string;
    concept: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize?: number;
    description?: string;
    merchantId?: string;
    uploadedById?: string;
  }) {
    const count = await this.prisma.marketDocument.count();
    const code = 'DOC-' + String(count + 1).padStart(5, '0');

    return this.prisma.marketDocument.create({
      data: {
        code,
        title: data.title,
        concept: data.concept || 'OTROS',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        description: data.description,
        merchantId: data.merchantId || null,
        uploadedById: data.uploadedById || null,
      },
      include: {
        merchant: { select: { id: true, firstName: true, lastName: true, dni: true } },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.marketDocument.delete({ where: { id } });
  }
}
