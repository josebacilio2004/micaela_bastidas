import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // --- CATEGORÍAS (CRUD) ---
  async findCategories() {
    return this.prisma.documentCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: { name: string; code?: string; direction?: string; description?: string }) {
    const code = (dto.code || dto.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')).trim();
    const existing = await this.prisma.documentCategory.findFirst({
      where: { OR: [{ code }, { name: dto.name.trim() }] },
    });
    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre o código');
    }

    return this.prisma.documentCategory.create({
      data: {
        name: dto.name.trim(),
        code,
        direction: dto.direction || 'INTERNO',
        description: dto.description?.trim(),
      },
    });
  }

  async updateCategory(id: string, dto: { name?: string; direction?: string; description?: string; isActive?: boolean }) {
    const category = await this.prisma.documentCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    return this.prisma.documentCategory.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.direction ? { direction: dto.direction } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.documentCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.documentCategory.update({ where: { id }, data: { isActive: false } });
  }

  // --- CONCEPTOS (CRUD) ---
  async findConcepts() {
    return this.prisma.documentConcept.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createConcept(dto: { name: string; code?: string; description?: string }) {
    const code = (dto.code || dto.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')).trim();
    const existing = await this.prisma.documentConcept.findFirst({
      where: { OR: [{ code }, { name: dto.name.trim() }] },
    });
    if (existing) {
      throw new ConflictException('Ya existe un concepto con ese nombre o código');
    }

    return this.prisma.documentConcept.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim(),
      },
    });
  }

  async updateConcept(id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    const concept = await this.prisma.documentConcept.findUnique({ where: { id } });
    if (!concept) throw new NotFoundException('Concepto no encontrado');

    return this.prisma.documentConcept.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteConcept(id: string) {
    const concept = await this.prisma.documentConcept.findUnique({ where: { id } });
    if (!concept) throw new NotFoundException('Concepto no encontrado');
    return this.prisma.documentConcept.update({ where: { id }, data: { isActive: false } });
  }

  // --- DOCUMENTOS ---
  async findAll(query?: {
    concept?: string;
    conceptId?: string;
    categoryId?: string;
    direction?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    merchantId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (query?.concept && query.concept !== 'ALL') {
      where.concept = query.concept;
    }
    if (query?.conceptId) {
      where.conceptId = query.conceptId;
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.direction) {
      where.direction = query.direction;
    }
    if (query?.year) {
      where.year = Number(query.year);
    }
    if (query?.month) {
      where.month = Number(query.month);
    }
    if (query?.merchantId) {
      where.merchantId = query.merchantId;
    }

    if (query?.startDate || query?.endDate) {
      where.documentDate = {};
      if (query.startDate) where.documentDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.documentDate.lte = end;
      }
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { senderReceiver: { contains: query.search, mode: 'insensitive' } },
        { externalNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.marketDocument.findMany({
      where,
      include: {
        category: true,
        docConcept: true,
        merchant: {
          select: { id: true, firstName: true, lastName: true, dni: true, internalCode: true },
        },
        uploadedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.marketDocument.findUnique({
      where: { id },
      include: {
        category: true,
        docConcept: true,
        merchant: true,
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async create(data: {
    title: string;
    concept?: string;
    conceptId?: string;
    categoryId?: string;
    documentDate?: string | Date;
    direction?: string;
    senderReceiver?: string;
    externalNumber?: string;
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

    const parsedDate = data.documentDate ? new Date(data.documentDate) : new Date();
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth() + 1;

    return this.prisma.marketDocument.create({
      data: {
        code,
        title: data.title.trim(),
        concept: data.concept || 'OTROS',
        conceptId: data.conceptId || null,
        categoryId: data.categoryId || null,
        documentDate: parsedDate,
        year,
        month,
        direction: data.direction || 'INTERNO',
        senderReceiver: data.senderReceiver?.trim() || null,
        externalNumber: data.externalNumber?.trim() || null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        description: data.description?.trim(),
        merchantId: data.merchantId || null,
        uploadedById: data.uploadedById || null,
      },
      include: {
        category: true,
        docConcept: true,
        merchant: { select: { id: true, firstName: true, lastName: true, dni: true } },
      },
    });
  }

  async update(id: string, data: {
    title?: string;
    concept?: string;
    conceptId?: string;
    categoryId?: string;
    documentDate?: string | Date;
    direction?: string;
    senderReceiver?: string;
    externalNumber?: string;
    description?: string;
    merchantId?: string;
  }) {
    const doc = await this.prisma.marketDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    let year = doc.year;
    let month = doc.month;
    let parsedDate: Date | undefined;
    if (data.documentDate) {
      parsedDate = new Date(data.documentDate);
      year = parsedDate.getFullYear();
      month = parsedDate.getMonth() + 1;
    }

    return this.prisma.marketDocument.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.concept ? { concept: data.concept } : {}),
        ...(data.conceptId !== undefined ? { conceptId: data.conceptId || null } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
        ...(parsedDate ? { documentDate: parsedDate, year, month } : {}),
        ...(data.direction ? { direction: data.direction } : {}),
        ...(data.senderReceiver !== undefined ? { senderReceiver: data.senderReceiver?.trim() || null } : {}),
        ...(data.externalNumber !== undefined ? { externalNumber: data.externalNumber?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.merchantId !== undefined ? { merchantId: data.merchantId || null } : {}),
      },
      include: {
        category: true,
        docConcept: true,
        merchant: { select: { id: true, firstName: true, lastName: true, dni: true } },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.marketDocument.delete({ where: { id } });
  }
}
