import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { SyncModule } from './common/sync/sync.module';
import { AuthModule } from './modules/auth/auth.module';
import { CadastrosModule } from './modules/cadastros/cadastros.module';
import { HealthModule } from './modules/health/health.module';
import { LearnerModule } from './modules/learner/learner.module';
import { LearningContentModule } from './modules/learning-content/learning-content.module';
import { PainelModule } from './modules/painel/painel.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { SessionModule } from './modules/session/session.module';
import { ThemeModule } from './modules/theme/theme.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SyncModule,
    AuthModule,
    HealthModule,
    LearnerModule,
    ThemeModule,
    LearningContentModule,
    SessionModule,
    ProgressModule,
    ScoringModule,
    ReferenceModule,
    RealtimeModule,
    CadastrosModule,
    PainelModule,
  ],
})
export class AppModule {}
