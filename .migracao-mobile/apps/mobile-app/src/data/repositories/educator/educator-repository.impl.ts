import {
  AssignThemeRequest,
  CreateLearnerProfileRequest,
  EducatorAuthResponse,
  EducatorMeResponse,
  LoginEducatorRequest,
  LearnerProfile,
  ReferenceCity,
  ReferenceUf,
  RegisterEducatorRequest,
  SetLockRequest,
  Theme,
  UploadedAssetResponse,
  UpdateEducatorProfileRequest,
} from '@letras/shared-types';
import { EducatorRepository } from '../../../domain/interfaces/educator/educator-repository';
import { httpClient } from '../../../infra/api/http-client';

export class EducatorRepositoryImpl implements EducatorRepository {
  createLearnerProfile(displayName: string, educatorId?: string): Promise<LearnerProfile> {
    const body: CreateLearnerProfileRequest = {
      displayName,
      notes: 'Perfil criado por alfabetizador no app educador.',
      educatorId,
    };

    return httpClient.post<LearnerProfile>('/learners', body);
  }

  registerEducator(payload: RegisterEducatorRequest): Promise<EducatorAuthResponse> {
    return httpClient.post<EducatorAuthResponse>('/auth/educators/register', payload);
  }

  loginEducator(identifier: string, password?: string): Promise<EducatorAuthResponse> {
    const body: LoginEducatorRequest = {
      identifier,
      ...(password ? { password } : {}),
    };

    return httpClient.post<EducatorAuthResponse>('/auth/educators/login', body);
  }

  fetchCurrentEducator(): Promise<EducatorMeResponse> {
    return httpClient.get<EducatorMeResponse>('/auth/educators/me');
  }

  updateEducatorProfile(payload: UpdateEducatorProfileRequest): Promise<EducatorMeResponse> {
    return httpClient.patch<EducatorMeResponse>('/auth/educators/profile', payload);
  }

  async logoutEducator(): Promise<void> {
    await httpClient.post('/auth/educators/logout', {});
  }

  fetchThemes(): Promise<Theme[]> {
    return httpClient.get<Theme[]>('/themes');
  }

  fetchUfs(): Promise<ReferenceUf[]> {
    return httpClient.get<ReferenceUf[]>('/reference/ufs');
  }

  fetchCitiesByUf(uf: string): Promise<ReferenceCity[]> {
    return httpClient.get<ReferenceCity[]>(`/reference/ufs/${uf}/cities`);
  }

  uploadImageAsset(params: {
    uri: string;
    fileName?: string;
    mimeType?: string;
    title: string;
    createdByEducatorId?: string;
  }): Promise<UploadedAssetResponse> {
    const formData = new FormData();
    const fileName = params.fileName ?? `foto-${Date.now()}.jpg`;
    const mimeType = params.mimeType ?? 'image/jpeg';

    formData.append('title', params.title);
    if (params.createdByEducatorId) {
      formData.append('createdByEducatorId', params.createdByEducatorId);
    }

    formData.append('file', {
      uri: params.uri,
      name: fileName,
      type: mimeType,
    } as any);

    return httpClient.postFormData<UploadedAssetResponse>('/painel/conteudo/assets/upload', formData);
  }

  async assignTheme(learnerProfileId: string, themeId: string): Promise<void> {
    const body: AssignThemeRequest = {
      themeId,
    };

    await httpClient.post(`/learners/${learnerProfileId}/themes`, body);
  }

  async setLockState(learnerProfileId: string, isLocked: boolean): Promise<void> {
    const body: SetLockRequest = {
      isLocked,
    };

    await httpClient.put(`/sessions/${learnerProfileId}/lock`, body);
  }
}
