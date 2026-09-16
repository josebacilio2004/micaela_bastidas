import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdvertisingService } from './advertising.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const uploadAudioDir = join(process.cwd(), 'uploads', 'advertising');
if (!fs.existsSync(uploadAudioDir)) {
  fs.mkdirSync(uploadAudioDir, { recursive: true });
}

@ApiTags('Advertising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('advertising')
export class AdvertisingController {
  constructor(private advService: AdvertisingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las publicidades y cuñas' })
  async findAll() {
    return this.advService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.advService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear campaña publicitaria o cuña' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    return this.advService.create({
      ...body,
      createdById: user?.id,
    });
  }

  @Post('upload-audio')
  @ApiOperation({ summary: 'Subir archivo de audio para perifoneo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadAudioDir),
        filename: (_req, file, cb) => {
          const cleanName = 'spot-' + Date.now() + extname(file.originalname).toLowerCase();
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadAudio(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se ha subido ningún audio');
    return {
      audioUrl: '/api/uploads/advertising/' + file.filename,
      fileName: file.filename,
    };
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.advService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.advService.delete(id);
  }
}
