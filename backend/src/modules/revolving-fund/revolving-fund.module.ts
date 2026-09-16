import { Module } from '@nestjs/common';
import { RevolvingFundService } from './revolving-fund.service';
import { RevolvingFundController } from './revolving-fund.controller';

@Module({
  controllers: [RevolvingFundController],
  providers: [RevolvingFundService],
  exports: [RevolvingFundService],
})
export class RevolvingFundModule {}
