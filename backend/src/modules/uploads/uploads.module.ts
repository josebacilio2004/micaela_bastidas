import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
