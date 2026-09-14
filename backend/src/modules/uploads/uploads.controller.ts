import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const uploadDirPhotos = join(process.cwd(), 'uploads', 'merchants', 'photos');
const uploadDirDocs = join(process.cwd(), 'uploads', 'merchants', 'documents');

// Ensure upload directories exist
[uploadDirPhotos, uploadDirDocs].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private prisma: PrismaService) {}

  @Post('merchant/:id/photo')
  @ApiOperation({ summary: 'Subir foto de perfil de comerciante (JPG, PNG, WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, uploadDirPhotos);
        },
        filename: (req, file, cb) => {
          const merchantId = req.params.id || 'merchant';
          const ext = extname(file.originalname).toLowerCase();
          const cleanName = `photo-${merchantId}-${Date.now()}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadMerchantPhoto(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const photoUrl = `/api/uploads/merchants/photos/${file.filename}`;
    await this.prisma.merchant.update({
      where: { id },
      data: { photoUrl },
    });

    return {
      message: 'Foto de perfil actualizada con éxito',
      photoUrl,
      fileName: file.filename,
    };
  }

  @Post('merchant/:id/utility-document')
  @ApiOperation({ summary: 'Subir recibo de luz y agua (PDF o imagen)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, uploadDirDocs);
        },
        filename: (req, file, cb) => {
          const merchantId = req.params.id || 'merchant';
          const ext = extname(file.originalname).toLowerCase();
          const cleanName = `recibo-${merchantId}-${Date.now()}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Solo se permiten archivos PDF o imágenes (JPG, PNG)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadMerchantUtilityDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const utilityBillPdfUrl = `/api/uploads/merchants/documents/${file.filename}`;
    await this.prisma.merchant.update({
      where: { id },
      data: {
        utilityBillPdfUrl,
        utilityBillUploadedAt: new Date(),
      },
    });

    return {
      message: 'Recibo de luz y agua subido con éxito',
      utilityBillPdfUrl,
      fileName: file.filename,
      uploadedAt: new Date(),
    };
  }
}
