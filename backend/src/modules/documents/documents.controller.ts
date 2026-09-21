import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const uploadDocsDir = join(process.cwd(), 'uploads', 'general_documents');
if (!fs.existsSync(uploadDocsDir)) {
  fs.mkdirSync(uploadDocsDir, { recursive: true });
}

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private docsService: DocumentsService) {}

  // --- CATEGORÍAS ---
  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías de documentos' })
  async findCategories() {
    return this.docsService.findCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Crear categoría de documentos' })
  async createCategory(@Body() body: { name: string; code?: string; direction?: string; description?: string }) {
    return this.docsService.createCategory(body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Actualizar categoría de documentos' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; direction?: string; description?: string; isActive?: boolean },
  ) {
    return this.docsService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Desactivar categoría de documentos' })
  async deleteCategory(@Param('id') id: string) {
    return this.docsService.deleteCategory(id);
  }

  // --- CONCEPTOS ---
  @Get('concepts')
  @ApiOperation({ summary: 'Listar conceptos de documentos' })
  async findConcepts() {
    return this.docsService.findConcepts();
  }

  @Post('concepts')
  @ApiOperation({ summary: 'Crear concepto de documentos' })
  async createConcept(@Body() body: { name: string; code?: string; description?: string }) {
    return this.docsService.createConcept(body);
  }

  @Patch('concepts/:id')
  @ApiOperation({ summary: 'Actualizar concepto de documentos' })
  async updateConcept(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.docsService.updateConcept(id, body);
  }

  @Delete('concepts/:id')
  @ApiOperation({ summary: 'Desactivar concepto de documentos' })
  async deleteConcept(@Param('id') id: string) {
    return this.docsService.deleteConcept(id);
  }

  // --- DOCUMENTOS ---
  @Get()
  @ApiOperation({ summary: 'Listar documentos con filtros por año, mes, concepto, categoría, dirección y comerciante' })
  async findAll(
    @Query('concept') concept?: string,
    @Query('conceptId') conceptId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('direction') direction?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('merchantId') merchantId?: string,
    @Query('search') search?: string,
  ) {
    return this.docsService.findAll({
      concept,
      conceptId,
      categoryId,
      direction,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      startDate,
      endDate,
      merchantId,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.docsService.findOne(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Subir nuevo documento con fecha histórica, concepto y categoría' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDocsDir),
        filename: (_req, file, cb) => {
          const cleanName = 'doc-' + Date.now() + '-' + Math.round(Math.random() * 1e4) + extname(file.originalname).toLowerCase();
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
    }),
  )
  async upload(
    @UploadedFile() file: any,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('Archivo no proporcionado');

    const fileUrl = '/api/uploads/general_documents/' + file.filename;
    return this.docsService.create({
      title: body.title || file.originalname,
      concept: body.concept || 'OTROS',
      conceptId: body.conceptId && body.conceptId !== '' ? body.conceptId : undefined,
      categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : undefined,
      documentDate: body.documentDate || undefined,
      direction: body.direction || 'INTERNO',
      senderReceiver: body.senderReceiver || undefined,
      externalNumber: body.externalNumber || undefined,
      fileUrl,
      fileName: file.originalname,
      fileType: extname(file.originalname).replace('.', '').toUpperCase(),
      fileSize: file.size,
      description: body.description,
      merchantId: body.merchantId && body.merchantId !== '' ? body.merchantId : undefined,
      uploadedById: user?.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar metadatos de un documento' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.docsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.docsService.delete(id);
  }
}
