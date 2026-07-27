import {
  EducatorAuthResponse,
  EducatorMeResponse,
  LearnerProfile,
  ReferenceCity,
  ReferenceUf,
  RegisterEducatorRequest,
  Theme,
  UploadedAssetResponse,
  UpdateEducatorProfileRequest,
} from '@letras/shared-types';

export interface EducatorRepository {
  createLearnerProfile(displayName: string, educatorId?: string): Promise<LearnerProfile>;
  registerEducator(payload: RegisterEducatorRequest): Promise<EducatorAuthResponse>;
  loginEducator(identifier: string, password?: string): Promise<EducatorAuthResponse>;
  fetchCurrentEducator(): Promise<EducatorMeResponse>;
  updateEducatorProfile(payload: UpdateEducatorProfileRequest): Promise<EducatorMeResponse>;
  logoutEducator(): Promise<void>;
  fetchThemes(): Promise<Theme[]>;
  fetchUfs(): Promise<ReferenceUf[]>;
  fetchCitiesByUf(uf: string): Promise<ReferenceCity[]>;
  uploadImageAsset(params: {
    uri: string;
    fileName?: string;
    mimeType?: string;
    title: string;
    createdByEducatorId?: string;
  }): Promise<UploadedAssetResponse>;
  assignTheme(learnerProfileId: string, themeId: string): Promise<void>;
  setLockState(learnerProfileId: string, isLocked: boolean): Promise<void>;
}
