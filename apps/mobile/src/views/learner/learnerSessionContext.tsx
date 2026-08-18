import { PropsWithChildren, createContext, useContext, useEffect } from 'react';
import { useLearnerHomeViewModel } from '../../viewmodels/learner/useLearnerHomeViewModel';

type LearnerSessionContextValue = ReturnType<typeof useLearnerHomeViewModel>;

const LearnerSessionContext = createContext<LearnerSessionContextValue | null>(null);

// Menu inferior do EDUCADOR exibido nas telas reaproveitadas da Etapa 1 (Figma:
// "Etapa 1 - Tela de Abertura / Tela de Aula"). O runner é quem monta os handlers
// (tem a navigation do stack do educador) e injeta esta config via contexto.
export interface EducatorChromeMenu {
  active: 'inicio' | 'tutorial' | 'acompanhar' | 'pontuacao' | 'perfil';
  onInicio: () => void;
  onTutorial: () => void;
  onAcompanhar: () => void;
  onPontuacao: () => void;
  onPerfil: () => void;
}

// Sinaliza às telas reaproveitadas (via LearnerScreenLayout) que o menu inferior
// do alfabetizando deve ser escondido — usado pelo runner da Etapa 1 no modo
// educador, onde Tutoriais/Pontuação/Perfil do aluno não fazem sentido. Quando
// `educatorMenu` está presente, a layout renderiza a barra de 5 abas do educador.
export const LearnerChromeContext = createContext<{
  hideBottomMenu: boolean;
  educatorMenu?: EducatorChromeMenu;
}>({
  hideBottomMenu: false,
});

export function useLearnerChrome() {
  return useContext(LearnerChromeContext);
}

interface LearnerSessionProviderProps {
  // Runner da Etapa 1 no educador: opera sob o perfil do alfabetizando.
  overrideLearnerProfileId?: string;
  overrideLearnerName?: string;
  overrideThemeId?: string;
}

export function LearnerSessionProvider({
  children,
  overrideLearnerProfileId,
  overrideLearnerName,
  overrideThemeId,
}: PropsWithChildren<LearnerSessionProviderProps>) {
  const viewModel = useLearnerHomeViewModel({
    overrideLearnerProfileId,
    overrideLearnerName,
    overrideThemeId,
  });
  const { initialize, cleanup } = viewModel;

  useEffect(() => {
    void initialize();
    return cleanup;
  }, [cleanup, initialize]);

  return <LearnerSessionContext.Provider value={viewModel}>{children}</LearnerSessionContext.Provider>;
}

export function useLearnerSession() {
  const context = useContext(LearnerSessionContext);
  if (!context) {
    throw new Error('useLearnerSession must be used within LearnerSessionProvider.');
  }
  return context;
}

export function useOptionalLearnerSession() {
  return useContext(LearnerSessionContext);
}
