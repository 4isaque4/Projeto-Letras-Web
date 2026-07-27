import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// PrismaModule é @Global() — PrismaService já está disponível sem import.
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
