import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@letras/shared-utils';

// Persistência local da posição no runner da Etapa 1 conduzido pelo educador.
// Guarda, por alfabetizando, a última rota de aula (nome + params) para que ao
// sair do exercício ou recarregar a página o alfabetizador retome de onde parou.
// É local (AsyncStorage) e isolada por vínculo — não passa pela API nem mistura
// progresso entre alunos.

// Rotas de aula que valem persistir (as telas próprias do runner — lista e
// conclusão — não entram: ao chegar nelas a posição é limpa).
export type Etapa1PositionRoute =
  | 'LearnerLessonIntro'
  | 'LearnerLessonScreen'
  | 'LearnerLessonActivity';

export interface Etapa1Position {
  routeName: Etapa1PositionRoute;
  // Params da rota reaproveitada (moduleId, lessonId, screenIndex?, moduleLabel,
  // moduleTitle). Mantido genérico para casar com LearnerRootStackParamList sem
  // acoplar o storage aos tipos de navegação.
  params: Record<string, unknown>;
}

function keyFor(learnerId: string): string {
  return `${STORAGE_KEYS.ETAPA1_POSITION_PREFIX}${learnerId}`;
}

export async function saveEtapa1Position(
  learnerId: string,
  position: Etapa1Position,
): Promise<void> {
  if (!learnerId) return;
  try {
    await AsyncStorage.setItem(keyFor(learnerId), JSON.stringify(position));
  } catch {
    // Persistência é best-effort: falha ao gravar não deve travar a navegação.
  }
}

export async function getEtapa1Position(
  learnerId: string,
): Promise<Etapa1Position | null> {
  if (!learnerId) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(learnerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Etapa1Position;
    if (!parsed?.routeName || !parsed?.params) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearEtapa1Position(learnerId: string): Promise<void> {
  if (!learnerId) return;
  try {
    await AsyncStorage.removeItem(keyFor(learnerId));
  } catch {
    // Ignorado: limpar é best-effort.
  }
}
