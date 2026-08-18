import { CompletionStatus, ParticipantRole } from './entities';

export interface CreateLearnerProfileRequest {
  displayName: string;
  notes?: string;
  educatorId?: string;
}

export interface AssignThemeRequest {
  themeId: string;
}

export interface CreateThemeRequest {
  name: string;
  description?: string;
}

export interface CreateLearnerSessionRequest {
  learnerProfileId: string;
  deviceId: string;
  role?: ParticipantRole;
}

export interface UpdateSessionStateRequest {
  currentView?: string;
  currentActivityId?: string;
  statePayload?: Record<string, unknown>;
}

export interface SetLockRequest {
  isLocked: boolean;
}

export interface TrackProgressRequest {
  learnerProfileId: string;
  activityId: string;
  status: CompletionStatus;
  score?: number;
  elapsedSeconds?: number;
}

export interface RegisterEducatorRequest {
  fullName: string;
  password?: string;
  cpf?: string;
  email?: string;
  phoneDigits?: string;
  birthDate?: string;
  uf?: string;
  city?: string;
  photoUri?: string | null;
  educationLevel?: string;
  trainingArea?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  xHandle?: string;
}

export interface LoginEducatorRequest {
  identifier: string;
  /** Opcional: quando ausente, o login e feito apenas pelo CPF (passwordless). */
  password?: string;
}

export interface UpdateEducatorProfileRequest {
  fullName?: string;
  cpf?: string;
  phoneDigits?: string;
  birthDate?: string;
  uf?: string;
  city?: string;
  photoUri?: string | null;
  educationLevel?: string;
  trainingArea?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  xHandle?: string;
}

export interface EducatorAuthProfile {
  id: string;
  fullName: string;
  email: string | null;
  cpf: string | null;
  phoneDigits: string | null;
  birthDate?: string | null;
  uf?: string | null;
  city?: string | null;
  photoUri?: string | null;
  educationLevel?: string | null;
  trainingArea?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  xHandle?: string | null;
}

export interface EducatorAuthResponse {
  token: string;
  expiresAt: string;
  educator: EducatorAuthProfile;
}

export interface EducatorMeResponse {
  expiresAt: string;
  educator: EducatorAuthProfile;
}

export interface ReferenceUf {
  id: number;
  code: string;
  name: string;
}

export interface ReferenceCity {
  id: number;
  uf: string;
  name: string;
}

export interface UploadedAssetResponse {
  asset: {
    id: string;
    key: string | null;
    kind: string;
    title: string;
    sourceUrl: string;
    mimeType: string | null;
    originalFileName: string | null;
    bytes: number | null;
    createdByEducatorId: string | null;
    createdAt: string;
  };
  storage: {
    bucket: string;
    objectPath: string;
    publicUrl: string;
  };
  vinculado: boolean;
}
