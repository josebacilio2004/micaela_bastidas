import { Module } from '@nestjs/common';
import { FaenasService } from './faenas.service';
import { FaenasController } from './faenas.controller';

@Module({
  controllers: [FaenasController],
  providers: [FaenasService],
  exports: [FaenasService],
})
export class FaenasModule {}
