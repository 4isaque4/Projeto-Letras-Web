import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { SyncEntityType } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateAtividadeDto } from './dto/create-atividade.dto';
import { CreateBlueprintDto } from './dto/create-blueprint.dto';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { CreateTemaPainelDto } from './dto/create-tema.dto';
import { ImportBlueprintManifestDto } from './dto/import-blueprint-manifest.dto';
import { MarkTutorialProgressDto } from './dto/mark-tutorial-progress.dto';
import { UploadAssetDto } from './dto/upload-asset.dto';
import { PainelService } from './painel.service';
import { TrackProgressDto } from '../progress/dto/track-progress.dto';
import { ProgressService } from '../progress/progress.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('painel')
export class PainelController {
  constructor(
    private readonly painelService: PainelService,
    private readonly progressService: ProgressService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('notificacoes')
  async getNotificacoes(
    @Headers('authorization') authorization: string | undefined,
    @Query('educatorId') educatorId?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    if (!educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    const tokenEducatorId = await this.painelService.resolveEducatorIdFromToken(authorization);
    if (tokenEducatorId !== educatorId) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.notificationsService.list(educatorId, onlyUnread === 'true');
  }

  @Post('notificacoes/marcar-lidas')
  async markNotificacoesLidas(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { educatorId?: string; ids?: string[] },
  ) {
    if (!body?.educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    const tokenEducatorId = await this.painelService.resolveEducatorIdFromToken(authorization);
    if (tokenEducatorId !== body.educatorId) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.notificationsService.markRead(body.educatorId, body.ids);
  }

  @Get('dashboard/admin')
  getDashboardAdmin() {
    return this.painelService.getDashboardAdmin();
  }

  @Get('dashboard/tutor')
  getDashboardTutor(@Query('tutorId') tutorId?: string) {
    if (!tutorId) {
      throw new BadRequestException('tutorId is required');
    }
    return this.painelService.getDashboardTutor(tutorId);
  }

  @Get('conteudo')
  getConteudo() {
    return this.painelService.getConteudo();
  }

  @Post('conteudo/temas')
  createTema(@Body() dto: CreateTemaPainelDto) {
    return this.painelService.createTema(dto);
  }

  @Post('conteudo/modulos')
  createModulo(@Body() dto: CreateModuloDto) {
    return this.painelService.createModulo(dto);
  }

  @Post('conteudo/atividades')
  createAtividade(@Body() dto: CreateAtividadeDto) {
    return this.painelService.createAtividade(dto);
  }

  @Post('conteudo/assets')
  createAsset(@Body() dto: CreateAssetDto) {
    return this.painelService.createAsset(dto);
  }

  @Post('conteudo/assets/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  uploadAsset(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
          size: number;
        }
      | undefined,
    @Body() dto: UploadAssetDto,
  ) {
    return this.painelService.uploadAssetFile(file, dto);
  }

  @Post('conteudo/blueprints')
  createBlueprint(@Body() dto: CreateBlueprintDto) {
    return this.painelService.createBlueprint(dto);
  }

  @Post('conteudo/blueprints/import-manifest')
  importBlueprintManifest(@Body() dto: ImportBlueprintManifestDto) {
    return this.painelService.importBlueprintManifest(dto);
  }

  @Post('progress')
  trackProgress(@Body() dto: TrackProgressDto) {
    return this.progressService.trackProgress(dto);
  }

  @Get('progress/:learnerProfileId')
  getProgress(@Param('learnerProfileId') learnerProfileId: string) {
    return this.painelService.getCompletedActivityIds(learnerProfileId);
  }

  @Get('tutoriais')
  async getTutoriais(@Headers('authorization') authorization: string | undefined) {
    const educatorId = await this.painelService.resolveEducatorIdFromToken(authorization);
    return this.painelService.getTutorials(educatorId);
  }

  @Post('tutoriais/:id/progresso')
  async markTutorialProgress(
    @Param('id') id: string,
    @Body() dto: MarkTutorialProgressDto,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const educatorId = await this.painelService.resolveEducatorIdFromToken(authorization);
    return this.painelService.markTutorialProgress(
      id,
      educatorId,
      dto.markCompleted ?? false,
      dto.positionSec ?? 0,
    );
  }

  @Get('score/:learnerProfileId')
  getLearnerScore(@Param('learnerProfileId') learnerProfileId: string) {
    // Endpoint de leitura sem auth de learner (sistema sem token de learner por design).
    // Retorna apenas contagens — sem PII.
    return this.painelService.getLearnerScore(learnerProfileId);
  }

  @Post('support-requests')
  createSupportRequest(@Body() body: { learnerProfileId?: string; activityId?: string; currentActivityId?: string }) {
    // Learner não tem token — apenas registra helpRequestedAt sem alterar isLocked.
    const learnerId = body.learnerProfileId;
    if (!learnerId) throw new BadRequestException('learnerProfileId is required');
    return this.painelService.createSupportRequest(learnerId, body.activityId ?? body.currentActivityId);
  }

  @Get('fila')
  getFila() {
    return this.painelService.getFila();
  }

  @Get('ranking')
  getRanking() {
    return this.painelService.getRanking();
  }

  @Get('relatorios/inatividade')
  getRelatorioInatividade(@Query('days', new ParseIntPipe({ optional: true })) days?: number) {
    return this.painelService.getRelatorioInatividade(days);
  }

  @Get('grupos')
  getGrupos() {
    return this.painelService.getGrupos();
  }

  @Get('eventos')
  getEventos(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('entityType') entityType?: SyncEntityType,
  ) {
    return this.painelService.getEventos(limit, entityType);
  }
}
