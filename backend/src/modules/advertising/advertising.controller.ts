import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { AdvertisingService } from './advertising.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const uploadAudioDir = join(process.cwd(), 'uploads', 'advertising_audio');
if (!fs.existsSync(uploadAudioDir)) {
  fs.mkdirSync(uploadAudioDir, { recursive: true });
}

@ApiTags('Advertising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('advertising')
export class AdvertisingController {
  constructor(private advService: AdvertisingService) {}

  // --- GUIONES PRE-ESCRITOS ---
  @Get('scripts')
  @ApiOperation({ summary: 'Listar biblioteca de guiones pre-escritos' })
  async findScripts(@Query('category') category?: string) {
    return this.advService.findScripts(category);
  }

  @Get('scripts/:id')
  @ApiOperation({ summary: 'Obtener guión por ID' })
  async findScriptById(@Param('id') id: string) {
    return this.advService.findScriptById(id);
  }

  @Post('scripts')
  @ApiOperation({ summary: 'Crear nuevo guión pre-escrito' })
  async createScript(@Body() body: {
    title: string;
    category: string;
    content: string;
    estimatedDurationSeconds?: number;
  }) {
    return this.advService.createScript(body);
  }

  @Patch('scripts/:id')
  @ApiOperation({ summary: 'Actualizar guión pre-escrito' })
  async updateScript(@Param('id') id: string, @Body() body: any) {
    return this.advService.updateScript(id, body);
  }

  @Delete('scripts/:id')
  @ApiOperation({ summary: 'Desactivar guión pre-escrito' })
  async deleteScript(@Param('id') id: string) {
    return this.advService.deleteScript(id);
  }

  // --- PUBLICIDADES / SPOTS ---
  @Get()
  @ApiOperation({ summary: 'Listar todas las campañas publicitarias' })
  async findAll() {
    return this.advService.findAll();
  }

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Obtener comprobante/ticket imprimible de la publicidad' })
  async getTicket(@Param('id') id: string) {
    return this.advService.getTicket(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.advService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva publicidad y generar ticket' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    return this.advService.create({
      ...body,
      createdById: user?.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de una publicidad' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.advService.update(id, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.advService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.advService.delete(id);
  }

  @Post('upload-audio')
  @ApiOperation({ summary: 'Subir archivo de audio MP3/WAV/OGG para publicidad' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadAudioDir),
        filename: (_req, file, cb) => {
          const cleanName = 'spot-' + Date.now() + '-' + Math.round(Math.random() * 1e4) + extname(file.originalname).toLowerCase();
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  )
  async uploadAudio(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Archivo de audio no proporcionado');
    return {
      audioUrl: '/api/uploads/advertising_audio/' + file.filename,
      fileName: file.originalname,
    };
  }
}
