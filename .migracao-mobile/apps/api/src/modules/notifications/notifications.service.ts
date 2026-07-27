import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const SUPPORT_DEADLINE_DAYS = 5;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async learnerName(learnerId?: string | null): Promise<string> {
    if (!learnerId) return 'Alfabetizando';
    const l = await this.prisma.learnerProfile.findUnique({
      where: { id: learnerId },
      select: { displayName: true },
    });
    return l?.displayName?.trim() || 'Alfabetizando';
  }

  private async create(data: Prisma.NotificationUncheckedCreateInput) {
    try {
      await this.prisma.notification.create({ data });
    } catch {
      // Notificação é efeito colateral: nunca derruba o fluxo principal.
    }
  }

  async notifyHelpRequest(educatorId: string, learnerId: string) {
    const nome = await this.learnerName(learnerId);
    await this.create({ educatorId, learnerId, type: NotificationType.HELP_REQUEST, title: 'Pedido de Ajuda', body: nome });
    await this.createSupportDeadline(educatorId, learnerId, nome);
  }

  async notifyAutoLock(educatorId: string, learnerId: string) {
    const nome = await this.learnerName(learnerId);
    await this.create({
      educatorId,
      learnerId,
      type: NotificationType.AUTO_LOCK,
      title: 'Ajuda Automática',
      body: `${nome} teve bloqueio de tela depois de 3 tentativas de realizar o exercício.`,
    });
    await this.createSupportDeadline(educatorId, learnerId, nome);
  }

  private async createSupportDeadline(educatorId: string, learnerId: string, nome: string) {
    const deadline = new Date(Date.now() + SUPPORT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    // Produto Brasil-only: formata no fuso de Brasília explicitamente, senão um
    // servidor em UTC gravaria a hora errada no corpo da notificação.
    const TZ = 'America/Sao_Paulo';
    const hora = deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
    const data = deadline.toLocaleDateString('pt-BR', { timeZone: TZ });
    await this.create({
      educatorId,
      learnerId,
      type: NotificationType.SUPPORT_DEADLINE,
      title: 'Prazo de apoio',
      body: `Você tem até as ${hora} horas do dia ${data} para dar apoio ao ${nome} e não perder ponto.`,
      deadlineAt: deadline,
    });
  }

  async notifyPointsEarned(educatorId: string, learnerId: string, points: number, stage: number) {
    const nome = await this.learnerName(learnerId);
    await this.create({
      educatorId,
      learnerId,
      type: NotificationType.POINTS_EARNED,
      title: `Você ganhou + ${points} pontos`,
      body: `${nome} concluiu a Etapa ${stage} da alfabetização`,
    });
  }

  async notifyMilestone(educatorId: string, learnerId?: string) {
    await this.create({
      educatorId,
      learnerId: learnerId ?? null,
      type: NotificationType.MILESTONE,
      title: 'Parabéns!',
      body: 'Você completou mais uma letra da sua meta.',
    });
  }

  async list(educatorId: string, onlyUnread = false) {
    const where: Prisma.NotificationWhereInput = { educatorId, ...(onlyUnread ? { readAt: null } : {}) };
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.notification.count({ where: { educatorId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(educatorId: string, ids?: string[]) {
    await this.prisma.notification.updateMany({
      where: { educatorId, readAt: null, ...(ids && ids.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    const unreadCount = await this.prisma.notification.count({ where: { educatorId, readAt: null } });
    return { unreadCount };
  }
}
