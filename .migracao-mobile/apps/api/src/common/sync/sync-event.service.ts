import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SyncAction, SyncEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordSyncEventInput {
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  actorEducatorId?: string;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class SyncEventService {
  private readonly logger = new Logger(SyncEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordSyncEventInput) {
    const created = await this.prisma.syncEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorEducatorId: input.actorEducatorId,
        payload: input.payload,
      },
    });

    this.logger.log(
      `sync_event action=${created.action} entityType=${created.entityType} entityId=${created.entityId}`,
    );

    return created;
  }
}
