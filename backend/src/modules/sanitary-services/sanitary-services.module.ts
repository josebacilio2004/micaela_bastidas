import { Module } from '@nestjs/common';
import { SanitaryServicesService } from './sanitary-services.service';
import { SanitaryServicesController } from './sanitary-services.controller';

@Module({
  controllers: [SanitaryServicesController],
  providers: [SanitaryServicesService],
  exports: [SanitaryServicesService],
})
export class SanitaryServicesModule {}
