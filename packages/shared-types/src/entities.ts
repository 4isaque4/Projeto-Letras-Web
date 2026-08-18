export type ParticipantRole = 'learner' | 'educator';

export interface Educator {
  id: string;
  name: string;
  cpf?: string | null;
  phoneDigits?: string | null;
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
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerProfile {
  id: string;
  displayName: string;
  notes?: string | null;
  educatorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerTheme {
  learnerProfileId: string;
  themeId: string;
  assignedAt: string;
}

export type ActivityType = 'READING' | 'WRITING' | 'MATCHING' | 'SPEAKING';

export interface LearningUnit {
  id: string;
  themeId: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  learningUnitId: string;
  prompt: string;
  content?: Record<string, unknown> | null;
  order: number;
  type: ActivityType;
  createdAt: string;
  updatedAt: string;
}

export type SessionRole = 'LEARNER' | 'EDUCATOR';

export interface LearnerSession {
  id: string;
  learnerProfileId: string;
  deviceId: string;
  role: SessionRole;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  id: string;
  sessionId: string;
  currentView: string;
  currentActivityId?: string | null;
  statePayload?: Record<string, unknown> | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CompletionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Completion {
  id: string;
  learnerProfileId: string;
  activityId: string;
  status: CompletionStatus;
  score?: number | null;
  elapsedSeconds?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
