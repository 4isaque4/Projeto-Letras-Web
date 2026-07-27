import { Theme } from '@letras/shared-types';

export interface BootstrappedLearnerSession {
  learnerProfileId: string;
  deviceId: string;
  sessionId: string;
}

export interface AssignedLearnerTheme {
  learnerProfileId: string;
  themeId: string;
  assignedAt: string;
  theme: Theme;
}

export interface LearnerSessionStateSnapshot {
  id: string;
  learnerProfileId: string;
  deviceId?: string;
  sessionState?: {
    id: string;
    currentView: string;
    currentActivityId?: string | null;
    statePayload?: Record<string, unknown> | null;
    isLocked: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export interface LearnerLookupResult {
  id: string;
  displayName: string;
  phoneDigits: string | null;
  educator: { id: string; name: string; phoneDigits?: string | null } | null;
}

export interface RegisterLearnerInput {
  cpfOrPassport: string;
  phoneDigits: string;
  fullName: string;
  birthDate: string;
  uf: string;
  city: string;
  photoUri?: string | null;
  educatorId?: string;
}

export interface SessionRequestResult {
  id: string;
  status: string;
  requestedAt: string;
}

export interface LearnerSessionRepository {
  bootstrapPersistentSession(): Promise<BootstrappedLearnerSession>;
  lookupLearner(cpfOrPassport?: string, phoneDigits?: string): Promise<LearnerLookupResult>;
  createSessionRequest(dto: { learnerProfileId: string; educatorId: string }): Promise<SessionRequestResult>;
  registerLearner(input: RegisterLearnerInput, deviceId: string): Promise<string>;
  getAssignedThemes(learnerProfileId: string): Promise<AssignedLearnerTheme[]>;
  getSessionState(learnerProfileId: string): Promise<LearnerSessionStateSnapshot | null>;
  pushState(
    learnerProfileId: string,
    payload: { currentView?: string; currentActivityId?: string; statePayload?: Record<string, unknown> },
  ): Promise<void>;
  setLocked(learnerProfileId: string, isLocked: boolean): Promise<void>;
}
