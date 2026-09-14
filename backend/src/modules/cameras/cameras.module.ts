import { Module, OnModuleInit } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { CamerasController } from './cameras.controller';

@Module({
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService],
})
export class CamerasModule implements OnModuleInit {
  constructor(private camerasService: CamerasService) {}

  async onModuleInit() {
    try {
      await this.camerasService.seedDefaultCameras();
    } catch (e) {
      console.warn('Error auto-seeding cameras:', e);
    }
  }
}
