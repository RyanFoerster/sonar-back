import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalCounter } from './entities/global-counter.entity';
import { GlobalCounterService } from './global-counter.service';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalCounter])],
  providers: [GlobalCounterService],
  exports: [GlobalCounterService],
})
export class GlobalCounterModule {}
