import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, SessionRequestStatus, SyncAction, SyncEntityType, TutorLearnerLinkStatus } from '@prisma/client';
import { CreateSessionRequestDto } from './dto/create-session-request.dto';
import { RespondSessionRequestDto } from './dto/respond-session-request.dto';
import { hashPassword } from '../../common/security/password-hash';
import { SyncEventService } from '../../common/sync/sync-event.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAlfabetizadorDto } from './dto/create-alfabetizador.dto';
import { CreateAlfabetizandoDto } from './dto/create-alfabetizando.dto';
import { CreateVinculoDto } from './dto/create-vinculo.dto';
import { UpdateVinculoDto } from './dto/update-vinculo.dto';

@Injectable()
export class CadastrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEventService: SyncEventService,
  ) {}

  listAlfabetizadores() {
    return this.prisma.educator.findMany({
      include: {
        _count: {
          select: {
            learners: true,
            tutorLearnerLinks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAlfabetizadorById(id: string, authorization: string | undefined) {
    await this.resolveEducatorIdFromToken(authorization);
    const educator = await this.prisma.educator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneDigits: true,
        city: true,
        uf: true,
        linkedin: true,
        facebook: true,
        instagram: true,
        xHandle: true,
        totalScore: true,
      },
    });
    if (!educator) {
      throw new NotFoundException(`Alfabetizador ${id} não encontrado.`);
    }
    return {
      ...educator,
      socials: {
        linkedin: educator.linkedin,
        facebook: educator.facebook,
        instagram: educator.instagram,
        xHandle: educator.xHandle,
      },
    };
  }

  async createAlfabetizador(dto: CreateAlfabetizadorDto) {
    try {
      const created = await this.prisma.educator.create({
        data: {
          name: dto.name,
          email: dto.email,
          cpf: dto.cpf,
          phoneDigits: dto.phoneDigits,
          birthDate: dto.birthDate,
          uf: dto.uf,
          city: dto.city,
          photoUri: dto.photoUri,
          educationLevel: dto.educationLevel,
          trainingArea: dto.trainingArea,
          linkedin: dto.linkedin,
          facebook: dto.facebook,
          instagram: dto.instagram,
          xHandle: dto.xHandle,
          passwordHash: dto.password ? hashPassword(dto.password) : null,
        },
      });

      await this.syncEventService.record({
        entityType: SyncEntityType.EDUCATOR,
        entityId: created.id,
        action: SyncAction.CREATED,
        payload: {
          name: created.name,
          email: created.email,
        },
      });

      return created;
    } catch (error) {
      this.handlePrismaConflict(error, 'Nao foi possivel cadastrar alfabetizador. Verifique email/cpf.');
    }
  }

  async listAlfabetizandos(educatorId?: string) {
    return this.prisma.learnerProfile.findMany({
      where: educatorId ? { educatorId } : undefined,
      select: {
        id: true,
        displayName: true,
        cpfOrPassport: true,
        phoneDigits: true,
        learnerThemes: {
          select: { theme: { select: { name: true } } },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        displayName: 'asc',
      },
    });
  }

  async getLockedSessions(educatorId: string) {
    return this.prisma.learnerProfile.findMany({
      where: {
        educatorId,
        session: { sessionState: { isLocked: true } },
      },
      select: {
        id: true,
        displayName: true,
        phoneDigits: true,
        session: {
          select: {
            sessionState: {
              select: { currentView: true, updatedAt: true },
            },
          },
        },
      },
    });
  }

  async buscarAlfabetizando({ cpfOrPassport, phoneDigits }: { cpfOrPassport?: string; phoneDigits?: string }) {
    if (!cpfOrPassport && !phoneDigits) {
      throw new BadRequestException('Forneça cpfOrPassport ou phoneDigits para buscar.');
    }

    let where: { cpfOrPassport?: string; phoneDigits?: string | null; OR?: { cpfOrPassport: string }[] };
    if (cpfOrPassport) {
      const digitsOnly = cpfOrPassport.replace(/\D/g, '');
      const candidates = new Set([cpfOrPassport]);
      if (digitsOnly !== cpfOrPassport) candidates.add(digitsOnly);
      if (digitsOnly === cpfOrPassport && digitsOnly.length === 11) {
        const d = digitsOnly;
        candidates.add(`${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`);
      }
      const list = [...candidates];
      where = list.length === 1
        ? { cpfOrPassport: list[0] }
        : { OR: list.map((v) => ({ cpfOrPassport: v })) };
    } else {
      where = { phoneDigits };
    }

    const learner = await this.prisma.learnerProfile.findFirst({
      where,
      select: {
        id: true,
        displayName: true,
        phoneDigits: true,
        educator: {
          select: { id: true, name: true, phoneDigits: true },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException('Alfabetizando não encontrado. Verifique os dados ou entre em contato com seu educador.');
    }

    return learner;
  }

  async getAlfabetizandoById(id: string, authorization: string | undefined) {
    // If an educator token is present, verify ownership before returning full PII.
    // Without a token the learner can view their own profile (limited educator fields).
    let requestingEducatorId: string | null = null;
    if (authorization) {
      requestingEducatorId = await this.resolveEducatorIdFromToken(authorization);
    }

    // Learner self-access (no token): lightweight query without nested themes/completions
    // to avoid timeouts on development databases with lots of data.
    if (requestingEducatorId === null) {
      const learner = await this.prisma.learnerProfile.findUnique({
        where: { id },
        select: {
          id: true,
          displayName: true,
          cpfOrPassport: true,
          phoneDigits: true,
          birthDate: true,
          uf: true,
          city: true,
          photoUri: true,
          educator: { select: { id: true, name: true } },
        },
      });
      if (!learner) throw new NotFoundException(`Alfabetizando ${id} nao encontrado.`);
      return {
        ...learner,
        notes: null,
        createdAt: null,
        educatorId: learner.educator?.id ?? null,
        progresso: { totalTracked: 0, completedCount: 0, progressPercent: 0 },
      };
    }

    // Educator access: full query with ownership check.
    const learner = await this.prisma.learnerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        cpfOrPassport: true,
        phoneDigits: true,
        birthDate: true,
        uf: true,
        city: true,
        photoUri: true,
        notes: true,
        createdAt: true,
        educatorId: true,
        educator: {
          select: { id: true, name: true, email: true, phoneDigits: true },
        },
        learnerThemes: {
          include: {
            theme: {
              include: {
                learningUnits: {
                  include: { activities: true },
                },
              },
            },
          },
        },
        completions: {
          include: { activity: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException(`Alfabetizando ${id} nao encontrado.`);
    }

    if (requestingEducatorId !== learner.educatorId) {
      throw new UnauthorizedException('Sem permissão para visualizar este alfabetizando.');
    }

    const completedCount = learner.completions.filter((completion) => completion.status === 'COMPLETED').length;
    const totalTracked = learner.completions.length;

    return {
      ...learner,
      progresso: {
        totalTracked,
        completedCount,
        progressPercent: totalTracked === 0 ? 0 : Math.round((completedCount / totalTracked) * 100),
      },
    };
  }

  async createAlfabetizando(dto: CreateAlfabetizandoDto) {
    try {
      const created = await this.prisma.learnerProfile.create({
        data: {
          displayName: dto.displayName,
          notes: dto.notes,
          educatorId: dto.educatorId,
          cpfOrPassport: dto.cpfOrPassport,
          phoneDigits: dto.phoneDigits,
          birthDate: dto.birthDate,
          uf: dto.uf,
          city: dto.city,
          photoUri: dto.photoUri,
        },
      });

      await this.syncEventService.record({
        entityType: SyncEntityType.LEARNER_PROFILE,
        entityId: created.id,
        action: SyncAction.CREATED,
        actorEducatorId: dto.educatorId,
        payload: {
          displayName: created.displayName,
          cpfOrPassport: created.cpfOrPassport,
          phoneDigits: created.phoneDigits,
        },
      });

      return created;
    } catch (error) {
      this.handlePrismaConflict(
        error,
        'Nao foi possivel cadastrar alfabetizando. CPF/passaporte ou telefone ja estao em uso.',
      );
    }
  }

  listVinculos(status?: TutorLearnerLinkStatus, educatorId?: string) {
    return this.prisma.tutorLearnerLink.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(educatorId ? { educatorId } : {}),
      },
      include: {
        educator: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneDigits: true,
          },
        },
        learnerProfile: {
          select: {
            id: true,
            displayName: true,
            cpfOrPassport: true,
            phoneDigits: true,
            birthDate: true,
            uf: true,
            city: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async createVinculo(dto: CreateVinculoDto) {
    await this.ensureEducatorExists(dto.educatorId);
    await this.ensureLearnerExists(dto.learnerProfileId);

    const link = await this.prisma.tutorLearnerLink.upsert({
      where: {
        educatorId_learnerProfileId: {
          educatorId: dto.educatorId,
          learnerProfileId: dto.learnerProfileId,
        },
      },
      create: {
        educatorId: dto.educatorId,
        learnerProfileId: dto.learnerProfileId,
        status: TutorLearnerLinkStatus.PENDING,
        requestedBy: dto.requestedBy,
      },
      update: {
        status: TutorLearnerLinkStatus.PENDING,
        requestedBy: dto.requestedBy,
        requestedAt: new Date(),
        respondedAt: null,
        responseReason: null,
      },
      include: {
        educator: true,
        learnerProfile: true,
      },
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.TUTOR_LEARNER_LINK,
      entityId: link.id,
      action: SyncAction.CREATED,
      actorEducatorId: dto.educatorId,
      payload: {
        learnerProfileId: dto.learnerProfileId,
        status: link.status,
      },
    });

    return link;
  }

  async updateVinculo(id: string, dto: UpdateVinculoDto) {
    const existing = await this.prisma.tutorLearnerLink.findUnique({
      where: { id },
      include: {
        learnerProfile: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Vinculo ${id} nao encontrado.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.tutorLearnerLink.update({
        where: { id },
        data: {
          status: dto.status,
          responseReason: dto.responseReason,
          respondedAt: new Date(),
        },
        include: {
          educator: true,
          learnerProfile: true,
        },
      });

      if (dto.status === TutorLearnerLinkStatus.CONFIRMED) {
        await tx.learnerProfile.update({
          where: { id: next.learnerProfileId },
          data: {
            educatorId: next.educatorId,
          },
        });
      }

      return next;
    });

    await this.syncEventService.record({
      entityType: SyncEntityType.TUTOR_LEARNER_LINK,
      entityId: updated.id,
      action: SyncAction.STATUS_CHANGED,
      actorEducatorId: dto.actorEducatorId ?? updated.educatorId,
      payload: {
        previousStatus: existing.status,
        status: updated.status,
        responseReason: updated.responseReason,
      },
    });

    return updated;
  }

  private async ensureEducatorExists(id: string) {
    const educator = await this.prisma.educator.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!educator) {
      throw new NotFoundException(`Alfabetizador ${id} nao encontrado.`);
    }
  }

  private async ensureLearnerExists(id: string) {
    const learner = await this.prisma.learnerProfile.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!learner) {
      throw new NotFoundException(`Alfabetizando ${id} nao encontrado.`);
    }
  }

  async createSessionRequest(dto: CreateSessionRequestDto) {
    // Verify the learner exists and is actually linked to the claimed educator.
    // This prevents unauthenticated callers from injecting or cancelling session requests
    // for arbitrary educator–learner pairs.
    const learner = await this.prisma.learnerProfile.findUnique({
      where: { id: dto.learnerProfileId },
      select: { id: true, educatorId: true },
    });
    if (!learner) throw new NotFoundException('Alfabetizando não encontrado.');
    if (learner.educatorId !== dto.educatorId) {
      throw new BadRequestException('Educador não corresponde ao vínculo do alfabetizando.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.learnerSessionRequest.updateMany({
        where: { learnerProfileId: dto.learnerProfileId, status: SessionRequestStatus.PENDING },
        data: { status: SessionRequestStatus.DENIED, denialReason: 'Substituída por nova solicitação', respondedAt: new Date() },
      });

      return tx.learnerSessionRequest.create({
        data: {
          learnerProfileId: dto.learnerProfileId,
          educatorId: dto.educatorId,
        },
        select: { id: true, status: true, requestedAt: true },
      });
    });
  }

  getSessionRequestStatus(requestId: string) {
    return this.prisma.learnerSessionRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, status: true, denialReason: true, respondedAt: true },
    });
  }

  async getPendingSessionRequests(authorization: string | undefined) {
    const educatorId = await this.resolveEducatorIdFromToken(authorization);
    return this.prisma.learnerSessionRequest.findMany({
      where: { educatorId, status: SessionRequestStatus.PENDING },
      include: {
        learnerProfile: {
          select: { id: true, displayName: true, cpfOrPassport: true, phoneDigits: true, birthDate: true, uf: true, city: true },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async respondToSessionRequest(requestId: string, dto: RespondSessionRequestDto, authorization: string | undefined) {
    const actorEducatorId = await this.resolveEducatorIdFromToken(authorization);

    const req = await this.prisma.learnerSessionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, educatorId: true },
    });

    if (!req) throw new NotFoundException('Solicitação de sessão não encontrada.');
    if (req.educatorId !== actorEducatorId) throw new BadRequestException('Sem permissão para responder esta solicitação.');
    if (req.status !== SessionRequestStatus.PENDING) throw new BadRequestException('Solicitação já foi respondida.');

    return this.prisma.learnerSessionRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status === 'CONFIRMED' ? SessionRequestStatus.CONFIRMED : SessionRequestStatus.DENIED,
        denialReason: dto.denialReason ?? null,
        respondedAt: new Date(),
      },
      select: { id: true, status: true, denialReason: true, respondedAt: true },
    });
  }

  private async resolveEducatorIdFromToken(authorization: string | undefined): Promise<string> {
    if (!authorization) throw new UnauthorizedException('Token ausente.');
    const [type, token] = authorization.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedException('Token inválido.');

    const session = await this.prisma.educatorAuthSession.findUnique({
      where: { token: token.trim() },
      select: { educatorId: true, revokedAt: true, expiresAt: true },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    return session.educatorId;
  }

  private handlePrismaConflict(error: unknown, fallbackMessage: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(fallbackMessage);
    }

    throw error;
  }
}
