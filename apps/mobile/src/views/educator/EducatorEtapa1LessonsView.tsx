import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { EducatorRootStackParamList, LearnerRootStackParamList } from '../../types';
import { httpClient } from '../../infra/api/http-client';
import {
  EducatorChromeMenu,
  LearnerChromeContext,
  LearnerSessionProvider,
} from '../learner/learnerSessionContext';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';
import {
  clearEtapa1Position,
  getEtapa1Position,
  saveEtapa1Position,
} from '../../infra/storage/etapa1-position-storage';
import { isLessonUnlocked, useLearnerFlowData } from '../learner/learnerFlowData';
import { LearnerLessonIntroView } from '../learner/LearnerLessonIntroView';
import { LearnerLessonScreenView } from '../learner/LearnerLessonScreenView';
import { LearnerLessonActivityView } from '../learner/LearnerLessonActivityView';
import { LearnerLessonConclusionView } from '../learner/LearnerLessonConclusionView';
import { LearnerStageConclusionView } from '../learner/LearnerStageConclusionView';
import { LearnerPhotoReviewView } from '../learner/LearnerPhotoReviewView';
import {
  EducatorEtapa1AberturaScreen,
  EducatorEtapa1OrientacoesScreen,
  EtapaIntroMenu,
} from './EducatorEtapa1IntroViews';
import { LearnerHintVideoOverlay } from '../learner/components/LearnerHintVideoOverlay';

// Vídeo de referência para o card "Tutorial da Etapa 1" na tela de
// Orientações — o vídeo real dessa etapa ainda não existe no painel
// (relatado no report de bugs); usamos o tutorial de boas-vindas como
// placeholder até existir uma origem própria por etapa.
const ETAPA1_TUTORIAL_PLACEHOLDER_URL =
  'https://wfyjprjjhmcejovfozug.supabase.co/storage/v1/object/public/cms-videos/media-library/LETRAS-01.mp4';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorEtapa1Lessons'>;

// Contexto interno do runner: os componentes próprios (lista da Etapa 1 e
// interstício de conclusão) precisam do tema do aluno e de como sair de volta
// ao EducatorHome; as telas reaproveitadas do learner não precisam de nada.
// `themeId` é obrigatório: o runner só monta depois de resolver o tema do
// alfabetizando (ver EducatorEtapa1LessonsView), para nunca listar aulas de
// outro tema.
interface RunnerContextValue {
  learnerId: string;
  learnerName: string;
  themeId: string;
  menu: EducatorChromeMenu;
  exitToHome: () => void;
}

const RunnerContext = createContext<RunnerContextValue | null>(null);

function useRunner() {
  const ctx = useContext(RunnerContext);
  if (!ctx) throw new Error('Runner da Etapa 1 sem contexto.');
  return ctx;
}

const RunnerStack = createNativeStackNavigator<LearnerRootStackParamList>();

// ── Lista das aulas da Etapa 1 (ocupa o slot "LearnerHome" do navegador aninhado
// para que a conclusão de aula, que navega para LearnerHome, volte para cá). ──
function Etapa1LessonListScreen({
  navigation,
}: NativeStackScreenProps<LearnerRootStackParamList, 'LearnerHome'>) {
  const runner = useRunner();
  const { modules, loading, error, completedLessonIds, refresh, firstStage } =
    useLearnerFlowData();

  // Reforça progresso atualizado sempre que a lista ganha foco (voltar de uma
  // aula recém-concluída, ou reabrir este alfabetizando do zero): sem isto,
  // `completedLessonIds` fica com o snapshot do momento em que a lista montou
  // e a aula que acabou de fechar ainda aparece como pendente.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // A "Etapa 1" conduzida pelo educador = menor etapa-ENTIDADE do tema (mesma
  // fonte da verdade do painel), não a menor etapa com conteúdo. Assim, se a
  // Etapa 1 estiver vazia, o runner mostra o aviso "configure no painel" em vez
  // de rodar a Etapa 2 disfarçada de Etapa 1.
  // O escopo por tema é fail-CLOSED: cada LearnerFlowModule.id é o id do tema, e
  // só o tema atribuído a ESTE alfabetizando entra na lista. (Antes o filtro era
  // pulado quando o tema não vinha nos params — ex.: recarregar a página em
  // /educador/etapa-1/:learnerId — e a lista misturava as aulas de todos os
  // temas do painel.)
  const etapa1Modules = useMemo(
    () =>
      modules
        .filter((m) => m.id === runner.themeId)
        .map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.stageNumber === firstStage) }))
        .filter((m) => m.lessons.length > 0),
    [modules, runner.themeId, firstStage],
  );

  // A lista de aulas é sempre o ponto de entrada da Etapa 1: o alfabetizador
  // escolhe qual aula conduzir. Já existiu aqui uma "entrada direta" que
  // navegava sozinha para a Tela 1 do exercício (o Figma desenha a Etapa 1
  // como sequência linear, sem tela de escolha), mas ela tirava do
  // alfabetizador a visão do que já foi feito e do que vem a seguir —
  // removida por decisão do Isaque (2026-08-06), que prevalece sobre o
  // protótipo. `saveEtapa1Position` segue gravando a posição — quem volta no
  // meio de uma aula pula as telas de Orientações/Abertura e cai direto aqui.
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>ALFABETIZAÇÃO - ETAPA 1</Text>
        <Text style={styles.subtitle}>
          Conduza cada aula presencialmente. O progresso é gravado no perfil do alfabetizando.
        </Text>

        {loading ? <ActivityIndicator style={styles.loader} color="#111" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && etapa1Modules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Etapa 1 sem aulas publicadas</Text>
            <Text style={styles.emptyText}>
              Configure a Etapa 1 deste tema no painel (aulas publicadas) para começar.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
              <Text style={styles.retryText}>Recarregar</Text>
            </Pressable>
          </View>
        ) : null}

        {etapa1Modules.map((moduleItem) => (
          <View key={moduleItem.id} style={styles.moduleBlock}>
            <Text style={styles.moduleTitle}>{moduleItem.title}</Text>
            {moduleItem.lessons.map((lesson, lessonIndex) => {
              const unlocked = isLessonUnlocked(moduleItem.lessons, lessonIndex, completedLessonIds);
              const done = completedLessonIds.has(lesson.progressId);
              if (!unlocked) {
                return (
                  <View key={lesson.id} style={[styles.lessonCard, styles.lessonLocked]}>
                    <View style={styles.dotMuted} />
                    <Text style={styles.lessonTitleMuted}>{lesson.title}</Text>
                    <Text style={styles.lessonHint}>Conclua a aula anterior</Text>
                  </View>
                );
              }
              return (
                <Pressable
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() =>
                    navigation.navigate('LearnerLessonIntro', {
                      moduleId: moduleItem.id,
                      lessonId: lesson.id,
                      moduleLabel: lesson.moduleLabel,
                      moduleTitle: moduleItem.title,
                    })
                  }
                >
                  <View style={[styles.dot, done ? styles.dotDone : styles.dotOpen]} />
                  <View style={styles.lessonBody}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonCount}>{lesson.screens.length} telas</Text>
                  </View>
                  <Text style={styles.chevron}>{done ? '✓' : '›'}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      {/* Única saída da lista: a aba "início" da barra de 5 abas já leva de
          volta ao EducatorHome — um botão "SAIR DA ETAPA 1" à parte era
          redundante com ela. */}
      <RunnerBottomMenu />
    </SafeAreaView>
  );
}

// Barra de 5 abas do alfabetizador com os handlers montados pelo runner (a
// navigation do stack do educador vive fora do navegador aninhado).
function RunnerBottomMenu() {
  const { menu } = useRunner();
  return (
    <EducatorBottomMenu
      active={menu.active}
      onInicioPress={menu.onInicio}
      onTutorialPress={menu.onTutorial}
      onAcompanharPress={menu.onAcompanhar}
      onPontuacaoPress={menu.onPontuacao}
      onPerfilPress={menu.onPerfil}
    />
  );
}

// Slots do menu inferior das telas reaproveitadas: no modo educador não há
// tutoriais/pontuação/perfil do aluno — apenas voltam para a lista da Etapa 1.
function BackToListScreen({
  navigation,
}: NativeStackScreenProps<LearnerRootStackParamList, 'LearnerTutorials' | 'LearnerScore' | 'LearnerProfile'>) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.doneWrap}>
        <Text style={styles.doneText}>Indisponível no modo alfabetizador.</Text>
        <Pressable style={styles.doneBtn} onPress={() => navigation.navigate('LearnerHome')}>
          <Text style={styles.doneBtnText}>VOLTAR À ETAPA 1</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function EducatorEtapa1LessonsView({ navigation, route }: Props) {
  const { learnerId, learnerName, educatorId, themeId: themeIdParam } = route.params;

  // Tema do alfabetizando. O param é só um atalho: nem todo caminho até aqui o
  // carrega (o CTA "IR PARA A ETAPA 1" do espelhamento, o deep link
  // /educador/etapa-1/:learnerId — que é o que sobra ao recarregar a página no
  // mobile web). Sem tema o runner não monta: cada alfabetizando vê apenas as
  // aulas do tema escolhido para ele. `undefined` = ainda resolvendo.
  const [themeId, setThemeId] = useState<string | null | undefined>(themeIdParam);
  // Falha ao CONSULTAR o tema ≠ alfabetizando sem tema. Só o segundo caso pode
  // oferecer "escolher tema" — oferecer isso numa queda de rede levaria o
  // alfabetizador a reatribuir por engano o tema de quem já tem um.
  const [themeLookupFailed, setThemeLookupFailed] = useState(false);

  // O deep link também não carrega o nome; aproveitamos a mesma consulta para
  // não exibir "Alfabetizando" genérico nas telas da aula.
  const [fetchedName, setFetchedName] = useState<string | null>(null);

  const loadTheme = useCallback(async () => {
    setThemeId(undefined);
    setThemeLookupFailed(false);
    try {
      // Mesma fonte da lista da home do alfabetizador (tema atribuído no
      // cadastro, com fallback pelo progresso).
      const detail = await httpClient.get<{ themeId?: string | null; displayName?: string }>(
        `/cadastros/alfabetizandos/${learnerId}`,
      );
      setThemeId(detail.themeId ?? null);
      setFetchedName(detail.displayName?.trim() || null);
    } catch {
      setThemeLookupFailed(true);
      setThemeId(null);
    }
  }, [learnerId]);

  useEffect(() => {
    if (themeIdParam) {
      setThemeId(themeIdParam);
      setThemeLookupFailed(false);
      return;
    }
    void loadTheme();
  }, [themeIdParam, loadTheme]);

  const effectiveName = learnerName ?? fetchedName ?? undefined;

  const exitToHome = useCallback(() => {
    navigation.navigate('EducatorHome', { fullName: undefined, educatorId });
  }, [navigation, educatorId]);

  // Barra de 5 abas do educador exibida nas telas da Etapa 1 (Figma). Cada aba
  // sai do runner de volta à área do educador; a posição já foi salva pelos
  // listeners abaixo, então ao reabrir a Etapa 1 o app retoma de onde parou.
  // Alvos replicados de EducatorHomeView (menu inferior).
  const educatorMenu = useMemo<EducatorChromeMenu>(
    () => ({
      active: 'inicio',
      onInicio: () => navigation.navigate('EducatorHome', { educatorId }),
      onTutorial: () => navigation.navigate('EducatorTutorials', { educatorId }),
      onAcompanhar: () => navigation.navigate('EducatorHome', { educatorId }),
      onPontuacao: () =>
        educatorId
          ? navigation.navigate('EducatorScore', { educatorId, fullName: learnerName })
          : undefined,
      onPerfil: () => navigation.navigate('EducatorProfile'),
    }),
    [navigation, educatorId, learnerName],
  );

  const runnerValue = useMemo<RunnerContextValue>(
    () => ({
      learnerId,
      learnerName: learnerName ?? 'Alfabetizando',
      themeId: themeId ?? '',
      menu: educatorMenu,
      exitToHome,
    }),
    [learnerId, effectiveName, themeId, educatorMenu, exitToHome],
  );

  const chromeValue = useMemo(
    () => ({ hideBottomMenu: true, educatorMenu }),
    [educatorMenu],
  );

  // Distingue o foco inicial em LearnerHome (montagem — a retomada ainda vai ler
  // a posição salva) de um retorno deliberado à lista depois de entrar numa
  // aula. Só o segundo caso limpa a posição; assim o foco inicial não apaga o
  // ponto salvo antes de a retomada conseguir lê-lo.
  const visitedLessonRef = useRef(false);

  // Entrada da Etapa 1: Orientações → Tela de Abertura → aula. A tela de
  // "Orientações" (texto + card "Tutorial da Etapa 1") tinha sido removida em
  // 2026-07-23 por não ter vídeo real; restaurada a pedido do relatório de bugs
  // (report cita a tela pelo nome do Figma e pede a correção completa) — o
  // vídeo passa a ser um placeholder (ver ETAPA1_TUTORIAL_PLACEHOLDER_URL) até
  // existir um vídeo próprio por etapa, e assisti-lo não é obrigatório. `null`
  // = ainda lendo a posição salva: quem já estava no meio de uma aula pula
  // direto as duas telas de entrada e retoma de onde parou.
  const [introStep, setIntroStep] = useState<'orientacoes' | 'abertura' | 'done' | null>(null);
  const [showOrientacoesVideo, setShowOrientacoesVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pos = await getEtapa1Position(learnerId);
      if (!cancelled) setIntroStep(pos ? 'done' : 'orientacoes');
    })();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const introMenu = useMemo<EtapaIntroMenu>(
    () => ({
      onInicio: educatorMenu.onInicio,
      onTutorial: educatorMenu.onTutorial,
      onAcompanhar: educatorMenu.onAcompanhar,
      onPontuacao: educatorMenu.onPontuacao,
      onPerfil: educatorMenu.onPerfil,
    }),
    [educatorMenu],
  );

  if (introStep === null || themeId === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.loader} color="#111" />
      </SafeAreaView>
    );
  }

  // Sem tema atribuído (ou falha ao resolver): escolher o tema antes de
  // conduzir — mostrar as aulas de todos os temas seria pior que não mostrar
  // nenhuma.
  if (!themeId) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>ALFABETIZAÇÃO - ETAPA 1</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {themeLookupFailed ? 'Não foi possível carregar o tema' : 'Tema ainda não definido'}
            </Text>
            <Text style={styles.emptyText}>
              {themeLookupFailed
                ? 'Verifique a conexão e tente de novo.'
                : 'Escolha o tema deste alfabetizando para ver as aulas da Etapa 1 dele.'}
            </Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() =>
                themeLookupFailed
                  ? void loadTheme()
                  : navigation.navigate('LearnerThemeSelect', {
                      learnerId,
                      learnerName: effectiveName ?? 'Alfabetizando',
                      educatorId,
                    })
              }
            >
              <Text style={styles.retryText}>
                {themeLookupFailed ? 'TENTAR DE NOVO' : 'ESCOLHER TEMA'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        <EducatorBottomMenu
          active="inicio"
          onInicioPress={educatorMenu.onInicio}
          onTutorialPress={educatorMenu.onTutorial}
          onAcompanharPress={educatorMenu.onAcompanhar}
          onPontuacaoPress={educatorMenu.onPontuacao}
          onPerfilPress={educatorMenu.onPerfil}
        />
      </SafeAreaView>
    );
  }

  if (introStep === 'orientacoes') {
    return (
      <>
        <EducatorEtapa1OrientacoesScreen
          educatorId={educatorId}
          menu={introMenu}
          onIniciar={() => setIntroStep('abertura')}
          onAbrirTutorial={() => setShowOrientacoesVideo(true)}
        />
        {showOrientacoesVideo ? (
          <LearnerHintVideoOverlay
            videoUrl={ETAPA1_TUTORIAL_PLACEHOLDER_URL}
            title="Tutorial da Etapa 1"
            onClose={() => setShowOrientacoesVideo(false)}
          />
        ) : null}
      </>
    );
  }

  if (introStep === 'abertura') {
    return (
      <EducatorEtapa1AberturaScreen
        educatorId={educatorId}
        learnerName={effectiveName ?? 'Alfabetizando'}
        menu={introMenu}
        onVoltar={() => setIntroStep('orientacoes')}
        onAvancar={() => setIntroStep('done')}
      />
    );
  }

  return (
    <LearnerSessionProvider
      overrideLearnerProfileId={learnerId}
      overrideLearnerName={effectiveName}
      overrideThemeId={themeId}
    >
      <LearnerChromeContext.Provider value={chromeValue}>
        <RunnerContext.Provider value={runnerValue}>
          <RunnerStack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="LearnerHome"
            // Persistência local da posição: ao focar uma tela de aula, grava
            // rota + params; ao voltar à lista ou concluir, limpa. Sem editar
            // nenhuma tela reaproveitada do aluno.
            screenListeners={({ route }) => ({
              focus: () => {
                const name = route.name as keyof LearnerRootStackParamList;
                if (
                  name === 'LearnerLessonIntro' ||
                  name === 'LearnerLessonScreen' ||
                  name === 'LearnerLessonActivity'
                ) {
                  visitedLessonRef.current = true;
                  void saveEtapa1Position(learnerId, {
                    routeName: name,
                    params: (route.params ?? {}) as Record<string, unknown>,
                  });
                } else if (
                  name === 'LearnerLessonConclusion' ||
                  name === 'LearnerStageConclusion'
                ) {
                  // Aula concluída: não há ponto intermediário para retomar.
                  void clearEtapa1Position(learnerId);
                } else if (name === 'LearnerHome' && visitedLessonRef.current) {
                  // Retorno deliberado à lista após entrar numa aula.
                  void clearEtapa1Position(learnerId);
                }
              },
            })}
          >
          <RunnerStack.Screen name="LearnerHome" component={Etapa1LessonListScreen} />
          <RunnerStack.Screen name="LearnerLessonIntro" component={LearnerLessonIntroView} />
          <RunnerStack.Screen name="LearnerLessonScreen" component={LearnerLessonScreenView} />
          <RunnerStack.Screen name="LearnerLessonActivity" component={LearnerLessonActivityView} />
          <RunnerStack.Screen name="LearnerLessonConclusion" component={LearnerLessonConclusionView} />
          <RunnerStack.Screen name="LearnerStageConclusion" component={LearnerStageConclusionView} />
          <RunnerStack.Screen name="LearnerPhotoReview" component={LearnerPhotoReviewView} />
          <RunnerStack.Screen name="LearnerTutorials" component={BackToListScreen} />
          <RunnerStack.Screen name="LearnerScore" component={BackToListScreen} />
          <RunnerStack.Screen name="LearnerProfile" component={BackToListScreen} />
          </RunnerStack.Navigator>
        </RunnerContext.Provider>
      </LearnerChromeContext.Provider>
    </LearnerSessionProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  // paddingBottom folgado: a barra de 5 abas flutua sobre o fim da lista.
  container: { padding: 20, paddingBottom: 140, gap: 14 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 14, color: '#555', lineHeight: 20 },
  loader: { marginTop: 20 },
  error: { color: '#b3261e', fontSize: 13 },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: '#fafafa',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  emptyText: { fontSize: 14, color: '#555', lineHeight: 20 },
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: { color: '#1e3a5f', fontWeight: '700' },
  moduleBlock: { gap: 8 },
  moduleTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lessonLocked: { opacity: 0.6 },
  lessonBody: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  lessonTitleMuted: { flex: 1, fontSize: 15, fontWeight: '700', color: '#888' },
  lessonCount: { fontSize: 12, color: '#888', fontWeight: '600' },
  lessonHint: { fontSize: 12, color: '#aaa' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone: { backgroundColor: '#2e7d32' },
  dotOpen: { backgroundColor: '#1e3a5f' },
  dotMuted: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#c8c8c8' },
  chevron: { fontSize: 18, color: '#1e3a5f', fontWeight: '700' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#1e3a5f', textAlign: 'center' },
  doneText: { fontSize: 16, color: '#333', textAlign: 'center', lineHeight: 24 },
  doneBtn: {
    marginTop: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', letterSpacing: 0.4 },
});
