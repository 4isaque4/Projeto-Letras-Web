import { Module } from '@nestjs/common';
import { SupabaseStorageService } from '../../common/supabase/supabase-storage.service';
import { ScoringModule } from '../scoring/scoring.module';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';
import { ProgressService } from '../progress/progress.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScoringModule, NotificationsModule],
  controllers: [PainelController],
  providers: [PainelService, SupabaseStorageService, ProgressService],
})
export class PainelModule {}
