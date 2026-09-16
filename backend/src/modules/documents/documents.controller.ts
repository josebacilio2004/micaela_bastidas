import {
  Controller,
  Get,
  Post,
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

  @Get()
  @ApiOperation({ summary: 'Listar documentos con filtros por concepto y comerciante' })
  async findAll(
    @Query('concept') concept?: string,
    @Query('merchantId') merchantId?: string,
    @Query('search') search?: string,
  ) {
    return this.docsService.findAll(concept, merchantId, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.docsService.findOne(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Subir nuevo documento clasificado por concepto' })
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
      fileUrl,
      fileName: file.originalname,
      fileType: extname(file.originalname).replace('.', '').toUpperCase(),
      fileSize: file.size,
      description: body.description,
      merchantId: body.merchantId && body.merchantId !== '' ? body.merchantId : undefined,
      uploadedById: user?.id,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.docsService.delete(id);
  }
}
