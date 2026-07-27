import { CreateLearnerSessionRequest, LearnerProfile, LearnerSession } from '@letras/shared-types';
import {
  AssignedLearnerTheme,
  BootstrappedLearnerSession,
  LearnerLookupResult,
  LearnerSessionRepository,
  LearnerSessionStateSnapshot,
  RegisterLearnerInput,
  SessionRequestResult,
} from '../../../domain/interfaces/learner/learner-session-repository';
import { httpClient } from '../../../infra/api/http-client';
import { SessionStorage } from '../../../infra/storage/session-storage';

export class LearnerSessionRepositoryImpl implements LearnerSessionRepository {
  async bootstrapPersistentSession(): Promise<BootstrappedLearnerSession> {
    const deviceId = await SessionStorage.getOrCreateLearnerDeviceId();
    const learnerProfileId = await SessionStorage.getLearnerProfileId();

    if (!learnerProfileId) {
      throw new Error('Nenhuma sessão de alfabetizando encontrada. Faça login novamente.');
    }

    const session = await this.createOrRefreshSession({
      learnerProfileId,
      deviceId,
      role: 'learner',
    });

    return {
      learnerProfileId,
      deviceId,
      sessionId: session.id,
    };
  }

  async lookupLearner(cpfOrPassport?: string, phoneDigits?: string): Promise<LearnerLookupResult> {
    const params = new URLSearchParams();
    if (cpfOrPassport) params.set('cpfOrPassport', cpfOrPassport);
    if (phoneDigits) params.set('phoneDigits', phoneDigits);
    return httpClient.get<LearnerLookupResult>(`/cadastros/alfabetizandos/buscar?${params.toString()}`);
  }

  createSessionRequest(dto: { learnerProfileId: string; educatorId: string }): Promise<SessionRequestResult> {
    return httpClient.post<SessionRequestResult>('/cadastros/sessoes-confirmacao', dto);
  }

  async getAssignedThemes(learnerProfileId: string): Promise<AssignedLearnerTheme[]> {
    try {
      return await httpClient.get<AssignedLearnerTheme[]>(`/learners/${learnerProfileId}/themes`);
    } catch {
      return [];
    }
  }

  async getSessionState(learnerProfileId: string): Promise<LearnerSessionStateSnapshot | null> {
    try {
      return await httpClient.get<LearnerSessionStateSnapshot>(`/sessions/${learnerProfileId}`);
    } catch {
      return null;
    }
  }

  async pushState(
    learnerProfileId: string,
    payload: { currentView?: string; currentActivityId?: string; statePayload?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await httpClient.patch(`/sessions/${learnerProfileId}/state`, payload);
    } catch {
      // Mantém o fluxo local quando o backend de sessão não estiver disponível.
    }
  }

  async setLocked(learnerProfileId: string, isLocked: boolean): Promise<void> {
    try {
      await httpClient.put(`/sessions/${learnerProfileId}/lock`, { isLocked });
    } catch {
      // Falha silenciosa — o estado local já reflete o lock.
    }
  }

  async registerLearner(input: RegisterLearnerInput, deviceId: string): Promise<string> {
    const profile = await httpClient.post<LearnerProfile>('/cadastros/alfabetizandos', {
      displayName: input.fullName,
      cpfOrPassport: input.cpfOrPassport,
      phoneDigits: input.phoneDigits,
      birthDate: input.birthDate,
      uf: input.uf,
      city: input.city,
      ...(input.photoUri ? { photoUri: input.photoUri } : {}),
      ...(input.educatorId ? { educatorId: input.educatorId } : {}),
      notes: `Cadastro via app mobile. Dispositivo: ${deviceId}`,
    });
    return profile.id;
  }

  private createOrRefreshSession(body: CreateLearnerSessionRequest) {
    return httpClient.post<LearnerSession>('/sessions', body);
  }
}
