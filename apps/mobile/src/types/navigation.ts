export interface EducatorOnboardingData {
  cpf: string;
  phoneDigits: string;
  email?: string;
  password?: string;
  fullName: string;
  birthDate: string;
  uf: string;
  city: string;
  photoUri?: string | null;
  educationLevel?: string;
  trainingArea?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  xHandle?: string;
}

export type AppMode = 'educator' | 'learner';

export type EducatorRootStackParamList = {
  EducatorLoading: undefined;
  EducatorLogin: undefined;
  EducatorSplash: undefined;
  EducatorProfile: undefined;
  EducatorOnboardingStepTwo: Pick<EducatorOnboardingData, 'cpf' | 'phoneDigits'>;
  EducatorOnboardingStepThree: Pick<
    EducatorOnboardingData,
    'cpf' | 'phoneDigits' | 'email' | 'fullName' | 'birthDate' | 'uf' | 'city' | 'photoUri'
  >;
  EducatorOnboardingConfirm: EducatorOnboardingData;
  LearnerOnboardingStep1: { isEducatorFlow?: boolean } | undefined;
  LearnerOnboardingStep2: Pick<LearnerOnboardingData, 'cpfOrPassport' | 'phoneDigits'> & { isEducatorFlow?: boolean };
  LearnerOnboardingConfirm: LearnerOnboardingData & { isEducatorFlow?: boolean };
  EducatorHome: {
    fullName?: string;
    educatorId?: string;
    openNotifications?: boolean;
  };
  EducatorTutorials: {
    educatorId?: string;
  };
  EducatorLearningMode: {
    fullName?: string;
    learnerName?: string;
    learnerId?: string;
    educatorId?: string;
  };
  // Espelhamento ao vivo da tela do alfabetizando (Socket.IO). Mesma assinatura
  // de EducatorLearningMode para reaproveitar a navegação do clique no nome.
  EducatorLiveMirror: {
    fullName?: string;
    learnerName?: string;
    learnerId?: string;
    educatorId?: string;
  };
  EducatorComparativo: {
    educatorId?: string;
    learnerId: string;
    learnerName?: string;
    phoneDigits?: string | null;
  };
  LearnerThemeSelect: {
    learnerId: string;
    learnerName: string;
    educatorId?: string;
  };
  LearnerThemeConfirm: {
    learnerId: string;
    learnerName: string;
    educatorId?: string;
    themeId: string;
    themeName: string;
    themeDescription?: string | null;
  };
  EducatorScore: {
    educatorId: string;
    fullName?: string;
  };
  EducatorScoreRules: undefined;
  // Runner da Etapa 1 no modo educador: navegador aninhado que reaproveita as
  // telas de aula do learner sob o perfil do alfabetizando (progresso gravado
  // sob o UUID dele). Gate da Etapa 2 e do espelhamento.
  EducatorEtapa1Lessons: {
    learnerId: string;
    learnerName?: string;
    educatorId?: string;
    themeId?: string;
  };
  EducatorSessionConfirm: {
    educatorId: string;
    fullName: string;
  };
  EducatorNotificacoes: {
    educatorId?: string;
  };
  EducatorTutorial: {
    educatorId?: string;
  };
  EducatorTutorialPlayer: {
    embedUrl: string;
    title: string;
  };
};

export interface LearnerOnboardingData {
  cpfOrPassport: string;
  phoneDigits: string;
  fullName: string;
  birthDate: string;
  uf: string;
  city: string;
  photoUri?: string | null;
}

export type LearnerRootStackParamList = {
  LearnerLoading: undefined;
  LearnerSessionPending: {
    requestId: string;
    learnerProfileId: string;
    educatorId: string;
    educatorName: string;
    learnerName?: string;
    educatorPhone?: string;
  };
  LearnerOnboardingStep1: { isEducatorFlow?: boolean } | undefined;
  LearnerOnboardingStep2: Pick<LearnerOnboardingData, 'cpfOrPassport' | 'phoneDigits'> & { isEducatorFlow?: boolean };
  LearnerOnboardingConfirm: LearnerOnboardingData & { isEducatorFlow?: boolean };
  LearnerHome: undefined;
  LearnerTutorials: undefined;
  LearnerScore: undefined;
  LearnerStageConclusion: {
    stageNumber: number;
    stageTitle?: string;
    pointsEarned?: number;
  };
  LearnerProfile: undefined;
  LearnerLessonIntro: {
    moduleId: string;
    lessonId: string;
    moduleLabel: string;
    moduleTitle: string;
  };
  LearnerLessonScreen: {
    moduleId: string;
    lessonId: string;
    screenIndex: number;
    moduleLabel: string;
    moduleTitle: string;
  };
  LearnerLessonActivity: {
    moduleId: string;
    lessonId: string;
    screenIndex: number;
    moduleLabel: string;
    moduleTitle: string;
  };
  LearnerLessonConclusion: {
    moduleId: string;
    lessonId: string;
    moduleLabel: string;
    moduleTitle: string;
    // Sinal de "esta aula fechou a etapa", vindo da ÚLTIMA tela da aula. O
    // backend só sinaliza a conclusão de etapa UMA vez (dedupe por
    // `stage:<tutor>:<aluno>:<etapa>` em recordEducatorScoreEvent); quem
    // recebe esse sinal é a gravação da última tela, não a da tela de
    // conclusão — que chega depois e sempre vê o dedupe. Sem carregar o
    // sinal para cá, a celebração da etapa (RN048) nunca aparecia.
    stageCompleted?: boolean;
    // Pontos creditados ao alfabetizador por fechar a etapa, na mesma carona
    // (a celebração exibe "acumulou NN pontos").
    stagePoints?: number;
  };
  // Fase 2 (RN113/RN114): revisão da foto da atividade feita no papel —
  // FAZER OUTRA FOTO / ENVIAR FOTO; kind 'carta' reusa a tela para a carta
  // de agradecimento da Etapa 3 (Fase 5).
  LearnerPhotoReview: {
    photoUri: string;
    photoBase64: string;
    mimeType: string;
    activityId: string | null;
    kind?: 'atividade' | 'carta';
  };
};

export type RootStackParamList = {
  UnifiedLogin: undefined;
  EducatorFlow: import('@react-navigation/native').NavigatorScreenParams<EducatorRootStackParamList> | undefined;
  LearnerFlow: import('@react-navigation/native').NavigatorScreenParams<LearnerRootStackParamList> | undefined;
};
