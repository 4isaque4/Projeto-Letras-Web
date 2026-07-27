import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncEventService } from './sync-event.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SyncEventService],
  exports: [SyncEventService],
})
export class SyncModule {}
