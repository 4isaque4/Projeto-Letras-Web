export type Platform = "web" | "mobile" | "backend";
export type UserRole = "admin" | "tutor" | "alfabetizando";
export type LinkStatus = "pendente" | "confirmado" | "negado";
export type AssetKind = "png" | "mp4" | "mp3" | "jpg";
export type AssetStatus = "rascunho" | "publicado" | "arquivado";
export type ActivityType = "video" | "quiz" | "audio" | "letra";
export type ProgressStatus = "nao_iniciado" | "em_andamento" | "concluido" | "travado";

export interface ProfileRecord {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  cpf?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorStudentLinkRecord {
  id: string;
  tutorId: string;
  studentId: string;
  status: LinkStatus;
  reason?: string;
  requestedAt: string;
  decidedAt?: string;
}

export interface LearningThemeRecord {
  id: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningModuleRecord {
  id: string;
  themeId: string;
  stageNumber: number;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningActivityRecord {
  id: string;
  moduleId: string;
  type: ActivityType;
  title: string;
  instructions?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentAssetRecord {
  id: string;
  activityId: string;
  kind: AssetKind;
  storagePath: string;
  mimeType: string;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityProgressRecord {
  id: string;
  studentId: string;
  activityId: string;
  status: ProgressStatus;
  attempts: number;
  score?: number;
  sourcePlatform: Platform;
  lastInteractedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobileScreenBlueprintRecord {
  id: string;
  slug: string;
  title: string;
  svgPath: string;
  stageTag?: string;
  moduleCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
