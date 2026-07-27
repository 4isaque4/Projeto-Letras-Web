import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  CompletionStatus,
  ContentAssetKind,
  Prisma,
  SyncAction,
  SyncEntityType,
  TutorLearnerLinkStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseStorageService } from '../../common/supabase/supabase-storage.service';
import { SyncEventService } from '../../common/sync/sync-event.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateAtividadeDto } from './dto/create-atividade.dto';
import { CreateBlueprintDto } from './dto/create-blueprint.dto';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { CreateTemaPainelDto } from './dto/create-tema.dto';
import { ImportBlueprintManifestDto } from './dto/import-blueprint-manifest.dto';
import { UploadAssetDto } from './dto/upload-asset.dto';

@Injectable()
export class PainelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEventService: SyncEventService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  async getDashboardAdmin() {
    const sevenDaysAgo = this.daysAgo(7);

    const [
      totalEducators,
      totalLearners,
      pendingLinks,
      confirmedLinks,
      totalThemes,
      totalUnits,
      totalActivities,
      totalAssets,
      totalBlueprints,
      completedLast7Days,
      syncEvents,
    ] = await this.prisma.$transaction([
      this.prisma.educator.count(),
      this.prisma.learnerProfile.count(),
      this.prisma.tutorLearnerLink.count({ where: { status: TutorLearnerLinkStatus.PENDING } }),
      this.prisma.tutorLearnerLink.count({ where: { status: TutorLearnerLinkStatus.CONFIRMED } }),
      this.prisma.theme.count(),
      this.prisma.learningUnit.count(),
      this.prisma.activity.count(),
      this.prisma.contentAsset.count(),
      this.prisma.mobileBlueprint.count(),
      this.prisma.completion.count({
        where: {
          status: CompletionStatus.COMPLETED,
          updatedAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      this.prisma.syncEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      indicadores: {
        totalEducators,
        totalLearners,
        pendingLinks,
        confirmedLinks,
        totalThemes,
        totalUnits,
        totalActivities,
        totalAssets,
        totalBlueprints,
        completedLast7Days,
      },
      eventosRecentes: syncEvents,
    };
  }

  async getDashboardTutor(tutorId: string) {
    const educator = await this.prisma.educator.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!educator) {
      throw new NotFoundException(`Tutor ${tutorId} nao encontrado.`);
    }

    const pendingLinks = await this.prisma.tutorLearnerLink.count({
      where: {
        educatorId: tutorId,
        status: TutorLearnerLinkStatus.PENDING,
      },
    });

    const confirmedLinks = await this.prisma.tutorLearnerLink.findMany({
      where: {
        educatorId: tutorId,
        status: TutorLearnerLinkStatus.CONFIRMED,
      },
      include: {
        learnerProfile: {
          include: {
            completions: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const ranking = await this.getRanking();
    const rankingPosition = ranking.findIndex((entry) => entry.educator.id === tutorId) + 1;

    return {
      tutor: educator,
      indicadores: {
        learnersConfirmed: confirmedLinks.length,
        pendingLinks,
        completedActivities: confirmedLinks.reduce((acc, link) => {
          const completed = link.learnerProfile.completions.filter(
            (completion) => completion.status === CompletionStatus.COMPLETED,
          ).length;
          return acc + completed;
        }, 0),
        rankingPosition: rankingPosition || null,
      },
      learners: confirmedLinks.map((link) => {
        const totalTracked = link.learnerProfile.completions.length;
        const completedCount = link.learnerProfile.completions.filter(
          (completion) => completion.status === CompletionStatus.COMPLETED,
        ).length;
        return {
          linkId: link.id,
          learner: {
            id: link.learnerProfile.id,
            displayName: link.learnerProfile.displayName,
            city: link.learnerProfile.city,
            uf: link.learnerProfile.uf,
          },
          progressPercent: totalTracked === 0 ? 0 : Math.round((completedCount / totalTracked) * 100),
          completedCount,
          totalTracked,
        };
      }),
    };
  }

  getConteudo() {
    return this.prisma.$transaction(async (tx) => {
      const themes = await tx.theme.findMany({
        include: {
          learningUnits: {
            include: {
              activities: {
                include: {
                  assets: {
                    include: {
                      asset: true,
                    },
                  },
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const assets = await tx.contentAsset.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      const blueprints = await tx.mobileBlueprint.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      return {
        fluxoInsercao: [
          { etapa: 1, titulo: 'Criar tema', explicacao: 'Organiza o assunto principal da alfabetizacao.' },
          { etapa: 2, titulo: 'Criar modulo', explicacao: 'Define o bloco de aulas dentro do tema.' },
          { etapa: 3, titulo: 'Criar atividade', explicacao: 'Define o que sera ensinado em cada tela.' },
          { etapa: 4, titulo: 'Vincular midia', explicacao: 'Conecta video, audio, imagem ou SVG da atividade.' },
          { etapa: 5, titulo: 'Cadastrar telas base', explicacao: 'Publica ou importa os blueprints da etapa.' },
        ],
        themes,
        assets,
        blueprints,
      };
    });
  }

  async createTema(dto: CreateTemaPainelDto) {
    try {
      const created = await this.prisma.theme.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      await this.syncEventService.record({
        entityType: SyncEntityType.THEME,
        entityId: created.id,
        action: SyncAction.CREATED,
        actorEducatorId: dto.actorEducatorId,
        payload: {
          name: created.name,
        },
      });

      return created;
    } catch (error) {
      this.handleConflict(error, 'Tema ja existente. Escolha outro nome.');
    }
  }

  async createModulo(dto: CreateModuloDto) {
    await this.ensureThemeExists(dto.themeId);

    const maxOrder = await this.prisma.learningUnit.aggregate({
      where: { themeId: dto.themeId },
      _max: { order: true },
    });

    const created = await this.prisma.learningUnit.create({
      data: {
        themeId: dto.themeId,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.LEARNING_UNIT,
      entityId: created.id,
      action: SyncAction.CREATED,
      actorEducatorId: dto.actorEducatorId,
      payload: {
        themeId: created.themeId,
        title: created.title,
      },
    });

    return created;
  }

  async createAtividade(dto: CreateAtividadeDto) {
    await this.ensureLearningUnitExists(dto.learningUnitId);

    if (dto.assetBindings && dto.assetBindings.length > 0) {
      const existingAssets = await this.prisma.contentAsset.findMany({
        where: {
          id: {
            in: dto.assetBindings.map((item) => item.assetId),
          },
        },
        select: { id: true },
      });

      if (existingAssets.length !== dto.assetBindings.length) {
        throw new NotFoundException('Um ou mais assets informados nao existem.');
      }
    }

    const maxOrder = await this.prisma.activity.aggregate({
      where: { learningUnitId: dto.learningUnitId },
      _max: { order: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          learningUnitId: dto.learningUnitId,
          title: dto.title,
          prompt: dto.prompt,
          content: dto.content as Prisma.InputJsonValue | undefined,
          instructorGuidance: dto.instructorGuidance,
          learnerGuidance: dto.learnerGuidance,
          type: dto.type,
          order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
        },
      });

      if (dto.assetBindings && dto.assetBindings.length > 0) {
        await tx.activityAsset.createMany({
          data: dto.assetBindings.map((binding) => ({
            activityId: activity.id,
            assetId: binding.assetId,
            role: binding.role,
          })),
        });
      }

      return tx.activity.findUniqueOrThrow({
        where: { id: activity.id },
        include: {
          assets: {
            include: {
              asset: true,
            },
          },
        },
      });
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.ACTIVITY,
      entityId: created.id,
      action: SyncAction.CREATED,
      actorEducatorId: dto.actorEducatorId,
      payload: {
        learningUnitId: created.learningUnitId,
        title: created.title,
      },
    });

    return created;
  }

  async createAsset(dto: CreateAssetDto) {
    try {
      const created = await this.prisma.contentAsset.create({
        data: {
          key: dto.key,
          kind: dto.kind,
          title: dto.title,
          description: dto.description,
          sourceUrl: dto.sourceUrl,
          mimeType: dto.mimeType,
          originalFileName: dto.originalFileName,
          bytes: dto.bytes,
          durationSeconds: dto.durationSeconds,
          checksum: dto.checksum,
          createdByEducatorId: dto.createdByEducatorId,
        },
      });

      await this.syncEventService.record({
        entityType: SyncEntityType.CONTENT_ASSET,
        entityId: created.id,
        action: SyncAction.CREATED,
        actorEducatorId: dto.createdByEducatorId,
        payload: {
          key: created.key,
          kind: created.kind,
          sourceUrl: created.sourceUrl,
        },
      });

      return created;
    } catch (error) {
      this.handleConflict(error, 'Asset com a mesma chave ja existe.');
    }
  }

  async uploadAssetFile(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    dto: UploadAssetDto,
  ) {
    if (!file || !file.buffer || file.size <= 0) {
      throw new BadRequestException('Arquivo nao enviado. Use o campo "file".');
    }

    if (dto.activityId) {
      await this.ensureActivityExists(dto.activityId);
    }

    const detectedKind = dto.kind ?? this.detectAssetKind(file.mimetype, file.originalname);
    const extension = this.detectExtension(file.originalname, file.mimetype);
    const objectPath = this.buildObjectPath(extension);
    const uploaded = await this.supabaseStorageService.uploadObject({
      objectPath,
      file: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    const title = dto.title?.trim() || this.titleFromFileName(file.originalname);
    const created = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.contentAsset.create({
        data: {
          key: dto.key ?? `asset_${randomUUID()}`,
          kind: detectedKind,
          title,
          description: dto.description?.trim(),
          sourceUrl: uploaded.publicUrl,
          mimeType: file.mimetype,
          originalFileName: file.originalname,
          bytes: file.size,
          createdByEducatorId: dto.createdByEducatorId,
        },
      });

      if (dto.activityId) {
        await tx.activityAsset.create({
          data: {
            activityId: dto.activityId,
            assetId: asset.id,
            role: dto.role?.trim(),
          },
        });
      }

      return asset;
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.CONTENT_ASSET,
      entityId: created.id,
      action: SyncAction.CREATED,
      actorEducatorId: dto.createdByEducatorId,
      payload: {
        sourceUrl: created.sourceUrl,
        kind: created.kind,
        bytes: created.bytes,
      },
    });

    return {
      asset: created,
      storage: uploaded,
      vinculado: Boolean(dto.activityId),
    };
  }

  async createBlueprint(dto: CreateBlueprintDto) {
    const created = await this.prisma.mobileBlueprint.create({
      data: {
        name: dto.name,
        description: dto.description,
        stage: dto.stage,
        screenType: dto.screenType,
        layoutJson: dto.layoutJson as Prisma.InputJsonValue,
        previewImageUrl: dto.previewImageUrl,
        status: dto.status,
        createdByEducatorId: dto.createdByEducatorId,
      },
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.MOBILE_BLUEPRINT,
      entityId: created.id,
      action: SyncAction.CREATED,
      actorEducatorId: dto.createdByEducatorId,
      payload: {
        stage: created.stage,
        screenType: created.screenType,
        status: created.status,
      },
    });

    return created;
  }

  async importBlueprintManifest(dto: ImportBlueprintManifestDto) {
    const imported = await this.prisma.$transaction(async (tx) => {
      const createdBlueprints = [];
      for (const screen of dto.screens) {
        const blueprint = await tx.mobileBlueprint.create({
          data: {
            name: screen.name,
            description: screen.description,
            stage: screen.stage,
            screenType: screen.screenType,
            layoutJson: screen.layoutJson as Prisma.InputJsonValue,
            previewImageUrl: screen.previewImageUrl,
            status: screen.status,
            createdByEducatorId: dto.importedByEducatorId,
          },
        });
        createdBlueprints.push(blueprint);
      }

      const manifestLog = await tx.blueprintManifestImport.create({
        data: {
          sourceName: dto.sourceName,
          importedCount: createdBlueprints.length,
          manifestJson: dto.screens as unknown as Prisma.InputJsonValue,
          importedByEducatorId: dto.importedByEducatorId,
        },
      });

      return {
        manifestLog,
        createdBlueprints,
      };
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.MOBILE_BLUEPRINT,
      entityId: imported.manifestLog.id,
      action: SyncAction.IMPORTED,
      actorEducatorId: dto.importedByEducatorId,
      payload: {
        sourceName: dto.sourceName,
        importedCount: imported.createdBlueprints.length,
      },
    });

    return imported;
  }

  getFila() {
    return this.prisma.tutorLearnerLink.findMany({
      where: {
        status: TutorLearnerLinkStatus.PENDING,
      },
      include: {
        educator: {
          select: {
            id: true,
            name: true,
            phoneDigits: true,
          },
        },
        learnerProfile: {
          select: {
            id: true,
            displayName: true,
            cpfOrPassport: true,
            phoneDigits: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });
  }

  async getRanking() {
    const educators = await this.prisma.educator.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        uf: true,
        totalScore: true,
        tutorLearnerLinks: {
          where: { status: TutorLearnerLinkStatus.CONFIRMED },
          select: { id: true },
        },
      },
    });

    return educators
      .map((educator) => ({
        educator: {
          id: educator.id,
          name: educator.name,
          city: educator.city,
          uf: educator.uf,
        },
        learnersConfirmed: educator.tutorLearnerLinks.length,
        score: educator.totalScore,
      }))
      .sort((a, b) => b.score - a.score);
  }

  async getRelatorioInatividade(daysWithoutInteraction = 7) {
    const threshold = this.daysAgo(daysWithoutInteraction);

    const learners = await this.prisma.learnerProfile.findMany({
      include: {
        completions: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
        session: {
          select: {
            updatedAt: true,
          },
        },
        tutorLearnerLinks: {
          where: {
            status: TutorLearnerLinkStatus.CONFIRMED,
          },
          include: {
            educator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return learners
      .map((learner) => {
        const completionDate = learner.completions[0]?.updatedAt;
        const sessionDate = learner.session?.updatedAt;
        const lastInteractionAt =
          [completionDate, sessionDate, learner.updatedAt].filter((item): item is Date => !!item).sort((a, b) => b.getTime() - a.getTime())[0] ??
          learner.updatedAt;
        const daysInactive = Math.floor((Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));

        return {
          learnerId: learner.id,
          learnerName: learner.displayName,
          city: learner.city,
          uf: learner.uf,
          lastInteractionAt,
          daysInactive,
          tutor: learner.tutorLearnerLinks[0]?.educator ?? null,
        };
      })
      .filter((entry) => entry.lastInteractionAt <= threshold)
      .sort((a, b) => b.daysInactive - a.daysInactive);
  }

  async getGrupos() {
    const learners = await this.prisma.learnerProfile.findMany({
      where: {
        tutorLearnerLinks: {
          some: {
            status: TutorLearnerLinkStatus.CONFIRMED,
          },
        },
      },
      select: {
        id: true,
        displayName: true,
        city: true,
        uf: true,
      },
    });

    const groupsByLocation = new Map<
      string,
      {
        city: string;
        uf: string;
        learners: Array<{ id: string; displayName: string }>;
      }
    >();

    for (const learner of learners) {
      const city = learner.city ?? 'Sem cidade';
      const uf = learner.uf ?? 'Sem UF';
      const key = `${uf}-${city}`;
      const group = groupsByLocation.get(key) ?? {
        city,
        uf,
        learners: [],
      };
      group.learners.push({
        id: learner.id,
        displayName: learner.displayName,
      });
      groupsByLocation.set(key, group);
    }

    return {
      mode: 'INDIVIDUAL',
      note: 'Etapa 1 opera em modo individual. Grupos sao exibidos somente para organizacao geografica da coordenacao.',
      groups: Array.from(groupsByLocation.values()).map((group) => ({
        ...group,
        learnersCount: group.learners.length,
      })),
    };
  }

  getEventos(limit = 50, entityType?: SyncEntityType) {
    return this.prisma.syncEvent.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
      },
      include: {
        actorEducator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async getCompletedActivityIds(learnerProfileId: string) {
    const completions = await this.prisma.completion.findMany({
      where: { learnerProfileId, status: 'COMPLETED' },
      select: { activityId: true },
    });
    return { completedActivityIds: completions.map((c) => c.activityId) };
  }

  async getTutorials(educatorId: string) {
    type MediaRow = {
      id: string; slug: string | null; title: string; description: string | null;
      kind: string; duration_sec: number | null; public_url: string | null;
      tags: string[]; metadata: Record<string, unknown>;
    };
    type ProgressRow = {
      assetId: string; isCompleted: boolean; completedAt: Date | null;
      watchCount: number; positionSec: number;
    };

    const [assets, progresses] = await Promise.all([
      this.prisma.$queryRaw<MediaRow[]>`
        SELECT id::text, slug, title, description, kind,
               duration_sec, public_url, tags,
               metadata
        FROM media_library
        WHERE is_active = true
        ORDER BY created_at ASC
      `,
      this.prisma.educatorTutorialProgress.findMany({
        where: { educatorId },
        select: { assetId: true, isCompleted: true, completedAt: true, watchCount: true, positionSec: true },
      }),
    ]);

    const progressByAssetId = new Map((progresses as ProgressRow[]).map((p) => [p.assetId, p]));

    return assets.map((asset) => {
      const progress = progressByAssetId.get(asset.id) ?? null;
      return {
        id: asset.id,
        slug: asset.slug ?? null,
        title: asset.title,
        description: asset.description ?? null,
        kind: asset.kind,
        duration_sec: asset.duration_sec ?? null,
        public_url: asset.public_url ?? null,
        tags: asset.tags ?? [],
        metadata: asset.metadata ?? {},
        completion: progress
          ? {
              completed_at: progress.completedAt?.toISOString() ?? null,
              position_sec: progress.positionSec,
              watch_count: progress.watchCount,
              is_completed: progress.isCompleted,
            }
          : null,
      };
    });
  }

  async markTutorialProgress(assetId: string, educatorId: string, markCompleted: boolean, positionSec: number) {
    type ExistsRow = { id: string };
    const rows = await this.prisma.$queryRaw<ExistsRow[]>`
      SELECT id::text FROM media_library WHERE id = ${assetId}::uuid LIMIT 1
    `;
    if (!rows.length) {
      throw new NotFoundException(`Tutorial ${assetId} não encontrado.`);
    }

    const now = new Date();
    const existing = await this.prisma.educatorTutorialProgress.findUnique({
      where: { educatorId_assetId: { educatorId, assetId } },
    });

    if (existing) {
      return this.prisma.educatorTutorialProgress.update({
        where: { educatorId_assetId: { educatorId, assetId } },
        data: {
          positionSec,
          watchCount: { increment: 1 },
          ...(markCompleted && !existing.isCompleted
            ? { isCompleted: true, completedAt: now }
            : {}),
        },
      });
    }

    return this.prisma.educatorTutorialProgress.create({
      data: {
        educatorId,
        assetId,
        positionSec,
        watchCount: 1,
        isCompleted: markCompleted,
        completedAt: markCompleted ? now : null,
      },
    });
  }

  async createSupportRequest(learnerProfileId: string, currentActivityId?: string) {
    const session = await this.prisma.learnerSession.findUnique({
      where: { learnerProfileId },
      select: { id: true },
    });
    if (!session) {
      return { ok: true };
    }
    // Apenas registra helpRequestedAt — o bloqueio de tela é gerenciado
    // via realtime (socket.io) e pelo educador, não por chamada HTTP anônima.
    await this.prisma.sessionState.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        currentView: 'home',
        statePayload: {},
        isLocked: false,
        helpRequestedAt: new Date(),
        currentActivityId: currentActivityId ?? null,
      },
      update: {
        helpRequestedAt: new Date(),
        ...(currentActivityId ? { currentActivityId } : {}),
      },
    });
    return { ok: true };
  }

  async getLearnerScore(learnerProfileId: string) {
    const [completions, totalActivities] = await Promise.all([
      this.prisma.completion.findMany({
        where: { learnerProfileId },
        select: { status: true, score: true },
      }),
      this.prisma.activity.count(),
    ]);

    const completedCount = completions.filter((c) => c.status === 'COMPLETED').length;
    const totalPoints = completions
      .filter((c) => c.status === 'COMPLETED' && c.score !== null)
      .reduce((sum, c) => sum + Math.round((c.score ?? 0) * 10), 0);

    return { totalPoints, completedCount, totalActivities };
  }

  private async ensureThemeExists(themeId: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { id: themeId },
      select: { id: true },
    });
    if (!theme) {
      throw new NotFoundException(`Tema ${themeId} nao encontrado.`);
    }
  }

  private async ensureLearningUnitExists(learningUnitId: string) {
    const learningUnit = await this.prisma.learningUnit.findUnique({
      where: { id: learningUnitId },
      select: { id: true },
    });
    if (!learningUnit) {
      throw new NotFoundException(`Modulo ${learningUnitId} nao encontrado.`);
    }
  }

  private async ensureActivityExists(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    if (!activity) {
      throw new NotFoundException(`Atividade ${activityId} nao encontrada.`);
    }
  }

  private handleConflict(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw error;
  }

  async resolveEducatorIdFromToken(authorization: string | undefined): Promise<string> {
    if (!authorization) throw new UnauthorizedException('Token de autenticação ausente.');
    const token = authorization.replace(/^bearer\s+/i, '');
    const session = await this.prisma.educatorAuthSession.findUnique({
      where: { token },
      select: { educatorId: true, expiresAt: true, revokedAt: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    return session.educatorId;
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private detectAssetKind(mimeType: string | undefined, originalName: string): ContentAssetKind {
    const mime = (mimeType || '').toLowerCase();
    const lowerName = originalName.toLowerCase();

    if (mime.includes('image/svg') || lowerName.endsWith('.svg')) {
      return ContentAssetKind.SVG;
    }
    if (mime.startsWith('image/')) {
      return ContentAssetKind.IMAGE;
    }
    if (mime.startsWith('video/')) {
      return ContentAssetKind.VIDEO;
    }
    if (mime.startsWith('audio/')) {
      return ContentAssetKind.AUDIO;
    }

    return ContentAssetKind.OTHER;
  }

  private detectExtension(originalName: string, mimeType: string | undefined): string {
    const fromName = originalName.split('.').pop()?.trim().toLowerCase();
    if (fromName) {
      return fromName;
    }

    const mime = (mimeType || '').toLowerCase();
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('mpeg')) return 'mp3';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('svg')) return 'svg';

    return 'bin';
  }

  private buildObjectPath(extension: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const unique = randomUUID();
    return `conteudo/${year}/${month}/${unique}.${extension}`;
  }

  private titleFromFileName(fileName: string): string {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    return baseName.trim() || 'Arquivo de conteudo';
  }
}
