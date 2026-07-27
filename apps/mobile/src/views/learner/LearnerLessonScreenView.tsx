import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio, ResizeMode, Video } from "expo-av";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LearnerScreenSnapshot } from "@letras/shared-types";
import { LearnerRootStackParamList } from "../../types";
import { LearnerActionButtons } from "./components/LearnerActionButtons";
import { LearnerScreenLayout } from "./components/LearnerScreenLayout";
import { learnerTheme } from "./learnerTheme";
import { useLearnerFlowData } from "./learnerFlowData";
import {
  LearnerExerciseConfig,
  LearnerFlowLesson,
} from "./learnerFlowMapper";
import { useLearnerSession } from "./learnerSessionContext";
import {
  loadLearnerLessonCheckpoint,
  saveLearnerLessonCheckpoint,
} from "../../infra/storage/learner-lesson-checkpoint-storage";
import { playErrorBeep, playSuccessBeep } from "./exerciseSounds";

type Props = NativeStackScreenProps<
  LearnerRootStackParamList,
  "LearnerLessonScreen"
>;

interface ExerciseFeedback {
  type: "ok" | "error";
  message: string;
}

function resolveLockMessage(
  reason: string | null,
  lockMessage?: string | null,
) {
  const explicitMessage = String(lockMessage || "").trim();
  if (explicitMessage) {
    return explicitMessage;
  }
  const normalizedReason = String(reason || "")
    .trim()
    .toLowerCase();
  if (!normalizedReason) {
    return "A tela foi bloqueada. Aguarde apoio do alfabetizador para continuar.";
  }
  if (normalizedReason.includes("ajuda")) {
    return "A tela foi bloqueada porque houve pedido de ajuda. O alfabetizador entrará em contato.";
  }
  if (
    normalizedReason.includes("tentativa") ||
    normalizedReason.includes("erro")
  ) {
    return "A tela foi bloqueada após tentativas sem acerto. Aguarde orientação do alfabetizador.";
  }
  return reason ?? "A tela foi bloqueada temporariamente.";
}

function isInstructionAudioButtonVisible(
  exercise: LearnerExerciseConfig | null,
) {
  return Boolean(exercise);
}

// Ícone de expandir (RN043) — quatro cantos, como no Figma (Modelo imagem).
function ExpandIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4H4V9"
        stroke="#111111"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 4H20V9"
        stroke="#111111"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 20H4V15"
        stroke="#111111"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 20H20V15"
        stroke="#111111"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SoundWaveIcon({
  large = false,
  active = false,
}: {
  large?: boolean;
  active?: boolean;
}) {
  // Verde escuro quando o audio esta tocando (ou e o audio principal,
  // sempre destacado). Verde claro indica "tocavel mas inativo".
  const color = large || active ? "#2fa536" : "#9be39f";
  const strokeWidth = large ? 4.5 : 4;
  return (
    <Svg
      width={large ? 66 : 38}
      height={large ? 54 : 32}
      viewBox="0 0 66 54"
      fill="none"
    >
      <Path d="M8 22H19L33 10V44L19 32H8V22Z" fill={color} />
      <Path
        d="M42 20C45 23.5 45 30.5 42 34"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M49 15C55 21 55 33 49 39"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {large ? (
        <Path
          d="M56 10C65 19 65 35 56 44"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

// Veredito da atividade SEM texto (o alfabetizando não lê): círculo verde com
// ✓ para acerto/liberação, círculo vermelho com ✗ para erro/"ainda não".
// Substitui a mensagem de texto do card de feedback — a orientação real vem
// pelo áudio, não por leitura.
function FeedbackVerdictIcon({ type }: { type: "ok" | "error" }) {
  const isOk = type === "ok";
  const color = isOk ? "#2fa536" : "#ef4444";
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={18} fill={color} />
      {isOk ? (
        <Path
          d="M12 20.5L17.5 26L28 15"
          stroke="#ffffff"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <Path
            d="M14 14L26 26"
            stroke="#ffffff"
            strokeWidth={3.4}
            strokeLinecap="round"
          />
          <Path
            d="M26 14L14 26"
            stroke="#ffffff"
            strokeWidth={3.4}
            strokeLinecap="round"
          />
        </>
      )}
    </Svg>
  );
}

function SpeakerButton({
  onPress,
  large = false,
  disabled = false,
  active = false,
}: {
  onPress: () => void;
  large?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Reproduzir áudio"
      hitSlop={large ? 12 : 8}
      style={({ pressed }) => [
        large ? styles.largeAudioBtn : styles.itemSpeakerBtn,
        active ? styles.audioBtnActive : null,
        pressed && !disabled ? styles.audioBtnPressed : null,
        disabled ? styles.audioBtnDisabled : null,
      ]}
    >
      <SoundWaveIcon large={large} active={active} />
    </Pressable>
  );
}

function clampAspectRatio(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const ratio = width / height;
  return Math.max(1.2, Math.min(2, ratio));
}

function buildSpellingNarration(label: string): string {
  const normalized = String(label || "").trim();
  if (!normalized) return "";
  return normalized
    .split(/\s+/g)
    .map((chunk) => chunk.split("").join(" "))
    .join(", ");
}

function speakWithBrowserVoice(text: string, onEnd?: () => void): boolean {
  const normalized = String(text || "").trim();
  if (!normalized || Platform.OS !== "web") {
    return false;
  }

  const runtime = globalThis as {
    speechSynthesis?: {
      cancel: () => void;
      speak: (utterance: unknown) => void;
      getVoices: () => Array<{ lang?: string }>;
    };
    SpeechSynthesisUtterance?: new (value: string) => {
      lang?: string;
      rate?: number;
      pitch?: number;
      voice?: unknown;
    };
  };

  if (
    !runtime.speechSynthesis ||
    typeof runtime.SpeechSynthesisUtterance !== "function"
  ) {
    return false;
  }

  const utterance = new runtime.SpeechSynthesisUtterance(normalized);
  const voices = runtime.speechSynthesis.getVoices?.() ?? [];
  const preferredVoice =
    voices.find((voice) =>
      String(voice.lang || "")
        .toLowerCase()
        .startsWith("pt-br"),
    ) ??
    voices.find((voice) =>
      String(voice.lang || "")
        .toLowerCase()
        .startsWith("pt"),
    );

  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (onEnd) {
    (utterance as { onend?: () => void }).onend = onEnd;
  }

  runtime.speechSynthesis.cancel();
  runtime.speechSynthesis.speak(utterance);
  return true;
}

function cancelBrowserVoice() {
  if (Platform.OS !== "web") return;
  const runtime = globalThis as { speechSynthesis?: { cancel: () => void } };
  runtime.speechSynthesis?.cancel();
}

export function LearnerLessonScreenView({ navigation, route }: Props) {
  const { moduleId, lessonId } = route.params;
  const { getLesson, loading } = useLearnerFlowData();
  const lesson = getLesson(moduleId, lessonId);

  if (!lesson) {
    return (
      <LearnerScreenLayout
        activeMenu="inicio"
        onMenuHome={() => navigation.navigate("LearnerHome")}
      >
        <Text style={styles.error}>
          {loading ? "Carregando aula..." : "Conteúdo não encontrado."}
        </Text>
      </LearnerScreenLayout>
    );
  }

  return (
    <LoadedLearnerLessonScreenView
      navigation={navigation}
      route={route}
      lesson={lesson}
    />
  );
}

function LoadedLearnerLessonScreenView({
  navigation,
  route,
  lesson,
}: Props & { lesson: LearnerFlowLesson }) {
  const { moduleId, lessonId, screenIndex, moduleLabel, moduleTitle } =
    route.params;
  const learnerSession = useLearnerSession();
  const wrongSelectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reinforcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activeAudioRef = useRef<Audio.Sound | null>(null);
  const audioRequestIdRef = useRef(0);

  const [didFailImageLoad, setDidFailImageLoad] = useState(false);
  const [didFailMediaLoad, setDidFailMediaLoad] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(16 / 9);
  // RN043: imagem da aula expandida em tela cheia (toque abre/fecha).
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const [matchSelectedOptions, setMatchSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [matchCompletedIds, setMatchCompletedIds] = useState<string[]>([]);
  const [matchUnlockedIndex, setMatchUnlockedIndex] = useState(0);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  // Veredito visual do Marcar Caixas após o AVANÇAR (Figma: borda verde +
  // badge ✓ no card correto, borda vermelha + badge ✗ no errado).
  const [markVerdicts, setMarkVerdicts] = useState<
    Record<string, "ok" | "err">
  >({});
  const markVerdictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [exerciseAttempts, setExerciseAttempts] = useState(0);
  const [exerciseLocked, setExerciseLocked] = useState(false);
  const [remoteLockWasObserved, setRemoteLockWasObserved] = useState(false);
  const [exerciseFeedback, setExerciseFeedback] =
    useState<ExerciseFeedback | null>(null);
  const [showReinforcement, setShowReinforcement] = useState(false);
  const [reinforcementMessage, setReinforcementMessage] = useState<
    string | null
  >(null);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);
  // Trava didatica: no exercicio "match-letter" os audios das palavras
  // individuais so liberam depois que o audio principal de instrucao
  // (chave `instruction-<screen.id>`) terminou de tocar pelo menos uma
  // vez. Garante a sequencia pedagogica pedida pelo alfabetizador.
  const [instructionAudioPlayed, setInstructionAudioPlayed] = useState(false);
  const restoredCheckpointRef = useRef<string | null>(null);

  useEffect(() => {
    const learnerId = learnerSession.learnerProfileId;
    if (!learnerId) return;
    const checkpointKey = `${learnerId}/${lessonId}`;
    restoredCheckpointRef.current = null;
    void loadLearnerLessonCheckpoint(learnerId, lessonId).then((checkpoint) => {
      if (
        checkpoint?.moduleId !== moduleId ||
        checkpoint.screenIndex !== screenIndex
      ) {
        restoredCheckpointRef.current = checkpointKey;
        return;
      }
      setMatchSelectedOptions(checkpoint.matchSelectedOptions ?? {});
      setMatchCompletedIds(checkpoint.matchCompletedIds ?? []);
      setMatchUnlockedIndex(checkpoint.matchUnlockedIndex ?? 0);
      setSelectedImageIds(checkpoint.selectedImageIds ?? []);
      setExerciseAttempts(checkpoint.exerciseAttempts ?? 0);
      setExerciseLocked(Boolean(checkpoint.exerciseLocked));
      setInstructionAudioPlayed(Boolean(checkpoint.instructionAudioPlayed));
      restoredCheckpointRef.current = checkpointKey;
    });
  }, [learnerSession.learnerProfileId, lessonId, moduleId, screenIndex]);

  useEffect(() => {
    const learnerId = learnerSession.learnerProfileId;
    const checkpointKey = learnerId ? `${learnerId}/${lessonId}` : null;
    if (!learnerId || restoredCheckpointRef.current !== checkpointKey) return;
    const timer = setTimeout(() => {
      void saveLearnerLessonCheckpoint({
        learnerId,
        moduleId,
        lessonId,
        screenIndex,
        matchSelectedOptions,
        matchCompletedIds,
        matchUnlockedIndex,
        selectedImageIds,
        exerciseAttempts,
        exerciseLocked,
        instructionAudioPlayed,
        updatedAt: new Date().toISOString(),
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [
    exerciseAttempts,
    exerciseLocked,
    instructionAudioPlayed,
    learnerSession.learnerProfileId,
    lessonId,
    matchCompletedIds,
    matchSelectedOptions,
    matchUnlockedIndex,
    moduleId,
    screenIndex,
    selectedImageIds,
  ]);

  const totalScreens = lesson.screens.length;
  const numericScreenIndex = Number.isFinite(Number(screenIndex))
    ? Number(screenIndex)
    : 0;
  const safeIndex = Math.min(
    Math.max(numericScreenIndex, 0),
    totalScreens - 1,
  );
  const screen = lesson.screens[safeIndex];
  const progressPercent = ((safeIndex + 1) / totalScreens) * 100;
  const completedMatchSet = useMemo(
    () => new Set(matchCompletedIds),
    [matchCompletedIds],
  );
  const isLockedByTemplate = screen.screenTemplate === "locked";
  const isLocked =
    isLockedByTemplate || exerciseLocked || learnerSession.isLocked;
  const isInteractionLocked = isLocked || showReinforcement;
  // Quando expectedSelections não está definido no payload do exercício (schema
  // letras-stage2-v1 sem o campo), infere pela contagem de itens corretos antes
  // de cair no fallback 1 — evita que exercícios com N respostas corretas sejam
  // concluídos com apenas 1 seleção.
  const expectedSelections = Math.max(
    1,
    screen.exercise?.expectedSelections ??
      screen.exercise?.items?.filter((item) => item.isCorrectTarget).length ??
      1,
  );
  const selectedImageCount = selectedImageIds.length;
  const shouldRenderDefaultMedia =
    screen.screenTemplate === "default" && !screen.exercise;

  const pauseOtherHtmlMedia = useCallback((exceptElement: unknown = null) => {
    // No web temos tres fontes de audio concorrentes: <audio>/<video> nativos
    // renderizados em telas de midia, o expo-av (speaker dos exercicios) e o
    // speechSynthesis (fallback TTS). Para evitar sobreposicao, ao iniciar
    // qualquer audio paramos todos os elementos de midia da pagina, exceto o
    // que disparou o evento.
    if (Platform.OS !== "web") return;
    const runtimeDocument = (globalThis as { document?: Document }).document;
    if (!runtimeDocument) return;
    runtimeDocument.querySelectorAll("audio, video").forEach((element) => {
      if (element === exceptElement) return;
      const mediaElement = element as HTMLMediaElement;
      if (mediaElement.paused) return;
      try {
        mediaElement.pause();
      } catch {
        // Elementos ainda nao prontos podem lancar; nao ha o que fazer aqui.
      }
    });
  }, []);

  const stopCurrentAudio = useCallback(
    async (exceptHtmlElement: unknown = null) => {
      audioRequestIdRef.current += 1;
      cancelBrowserVoice();
      pauseOtherHtmlMedia(exceptHtmlElement);
      const current = activeAudioRef.current;
      activeAudioRef.current = null;
      setPlayingAudioKey(null);
      if (!current) return;
      try {
        await current.stopAsync();
      } catch {
        // The audio may already be stopped; unloading below is still the important part.
      }
      try {
        await current.unloadAsync();
      } catch {
        // Ignore unload errors from already released native resources.
      }
    },
    [pauseOtherHtmlMedia],
  );

  const playAudioUrl = useCallback(
    async (
      url: string | null | undefined,
      fallbackText?: string | null,
      key?: string,
    ) => {
      const normalizedUrl = String(url || "").trim();
      const normalizedFallback = String(fallbackText || "").trim();
      const audioKey = key || normalizedUrl;

      // Toggle: clicar de novo no audio que esta tocando para o audio
      // em vez de reiniciar. Resolve a queixa "clicando uma segunda vez
      // ele tem que parar".
      if (audioKey && audioKey === playingAudioKey) {
        await stopCurrentAudio();
        return;
      }

      await stopCurrentAudio();
      const requestId = audioRequestIdRef.current;

      if (!normalizedUrl) {
        if (requestId === audioRequestIdRef.current) {
          // Registra a chave também para a voz do navegador: sem isso o
          // segundo toque não vira toggle e a fala reinicia em vez de parar.
          const spoke = speakWithBrowserVoice(normalizedFallback, () => {
            setPlayingAudioKey((current) =>
              current === audioKey ? null : current,
            );
          });
          if (spoke && audioKey) {
            setPlayingAudioKey(audioKey);
          }
        }
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: normalizedUrl },
          { shouldPlay: true },
        );
        if (requestId !== audioRequestIdRef.current) {
          try {
            await sound.stopAsync();
          } catch {
            // The stale sound may not have started yet.
          }
          await sound.unloadAsync();
          return;
        }
        activeAudioRef.current = sound;
        setPlayingAudioKey(audioKey);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || !status.didJustFinish) return;
          void sound.unloadAsync();
          if (activeAudioRef.current === sound) {
            activeAudioRef.current = null;
            setPlayingAudioKey(null);
          }
          // Marca a instrucao como "ja ouvida" para liberar os audios
          // individuais das palavras (gate didatico do match-letter).
          if (audioKey.startsWith("instruction-")) {
            setInstructionAudioPlayed(true);
          }
        });
      } catch {
        if (requestId !== audioRequestIdRef.current) {
          return;
        }
        activeAudioRef.current = null;
        setPlayingAudioKey(null);
        speakWithBrowserVoice(normalizedFallback);
      }
    },
    [playingAudioKey, stopCurrentAudio],
  );

  // Estado de interação do aprendiz mantido em ref para que o snapshot builder
  // permaneça estável (não re-dispara os efeitos de foco/áudio) e ainda leia
  // sempre as seleções mais recentes ao emitir para o espelho do educador.
  const interactionRef = useRef<{
    selectedLetters: Record<string, string>;
    completedItemIds: string[];
    selectedImageIds: string[];
    isLocked: boolean;
    feedback: ExerciseFeedback | null;
  }>({
    selectedLetters: {},
    completedItemIds: [],
    selectedImageIds: [],
    isLocked: false,
    feedback: null,
  });
  interactionRef.current = {
    selectedLetters: matchSelectedOptions,
    completedItemIds: matchCompletedIds,
    selectedImageIds,
    isLocked: isInteractionLocked,
    feedback: exerciseFeedback,
  };

  // Snapshot rico da tela atual — usado tanto no pedido de ajuda quanto no
  // estado emitido a cada troca de tela (espelhamento ao vivo do educador).
  const buildScreenSnapshot = useCallback(
    (): LearnerScreenSnapshot => ({
      moduleId,
      lessonId,
      moduleLabel,
      moduleTitle,
      lessonTitle: lesson.title,
      screenIndex: safeIndex,
      totalScreens,
      stage: String(lesson.stageNumber ?? 2) as LearnerScreenSnapshot["stage"],
      screenId: screen.id,
      screenTitle: screen.title,
      screenTemplate: screen.screenTemplate,
      mediaUrl: screen.mediaUrl,
      mediaKind: screen.mediaKind,
      learnerSpeech: screen.learnerSpeech,
      highlightMessage: screen.highlightMessage,
      exercise: screen.exercise ?? null,
      interaction: {
        selectedLetters: interactionRef.current.selectedLetters,
        completedItemIds: interactionRef.current.completedItemIds,
        selectedImageIds: interactionRef.current.selectedImageIds,
        isLocked: interactionRef.current.isLocked,
        feedback: interactionRef.current.feedback,
      },
    }),
    [
      lesson.stageNumber,
      lesson.title,
      lessonId,
      moduleId,
      moduleLabel,
      moduleTitle,
      safeIndex,
      screen.exercise,
      screen.highlightMessage,
      screen.id,
      screen.learnerSpeech,
      screen.mediaKind,
      screen.mediaUrl,
      screen.screenTemplate,
      screen.title,
      totalScreens,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void learnerSession.syncCurrentState({
        currentView: "LearnerLessonScreen",
        currentActivityId: screen.id,
        statePayload: {
          // Campos "magros" mantidos por compatibilidade com o card de dados
          // cadastrais; o `snapshot` rico alimenta o espelho ao vivo (Fase 1).
          moduleId,
          lessonId,
          screenIndex: safeIndex,
          screenTemplate: screen.screenTemplate,
          snapshot: buildScreenSnapshot(),
        },
      });
      void learnerSession.recordProgress({
        activityId: screen.id,
        status: "IN_PROGRESS",
      });
      // Quando esta tela perde o foco (navegacao para Conclusion,
      // Home, ou menu inferior) o stack do React Navigation mantem
      // o componente montado em background. Sem este cleanup o
      // audio do expo-av (activeAudioRef) seguiria tocando ate o
      // usuario voltar para a tela — exatamente o sintoma "depois
      // de mudar de pagina o audio continua rolando".
      return () => {
        void stopCurrentAudio();
      };
    }, [
      buildScreenSnapshot,
      learnerSession,
      lessonId,
      moduleId,
      safeIndex,
      screen.id,
      screen.screenTemplate,
      stopCurrentAudio,
    ]),
  );

  // Reemite o estado quando a interação do exercício muda (letra marcada,
  // imagem escolhida, item concluído, feedback/lock), para o espelho do
  // educador refletir as seleções do aprendiz em tempo real. Desacoplado do
  // useFocusEffect para não reprocessar áudio/progresso a cada toque.
  useEffect(() => {
    void learnerSession.syncCurrentState({
      currentView: "LearnerLessonScreen",
      currentActivityId: screen.id,
      statePayload: {
        moduleId,
        lessonId,
        screenIndex: safeIndex,
        screenTemplate: screen.screenTemplate,
        snapshot: buildScreenSnapshot(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    matchSelectedOptions,
    matchCompletedIds,
    selectedImageIds,
    markVerdicts,
    exerciseLocked,
    exerciseFeedback,
  ]);

  useEffect(() => {
    void stopCurrentAudio();
    setDidFailImageLoad(false);
    setDidFailMediaLoad(false);
    setMediaAspectRatio(16 / 9);
    setIsImageExpanded(false);
    setMatchSelectedOptions({});
    setMatchCompletedIds([]);
    setMatchUnlockedIndex(0);
    setMatchWrongIds([]);
    setSelectedImageIds([]);
    setMarkVerdicts({});
    if (markVerdictTimeoutRef.current) {
      clearTimeout(markVerdictTimeoutRef.current);
      markVerdictTimeoutRef.current = null;
    }
    setExerciseAttempts(0);
    setExerciseLocked(false);
    setRemoteLockWasObserved(false);
    setExerciseFeedback(null);
    setShowReinforcement(false);
    setReinforcementMessage(null);
    setInstructionAudioPlayed(false);
    if (wrongSelectionTimeoutRef.current) {
      clearTimeout(wrongSelectionTimeoutRef.current);
      wrongSelectionTimeoutRef.current = null;
    }
    if (reinforcementTimeoutRef.current) {
      clearTimeout(reinforcementTimeoutRef.current);
      reinforcementTimeoutRef.current = null;
    }
  }, [
    screen.id,
    screen.mediaKind,
    screen.mediaUrl,
    screen.screenTemplate,
    stopCurrentAudio,
  ]);

  // Autoplay narração quando tela muda (texto vira áudio para o alfabetizando)
  useEffect(() => {
    if (screen.exercise) return;
    const text = screen.learnerSpeech;
    const audioUrl = screen.narrationAudioUrl;
    if (!text && !audioUrl) return;
    const key = `narration-${screen.id}`;
    const timer = setTimeout(() => {
      if (audioUrl) {
        void playAudioUrl(audioUrl, text, key);
      } else {
        speakWithBrowserVoice(text ?? "");
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id, screen.narrationAudioUrl, screen.learnerSpeech]);

  useEffect(() => {
    if (learnerSession.isLocked) {
      setRemoteLockWasObserved(true);
      return;
    }

    if (!remoteLockWasObserved || !exerciseLocked) {
      return;
    }

    setExerciseLocked(false);
    setExerciseAttempts(0);
    setExerciseFeedback({
      type: "ok",
      message: "Atividade liberada pelo alfabetizador. Você já pode continuar.",
    });
  }, [exerciseLocked, learnerSession.isLocked, remoteLockWasObserved]);

  useEffect(() => {
    return () => {
      if (wrongSelectionTimeoutRef.current) {
        clearTimeout(wrongSelectionTimeoutRef.current);
      }
      if (reinforcementTimeoutRef.current) {
        clearTimeout(reinforcementTimeoutRef.current);
      }
      const activeAudio = activeAudioRef.current;
      activeAudioRef.current = null;
      if (activeAudio) {
        void activeAudio.unloadAsync();
      }
    };
  }, []);

  const handleMediaReady = (event: unknown) => {
    const naturalSize = (
      event as { naturalSize?: { width?: number; height?: number } }
    )?.naturalSize;
    const width = Number(naturalSize?.width ?? 0);
    const height = Number(naturalSize?.height ?? 0);
    const clampedRatio = clampAspectRatio(width, height);
    if (!clampedRatio) return;
    setMediaAspectRatio(clampedRatio);
  };

  const renderVideoPlayer = (mediaUrl: string) => {
    if (Platform.OS === "web") {
      return createElement("video", {
        src: mediaUrl,
        controls: true,
        playsInline: true,
        preload: "metadata",
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          backgroundColor: "#000000",
          objectFit: "contain",
        },
        onLoadedMetadata: (event: {
          currentTarget?: {
            videoWidth?: number;
            videoHeight?: number;
          };
        }) => {
          const width = Number(event.currentTarget?.videoWidth ?? 0);
          const height = Number(event.currentTarget?.videoHeight ?? 0);
          const clampedRatio = clampAspectRatio(width, height);
          if (!clampedRatio) return;
          setMediaAspectRatio(clampedRatio);
        },
        onPlay: (event: { currentTarget?: unknown }) => {
          void stopCurrentAudio(event.currentTarget ?? null);
        },
        onError: () => setDidFailMediaLoad(true),
      });
    }

    return (
      <Video
        source={{ uri: mediaUrl }}
        style={styles.videoMedia}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onReadyForDisplay={handleMediaReady}
        onError={() => setDidFailMediaLoad(true)}
      />
    );
  };

  const renderAudioPlayer = (mediaUrl: string) => {
    // No web a tag <video> nao expoe controles utilizaveis para arquivos de
    // audio (renderiza apenas um retangulo cinza). Usamos a tag <audio> nativa
    // para ter o player com play/pausa/scrubber.
    if (Platform.OS === "web") {
      return createElement("audio", {
        src: mediaUrl,
        controls: true,
        preload: "metadata",
        style: {
          width: "100%",
          display: "block",
        },
        onPlay: (event: { currentTarget?: unknown }) => {
          void stopCurrentAudio(event.currentTarget ?? null);
        },
        onError: () => setDidFailMediaLoad(true),
      });
    }

    return (
      <Video
        source={{ uri: mediaUrl }}
        style={styles.audioMedia}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onError={() => setDidFailMediaLoad(true)}
      />
    );
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (safeIndex > 0) {
      navigation.replace("LearnerLessonScreen", {
        moduleId,
        lessonId,
        screenIndex: safeIndex - 1,
        moduleLabel,
        moduleTitle,
      });
      return;
    }

    navigation.navigate("LearnerLessonIntro", {
      moduleId,
      lessonId,
      moduleLabel,
      moduleTitle,
    });
  };

  const goNextDefault = async () => {
    await learnerSession.recordProgress({
      activityId: screen.id,
      status: "COMPLETED",
    });

    if (screen.followUpActivity) {
      navigation.push("LearnerLessonActivity", {
        moduleId,
        lessonId,
        screenIndex: safeIndex,
        moduleLabel,
        moduleTitle,
      });
      return;
    }

    if (safeIndex + 1 < totalScreens) {
      navigation.push("LearnerLessonScreen", {
        moduleId,
        lessonId,
        screenIndex: safeIndex + 1,
        moduleLabel,
        moduleTitle,
      });
      return;
    }

    navigation.push("LearnerLessonConclusion", {
      moduleId,
      lessonId,
      moduleLabel,
      moduleTitle,
    });
  };

  const lockCurrentExercise = (message: string) => {
    // RN111: bip de erro também no bloqueio por tentativas.
    playErrorBeep();
    const nextAttempts = Math.max(
      exerciseAttempts,
      screen.exercise?.maxAttemptsBeforeLock ?? 1,
    );
    setExerciseLocked(true);
    // Sem feedback de texto ao travar — o alfabetizando não lê. `setSessionLocked`
    // aciona o banner visual "AGUARDANDO AJUDA"; `message` segue só como
    // lockReason para o educador/registro de progresso.
    setExerciseFeedback(null);
    void learnerSession.recordProgress({
      activityId: screen.id,
      status: "LOCKED",
      attempts: nextAttempts,
      errorsCount: nextAttempts,
      maxAttempts: screen.exercise?.maxAttemptsBeforeLock,
      lockReason: message,
    });
    void learnerSession.setSessionLocked(true);
    // O pedido de ajuda nao e disparado automaticamente no lock — o aluno
    // ve o icone de mao levantada (RaisedHandIcon) que aparece quando
    // canRequestHelp passa a ser true e decide bater quando quiser apoio.
    // Sem isso, o banner AGUARDANDO AJUDA virava o estado padrao ao errar
    // tres vezes, sem dar voz ao aluno.
  };

  const canAdvanceMatchExercise =
    screen.screenTemplate === "exercise-match-letter" &&
    screen.exercise &&
    screen.exercise.items.length > 0 &&
    screen.exercise.items.every((item) => completedMatchSet.has(item.id)) &&
    !isInteractionLocked;

  const canAdvanceMarkImagesExercise =
    screen.screenTemplate === "exercise-mark-images" &&
    screen.exercise &&
    selectedImageCount === expectedSelections &&
    !isInteractionLocked;

  const triggerErrorReinforcement = (fallbackMessage: string) => {
    const config = screen.exercise?.errorReinforcement;
    if (!config) {
      return false;
    }

    if (!config.preserveProgress) {
      setMatchCompletedIds([]);
      setMatchUnlockedIndex(0);
      setSelectedImageIds([]);
    }

    if (reinforcementTimeoutRef.current) {
      clearTimeout(reinforcementTimeoutRef.current);
    }

    const reinforcementText = config.instructionText || fallbackMessage;
    setReinforcementMessage(reinforcementText);
    setShowReinforcement(true);

    if (config.instructionAudioUrl) {
      void playAudioUrl(
        config.instructionAudioUrl,
        reinforcementText,
        "reinforcement",
      );
    }

    reinforcementTimeoutRef.current = setTimeout(
      () => {
        setShowReinforcement(false);
      },
      Math.max(500, config.autoReturnMs),
    );

    return true;
  };

  const handleMatchOptionPress = (
    itemIndex: number,
    itemId: string,
    option: string,
  ) => {
    if (
      screen.screenTemplate !== "exercise-match-letter" ||
      !screen.exercise ||
      isInteractionLocked
    ) {
      return;
    }
    if (screen.exercise.progressiveUnlock && itemIndex > matchUnlockedIndex) {
      return;
    }

    const item = screen.exercise.items[itemIndex];
    const normalizedOption = String(option).toUpperCase();
    const isCorrect = item.correctOptions.includes(normalizedOption);

    setMatchSelectedOptions((previous) => ({
      ...previous,
      [itemId]: normalizedOption,
    }));

    if (isCorrect) {
      // RN112: bip de acerto.
      playSuccessBeep();
      setMatchCompletedIds((previous) =>
        previous.includes(itemId) ? previous : [...previous, itemId],
      );
      if (screen.exercise.progressiveUnlock) {
        setMatchUnlockedIndex((previous) => Math.max(previous, itemIndex + 1));
      }
      setExerciseFeedback({
        type: "ok",
        message: screen.exercise.successFeedback || "Correto!",
      });
      return;
    }

    // RN111: bip de erro.
    playErrorBeep();
    setMatchWrongIds((previous) => [
      ...previous.filter((id) => id !== itemId),
      itemId,
    ]);

    if (wrongSelectionTimeoutRef.current) {
      clearTimeout(wrongSelectionTimeoutRef.current);
    }
    wrongSelectionTimeoutRef.current = setTimeout(() => {
      setMatchSelectedOptions((previous) => {
        const next = { ...previous };
        delete next[itemId];
        return next;
      });
      setMatchWrongIds((previous) => previous.filter((id) => id !== itemId));
    }, 1000);

    const nextAttempts = exerciseAttempts + 1;
    setExerciseAttempts(nextAttempts);
    // Etapa 1 conduzida pelo educador: sem trava por tentativas — o
    // alfabetizador está ao lado para orientar e o aluno tenta de novo.
    if (
      !learnerSession.isEducatorConducted &&
      nextAttempts >= screen.exercise.maxAttemptsBeforeLock
    ) {
      lockCurrentExercise(
        resolveLockMessage(screen.lockReason, screen.lockMessage),
      );
      return;
    }

    const fallbackMessage =
      screen.exercise.errorFeedback || "Tente outra posição.";
    const hasReinforcement = triggerErrorReinforcement(fallbackMessage);
    setExerciseFeedback({
      type: "error",
      message: hasReinforcement
        ? "Revendo orientação. Aguarde para tentar novamente."
        : fallbackMessage,
    });
  };

  const handleToggleMarkImageItem = (itemId: string) => {
    if (
      screen.screenTemplate !== "exercise-mark-images" ||
      !screen.exercise ||
      isInteractionLocked
    ) {
      return;
    }
    // Enquanto o veredito (✓/✗) está na tela, os toques ficam suspensos —
    // o flash termina sozinho e libera a próxima tentativa.
    if (Object.keys(markVerdicts).length > 0) {
      return;
    }
    setSelectedImageIds((previous) => {
      if (previous.includes(itemId)) {
        return previous.filter((value) => value !== itemId);
      }
      if (previous.length >= expectedSelections) {
        return previous;
      }
      return [...previous, itemId];
    });
    setExerciseFeedback(null);
  };

  const handleInstructionAudioPress = () => {
    const instructionUrl = screen.exercise?.instructionAudioUrl;
    const fallbackInstruction =
      screen.exercise?.instructionText ||
      "Escute o audio e marque a letra correta.";
    void playAudioUrl(
      instructionUrl,
      fallbackInstruction,
      `instruction-${screen.id}`,
    );
  };

  const onNext = () => {
    if (showReinforcement) {
      setExerciseFeedback({
        type: "error",
        message: "Aguarde o término da tela de reforço para continuar.",
      });
      return;
    }

    // Tela travada (sessão ou template "bloqueada"): sem feedback de texto —
    // o alfabetizando não lê. O banner visual "AGUARDANDO AJUDA" já indica o
    // estado; tocar AVANÇAR simplesmente não faz nada.
    if (learnerSession.isLocked || isLockedByTemplate) {
      return;
    }

    if (screen.screenTemplate === "exercise-match-letter") {
      if (!canAdvanceMatchExercise) {
        // Travado (banner "AGUARDANDO AJUDA" já visível) → sem texto de lock.
        if (!isInteractionLocked) {
          setExerciseFeedback({
            type: 'error',
            message: 'Conclua todas as respostas para avançar.',
          });
        }
        return;
      }
      goNextDefault();
      return;
    }

    if (screen.screenTemplate === "exercise-mark-images" && screen.exercise) {
      if (!canAdvanceMarkImagesExercise) {
        setExerciseFeedback({
          type: "error",
          message: `Selecione exatamente ${expectedSelections} caixa(s) para liberar o avançar.`,
        });
        return;
      }

      const selectedSet = new Set(selectedImageIds);
      const correctSet = new Set(
        screen.exercise.items
          .filter((item) => item.isCorrectTarget)
          .map((item) => item.id),
      );
      const hasOnlyCorrectSelections = [...selectedSet].every((itemId) =>
        correctSet.has(itemId),
      );
      const isCorrect =
        hasOnlyCorrectSelections && selectedSet.size === expectedSelections;

      // Veredito visual por card (Figma): verde+✓ nos corretos selecionados,
      // vermelho+✗ nos errados selecionados.
      const verdicts: Record<string, "ok" | "err"> = {};
      for (const itemId of selectedSet) {
        verdicts[itemId] = correctSet.has(itemId) ? "ok" : "err";
      }
      setMarkVerdicts(verdicts);

      if (isCorrect) {
        // RN112: bip de acerto.
        playSuccessBeep();
        setExerciseFeedback({
          type: "ok",
          message:
            screen.exercise.successFeedback ||
            "Muito bem! Avançando para a próxima tela.",
        });
        // Deixa o aluno VER os ✓ antes de trocar de tela.
        if (markVerdictTimeoutRef.current) {
          clearTimeout(markVerdictTimeoutRef.current);
        }
        markVerdictTimeoutRef.current = setTimeout(() => {
          goNextDefault();
        }, 900);
        return;
      }

      // RN111: bip de erro.
      playErrorBeep();

      const nextAttempts = exerciseAttempts + 1;
      setExerciseAttempts(nextAttempts);
      // Etapa 1 conduzida pelo educador: sem trava por tentativas — o
      // alfabetizador está ao lado para orientar e o aluno tenta de novo.
      if (
        !learnerSession.isEducatorConducted &&
        nextAttempts >= screen.exercise.maxAttemptsBeforeLock
      ) {
        lockCurrentExercise(
          resolveLockMessage(screen.lockReason, screen.lockMessage),
        );
        return;
      }

      // Mantém o veredito visível por um instante, depois limpa os cards
      // errados (os corretos permanecem selecionados) para nova tentativa.
      if (markVerdictTimeoutRef.current) {
        clearTimeout(markVerdictTimeoutRef.current);
      }
      markVerdictTimeoutRef.current = setTimeout(() => {
        setMarkVerdicts({});
        setSelectedImageIds((previous) =>
          previous.filter((id) => correctSet.has(id)),
        );
      }, 1400);

      setExerciseFeedback({
        type: "error",
        message:
          screen.exercise.errorFeedback ||
          "Ainda não foi desta vez. Tente novamente.",
      });
      return;
    }

    goNextDefault();
  };

  const renderExerciseContent = () => {
    if (!screen.exercise) return null;

    if (screen.screenTemplate === "exercise-match-letter") {
      return (
        <View style={styles.exerciseCard}>
          {/* Botão de áudio de instrução — ícone grande centralizado */}
          <View style={styles.instructionAudioRow}>
            <SpeakerButton
              onPress={handleInstructionAudioPress}
              large
              active={playingAudioKey === `instruction-${screen.id}`}
            />
          </View>

          {screen.exercise.items.map((item, itemIndex) => {
            const isCompleted = completedMatchSet.has(item.id);
            const isWrongFlash = matchWrongIds.includes(item.id);
            const selectedLetter = matchSelectedOptions[item.id];
            const word = String(item.label || "").toUpperCase();
            const wordLetters = word.split("").filter(Boolean);
            const audioUrl = item.wordAudioUrl || item.audioUrl;
            // Áudios individuais sempre disponíveis (salvo tela travada).
            // O gate que exigia ouvir a instrução antes deixava os desenhos
            // mudos quando o áudio principal não era tocado/registrado.
            const isWordAudioEnabled = !isInteractionLocked;

            return (
              <View key={item.id} style={styles.matchItem}>
                {/* Imagem com badge de status + botão speaker */}
                <View style={styles.matchItemTopRow}>
                  <View style={styles.matchImageWrap}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.matchItemImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.matchItemImageFallback}>
                        <Text style={styles.matchItemImageFallbackText}>
                          {word.slice(0, 1)}
                        </Text>
                      </View>
                    )}
                    {isCompleted ? (
                      <View
                        style={[
                          styles.itemStatusBadge,
                          styles.itemStatusBadgeOk,
                        ]}
                      >
                        <Text style={styles.itemStatusBadgeText}>✓</Text>
                      </View>
                    ) : isWrongFlash ? (
                      <View
                        style={[
                          styles.itemStatusBadge,
                          styles.itemStatusBadgeErr,
                        ]}
                      >
                        <Text style={styles.itemStatusBadgeText}>✗</Text>
                      </View>
                    ) : null}
                  </View>
                  <SpeakerButton
                    onPress={() => {
                      void playAudioUrl(
                        audioUrl,
                        item.label,
                        `word-${item.id}`,
                      );
                    }}
                    disabled={!isWordAudioEnabled}
                    active={playingAudioKey === `word-${item.id}`}
                  />
                </View>

                {/* Quadrados posicionais — um por letra da palavra */}
                <View style={styles.squaresRow}>
                  {wordLetters.map((letter, squareIndex) => {
                    const isWrongSquare =
                      isWrongFlash &&
                      Boolean(selectedLetter) &&
                      wordLetters.indexOf(selectedLetter) === squareIndex;
                    // Figma: ao acertar, a palavra inteira é revelada mas só a
                    // célula da letra-alvo ganha o destaque verde.
                    const targetLetter = (
                      item.correctOptions[0] ?? ""
                    ).toUpperCase();
                    const isTargetSquare =
                      squareIndex === wordLetters.indexOf(targetLetter);

                    return (
                      <Pressable
                        key={`${item.id}-sq-${squareIndex}`}
                        onPress={() =>
                          handleMatchOptionPress(itemIndex, item.id, letter)
                        }
                        disabled={isInteractionLocked || isCompleted}
                        hitSlop={4}
                        style={[
                          styles.letterSquare,
                          isWrongSquare ? styles.letterSquareWrong : null,
                          isCompleted
                            ? isTargetSquare
                              ? styles.letterSquareFilled
                              : styles.letterSquareRevealed
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.letterSquareText,
                            isCompleted
                              ? isTargetSquare
                                ? styles.letterSquareTextFilled
                                : styles.letterSquareTextRevealed
                              : null,
                          ]}
                        >
                          {isCompleted ? letter : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (screen.screenTemplate === "exercise-mark-images") {
      return (
        <View style={styles.exerciseCard}>
          {/* Apenas o icone de audio grande centralizado (sem texto de
              instrucao escrito): o aluno ainda nao le, a orientacao vem
              pelo audio. */}
          {isInstructionAudioButtonVisible(screen.exercise) ? (
            <View style={styles.instructionAudioRow}>
              <SpeakerButton
                onPress={handleInstructionAudioPress}
                large
                active={playingAudioKey === `instruction-${screen.id}`}
              />
            </View>
          ) : null}

          <View style={styles.markGrid}>
            {screen.exercise.items.map((item) => {
              const isSelected = selectedImageIds.includes(item.id);
              const verdict = markVerdicts[item.id];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleMarkImageItem(item.id)}
                  disabled={isInteractionLocked}
                  hitSlop={8}
                  style={[
                    styles.markItem,
                    isSelected && !verdict ? styles.markItemSelected : null,
                    // Após o AVANÇAR o veredito substitui a seleção amarela:
                    // verde+✓ no correto, vermelho+✗ no errado (Figma).
                    verdict === "ok" ? styles.markItemOk : null,
                    verdict === "err" ? styles.markItemErr : null,
                  ]}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.markItemImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.markItemFallback}>
                      <Text style={styles.markItemFallbackText}>?</Text>
                    </View>
                  )}
                  {/* Sem nome do animal e sem marcador numerico: o
                      Robertinho pediu para nao "entregar" a resposta
                      via texto e remover o circulo de selecao
                      redundante. O feedback visual fica todo na borda
                      amarela da imagem. */}
                  {verdict ? (
                    <View
                      style={[
                        styles.markVerdictBadge,
                        verdict === "ok"
                          ? styles.markVerdictBadgeOk
                          : styles.markVerdictBadgeErr,
                      ]}
                    >
                      <Text style={styles.markVerdictBadgeText}>
                        {verdict === "ok" ? "✓" : "✗"}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return null;
  };

  const stageLabel = `tela ${safeIndex + 1} de ${totalScreens} · Etapa ${lesson.stageNumber ?? 2}`;

  // Telas de exercício seguem o Figma "Marcar Caixas"/"Quadrado da Letra":
  // fundo branco só com o logo, sem header de texto, sem menu inferior, sem
  // barra de progresso/título — o áudio carrega a instrução.
  const isExerciseScreen =
    screen.screenTemplate === "exercise-match-letter" ||
    screen.screenTemplate === "exercise-mark-images";

  // Etapas 2 e 3: o ALUNO navega sozinho (Figma "Modelo de Ensino ao
  // Alfabetizando"): só logo, alto-falante verde grande, card de conteúdo,
  // AVANÇAR verde preenchida e botão amarelo PRECISO DE AJUDA. Sem textos,
  // sem box de orientação (que é da visão do educador na Etapa 1).
  const isLearnerDriven = (lesson.stageNumber ?? 1) >= 2;
  const usesMinimalChrome = isExerciseScreen || isLearnerDriven;

  return (
    <LearnerScreenLayout
      activeMenu="inicio"
      onMenuHome={() => navigation.navigate("LearnerHome")}
      onMenuTutorial={() => navigation.navigate("LearnerTutorials")}
      onMenuScore={() => navigation.navigate("LearnerScore")}
      onMenuProfile={() => navigation.navigate("LearnerProfile")}
      // Figma (Tela de Aula): header traz apenas logo + sino; o nome do
      // alfabetizando e a posição na etapa ficam no corpo (RN040).
      // Sessão travada pelo educador OU tela do tipo "bloqueada" (template):
      // ambas são comunicadas ao alfabetizando apenas pelo banner visual
      // "AGUARDANDO AJUDA" no layout — sem texto, já que ele não lê.
      isSessionLocked={learnerSession.isLocked || isLockedByTemplate}
      onRequestHelp={() =>
        learnerSession.requestHelp(
          "Preciso de ajuda para continuar nesta tela.",
          buildScreenSnapshot(),
        )
      }
      helpAcknowledgedAt={learnerSession.helpAcknowledgedAt}
      isHelpPending={learnerSession.isHelpPending}
      canRequestHelp={exerciseLocked}
      sessionErrorMessage={learnerSession.errorMessage}
      hintVideoUrl={screen.hintVideoUrl ?? null}
      minimalChrome={usesMinimalChrome}
    >
      <View style={styles.wrapper}>
        <>
          {/* RN040: identificação em duas linhas no corpo (Figma: Tela de
                Aula) — nome do alfabetizando + posição na etapa. */}
          <View style={styles.lessonHeaderBlock}>
            <Text style={styles.lessonLearnerLine}>
              Alfabetizando {learnerSession.learnerName?.trim() || ""}
            </Text>
            <Text style={styles.lessonCountLine}>
              Tela {safeIndex + 1} de {totalScreens} da Etapa{" "}
              {lesson.stageNumber ?? 1} de Alfabetização
            </Text>
          </View>

          {/* RN041: box cinza de orientação ao alfabetizador — presente em
                todos os modelos de tela de aula do Figma. */}
          {!isLearnerDriven && screen.educatorGuidance ? (
            <View style={styles.tutorCard}>
              <Text style={styles.cardTitle}>
                Orientação para o(a) alfabetizador(a):
              </Text>
              <Text style={styles.cardText}>{screen.educatorGuidance}</Text>
            </View>
          ) : null}
        </>

        {isLearnerDriven && !screen.exercise && screen.mediaKind !== "video" ? (
          // Figma (Modelo de Ensino ao Alfabetizando): alto-falante verde
          // grande centralizado — único controle de áudio da tela. Toca a
          // narração/instrução (ou o áudio da tela, quando for o conteúdo).
          <View style={styles.instructionAudioRow}>
            <SpeakerButton
              large
              onPress={() =>
                void playAudioUrl(
                  screen.narrationAudioUrl ||
                    (screen.mediaKind === "audio" ? screen.mediaUrl : null),
                  screen.learnerSpeech,
                  `aluno-audio-${screen.id}`,
                )
              }
              active={playingAudioKey === `aluno-audio-${screen.id}`}
            />
          </View>
        ) : null}

        {shouldRenderDefaultMedia &&
        screen.mediaUrl &&
        screen.mediaKind === "image" &&
        !didFailImageLoad ? (
          // RN043 + Figma (Modelo imagem): card branco com a imagem inteira
          // (contain) e ícone de expandir no canto — toque abre em tela cheia.
          <Pressable
            style={styles.imageCard}
            onPress={() => setIsImageExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel="Ampliar imagem"
          >
            <Image
              source={{ uri: screen.mediaUrl }}
              style={styles.imageMediaContain}
              resizeMode="contain"
              onError={() => setDidFailImageLoad(true)}
            />
            <View style={styles.expandIconWrap}>
              <ExpandIcon />
            </View>
          </Pressable>
        ) : null}

        {isImageExpanded && screen.mediaUrl && screen.mediaKind === "image" ? (
          // RN043: imagem ocupa a tela toda; novo toque retorna.
          <Modal
            transparent={false}
            animationType="fade"
            onRequestClose={() => setIsImageExpanded(false)}
          >
            <Pressable
              style={styles.fullscreenImageWrap}
              onPress={() => setIsImageExpanded(false)}
            >
              <Image
                source={{ uri: screen.mediaUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </Pressable>
          </Modal>
        ) : null}

        {shouldRenderDefaultMedia &&
        screen.mediaKind === "image" &&
        didFailImageLoad ? (
          <View style={styles.mediaCard}>
            <Text style={styles.mediaLabel}>Imagem da aula</Text>
            <Text style={styles.mediaErrorText}>
              Não foi possível carregar esta mídia. Verifique o link em Aulas e
              Mídias.
            </Text>
          </View>
        ) : null}

        {shouldRenderDefaultMedia &&
        screen.mediaUrl &&
        screen.mediaKind === "video" ? (
          // Figma (Modelo vídeo): player direto, sem card com rótulo.
          <View style={[styles.videoFrame, { aspectRatio: mediaAspectRatio }]}>
            {renderVideoPlayer(screen.mediaUrl)}
          </View>
        ) : null}

        {shouldRenderDefaultMedia &&
        screen.mediaUrl &&
        screen.mediaKind === "audio" &&
        !isLearnerDriven ? (
          // RN045 + Figma (Modelo áudio, Etapa 1): apenas o grande
          // alto-falante centralizado — sem barra de player. Nas Etapas 2/3
          // o alto-falante único do topo já cobre o áudio da tela.
          <View style={styles.audioSpeakerRow}>
            <SpeakerButton
              large
              onPress={() =>
                void playAudioUrl(screen.mediaUrl, null, `media-${screen.id}`)
              }
              active={playingAudioKey === `media-${screen.id}`}
            />
          </View>
        ) : null}

        {shouldRenderDefaultMedia &&
        didFailMediaLoad &&
        (screen.mediaKind === "video" || screen.mediaKind === "audio") ? (
          <Text style={styles.mediaErrorText}>
            Não foi possível carregar esta mídia automaticamente.
          </Text>
        ) : null}

        {screen.learnerSpeech &&
        !screen.exercise &&
        !screen.mediaUrl &&
        !isLearnerDriven ? (
          // Modelo "só texto" do Figma: conteúdo em card branco com borda.
          // Restrito a telas de texto puro — telas de áudio/imagem/vídeo NÃO
          // exibem transcrição (o alfabetizando escuta, não lê).
          <View style={styles.textContentCard}>
            <Text style={styles.textContentBody}>{screen.learnerSpeech}</Text>
            <View style={styles.narrationRow}>
              <SpeakerButton
                onPress={() =>
                  void playAudioUrl(
                    screen.narrationAudioUrl,
                    screen.learnerSpeech,
                    `narration-${screen.id}`,
                  )
                }
                active={playingAudioKey === `narration-${screen.id}`}
              />
            </View>
          </View>
        ) : null}

        {renderExerciseContent()}

        {screen.highlightMessage ? (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightText}>{screen.highlightMessage}</Text>
          </View>
        ) : null}

        {/* Tela bloqueada: o alfabetizando não lê, então o estado travado é
            comunicado somente pelo banner visual "AGUARDANDO AJUDA" no
            LearnerScreenLayout — sem cartão de texto aqui. */}

        {showReinforcement ? (
          <View style={styles.reinforcementCard}>
            <Text style={styles.reinforcementTitle}>Reforço de orientação</Text>
            <Text style={styles.reinforcementText}>
              {reinforcementMessage ||
                "Revendo instruções. Aguarde para tentar novamente."}
            </Text>
            {screen.exercise?.errorReinforcement?.instructionAudioUrl ? (
              <Pressable
                onPress={() =>
                  void playAudioUrl(
                    screen.exercise?.errorReinforcement?.instructionAudioUrl,
                    reinforcementMessage ||
                      screen.exercise?.errorReinforcement?.instructionText,
                    "reinforcement",
                  )
                }
                style={styles.reinforcementAudioButton}
              >
                <Text style={styles.reinforcementAudioButtonText}>
                  Reproduzir audio
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {exerciseFeedback ? (
          <View
            style={[
              styles.feedbackCard,
              exerciseFeedback.type === "ok"
                ? styles.feedbackCardSuccess
                : styles.feedbackCardError,
            ]}
          >
            {/* Sem texto — o alfabetizando não lê. Só o veredito visual
                (✓ verde / ✗ vermelho). `message` segue como dado interno
                (registro de progresso / visão do educador). */}
            <FeedbackVerdictIcon type={exerciseFeedback.type} />
          </View>
        ) : null}

        {isLearnerDriven &&
        !screen.exercise &&
        screen.mediaKind === "image" &&
        screen.mediaUrl ? (
          // Fase 2 (RN113/RN114 + Figma Modelo de Ensino 1/2): FOTOGRAFAR
          // ATIVIDADE — o aluno fotografa o exercício feito no papel.
          // Centralizado, como pedido.
          <View style={styles.photoBtnRow}>
            <Pressable
              style={styles.photoBtn}
              accessibilityRole="button"
              accessibilityLabel="Fotografar atividade"
              onPress={() => {
                void (async () => {
                  const { captureActivityPhoto } = await import(
                    "./LearnerPhotoReviewView"
                  );
                  const captured = await captureActivityPhoto();
                  if (captured) {
                    navigation.navigate("LearnerPhotoReview", {
                      photoUri: captured.uri,
                      photoBase64: captured.base64,
                      mimeType: captured.mimeType,
                      activityId: screen.id,
                    });
                  }
                })();
              }}
            >
              <Svg width={46} height={36} viewBox="0 0 52 38" fill="none">
                <Path d="M13 8 L16 2 H28 L31 8" fill="#2fa536" />
                <Path
                  d="M2 12 a4 4 0 0 1 4 -4 H46 a4 4 0 0 1 4 4 V34 a4 4 0 0 1 -4 4 H6 a4 4 0 0 1 -4 -4 Z"
                  fill="#2fa536"
                />
                <Circle cx={26} cy={23} r={9} fill="#ffffff" />
                <Circle cx={26} cy={23} r={5} fill="#2fa536" />
              </Svg>
              <Text style={styles.photoBtnLabel}>
                FOTOGRAFAR{"\n"}ATIVIDADE
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isExerciseScreen ? (
          // Figma: seta única AVANÇAR preenchida, centralizada, sem VOLTAR;
          // verde-claro até o exercício ser concluído (RN106). Continua
          // tocável para o feedback explicar o que falta.
          <LearnerActionButtons
            variant="filled"
            hideBack
            nextLabel="AVANÇAR"
            onNext={onNext}
            nextVisualDisabled={
              !(canAdvanceMatchExercise || canAdvanceMarkImagesExercise)
            }
          />
        ) : isLearnerDriven ? (
          // Figma (Modelo de Ensino): seta única AVANÇAR verde preenchida —
          // o aluno "folheia" para frente; sem VOLTAR.
          <LearnerActionButtons
            variant="filled"
            hideBack
            nextLabel="AVANÇAR"
            onNext={onNext}
          />
        ) : (
          // Etapa 1 (educador conduz): setas verdes VOLTAR/AVANÇAR.
          <LearnerActionButtons onBack={goBack} onNext={onNext} />
        )}
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  error: {
    color: learnerTheme.danger,
    fontSize: 14,
  },
  // Figma (Tela de Aula): identificação em duas linhas + box de orientação.
  lessonHeaderBlock: {
    gap: 2,
    marginBottom: 4,
  },
  lessonLearnerLine: {
    fontSize: 15,
    lineHeight: 21,
    color: "#111111",
  },
  lessonCountLine: {
    fontSize: 15,
    lineHeight: 21,
    color: "#111111",
  },
  textContentCard: {
    borderWidth: 1.5,
    borderColor: "#111111",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  textContentBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111111",
  },
  narrationRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  imageCard: {
    borderWidth: 1.5,
    borderColor: "#111111",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 12,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  imageMediaContain: {
    width: "100%",
    height: 220,
  },
  expandIconWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 4,
  },
  fullscreenImageWrap: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  audioSpeakerRow: {
    alignItems: "center",
    marginVertical: 22,
  },
  photoBtnRow: {
    alignItems: "center",
    marginTop: 14,
  },
  photoBtn: {
    alignItems: "center",
    gap: 6,
  },
  photoBtnLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2fa536",
    textAlign: "center",
    lineHeight: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  path: {
    color: learnerTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  count: {
    color: learnerTheme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: learnerTheme.border,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    backgroundColor: learnerTheme.primary,
  },
  title: {
    marginTop: 2,
    fontSize: 18,
    color: learnerTheme.textStrong,
    fontWeight: "700",
  },
  imageMedia: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: learnerTheme.border,
  },
  mediaCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    backgroundColor: learnerTheme.surface,
    padding: 12,
    gap: 6,
  },
  videoFrame: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000000",
    minHeight: 180,
  },
  videoMedia: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  audioMedia: {
    width: "100%",
    height: 52,
    borderRadius: 8,
    backgroundColor: learnerTheme.surfaceMuted,
  },
  mediaLabel: {
    color: learnerTheme.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  mediaErrorText: {
    color: learnerTheme.textMuted,
    fontSize: 12,
  },
  tutorCard: {
    borderRadius: 14,
    backgroundColor: learnerTheme.tutorCardBg,
    borderWidth: 1,
    borderColor: learnerTheme.tutorCardBorder,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: learnerTheme.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  cardText: {
    color: learnerTheme.text,
    fontSize: 14,
    lineHeight: 22,
  },
  studentCard: {
    borderRadius: 14,
    backgroundColor: learnerTheme.learnerCardBg,
    borderWidth: 1,
    borderColor: learnerTheme.learnerCardBorder,
    padding: 12,
    gap: 4,
  },
  studentTitle: {
    color: learnerTheme.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  studentText: {
    color: learnerTheme.textStrong,
    fontSize: 14,
    lineHeight: 22,
  },
  narrationCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  narrationHint: {
    fontSize: 13,
    color: "#2fa536",
    fontWeight: "500",
  },
  highlightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: learnerTheme.selectedBorder,
    backgroundColor: learnerTheme.selectedBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  highlightText: {
    textAlign: "center",
    color: learnerTheme.selectedText,
    fontWeight: "700",
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 4,
    gap: 14,
  },
  exerciseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  exerciseTitle: {
    flex: 1,
    color: learnerTheme.text,
    fontSize: 13,
    fontWeight: "700",
  },
  audioButton: {
    width: 38,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  audioButtonText: {
    color: learnerTheme.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  // exercise-match-letter: botão de instrução grande centralizado
  instructionAudioRow: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 12,
  },
  largeAudioBtn: {
    width: 86,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  audioBtnActive: {
    opacity: 0.78,
    transform: [{ scale: 1.04 }],
  },
  audioBtnPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.96 }],
  },
  audioBtnDisabled: {
    opacity: 0.35,
  },
  soundIcon: {
    minWidth: 30,
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  soundIconLarge: {
    minWidth: 56,
    height: 48,
  },
  soundCore: {
    width: 9,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#92d78b",
    marginRight: 2,
  },
  soundCoreLarge: {
    width: 15,
    height: 26,
    marginRight: 4,
    backgroundColor: "#35a632",
  },
  soundBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  soundBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#b8e4b3",
  },
  soundBarOne: {
    height: 10,
  },
  soundBarTwo: {
    height: 16,
  },
  soundBarThree: {
    height: 22,
  },
  soundBarLargeOne: {
    width: 4,
    height: 18,
    backgroundColor: "#52bb4d",
  },
  soundBarLargeTwo: {
    width: 4,
    height: 28,
    backgroundColor: "#35a632",
  },
  soundBarLargeThree: {
    width: 4,
    height: 38,
    backgroundColor: "#258b22",
  },
  // exercise-match-letter: item (imagem + quadrados)
  matchItem: {
    paddingHorizontal: 44,
    paddingVertical: 4,
    gap: 5,
    backgroundColor: "transparent",
  },
  matchItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  matchImageWrap: {
    width: 54,
    height: 46,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  matchItemImage: {
    width: 54,
    height: 46,
  },
  matchItemImageFallback: {
    width: 48,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    backgroundColor: learnerTheme.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  matchItemImageFallbackText: {
    fontSize: 22,
    color: learnerTheme.primary,
    fontWeight: "700",
  },
  itemStatusBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: learnerTheme.surface,
  },
  itemStatusBadgeOk: {
    backgroundColor: learnerTheme.successBorder,
  },
  itemStatusBadgeErr: {
    backgroundColor: "#ef4444",
  },
  itemStatusBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
  },
  itemSpeakerBtn: {
    width: 48,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  // Quadrados posicionais
  squaresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginLeft: 52,
  },
  letterSquare: {
    width: 29,
    height: 29,
    borderWidth: 1.5,
    borderColor: learnerTheme.border,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: learnerTheme.surface,
  },
  letterSquareWrong: {
    borderColor: "#ef4444",
    backgroundColor: "#fee2e2",
  },
  letterSquareFilled: {
    borderColor: learnerTheme.successBorder,
    backgroundColor: learnerTheme.successBg,
  },
  letterSquareTarget: {
    borderColor: "#f59e0b",
    backgroundColor: "#fef3c7",
  },
  // Célula revelada (não-alvo) após o acerto: letra visível em cinza-escuro,
  // borda neutra — só a célula-alvo fica verde (Figma Quadrado da Letra 5).
  letterSquareRevealed: {
    borderColor: learnerTheme.border,
    backgroundColor: learnerTheme.surface,
  },
  letterSquareText: {
    fontSize: 15,
    fontWeight: "700",
    color: "transparent",
  },
  letterSquareTextFilled: {
    color: learnerTheme.successText,
  },
  letterSquareTextTarget: {
    color: "#92400e",
  },
  letterSquareTextRevealed: {
    color: "#374151",
  },
  selectionHint: {
    color: learnerTheme.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  markGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  markItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: learnerTheme.border,
    borderRadius: 10,
    backgroundColor: learnerTheme.surface,
    padding: 8,
    gap: 6,
    alignItems: "center",
  },
  markItemSelected: {
    // Amarelo = "selecionei esta imagem" no Figma. Quando o aluno
    // toca em uma imagem ela ganha borda amarela mais grossa e um
    // fundo amarelo bem suave; nenhum outro feedback escrito.
    borderColor: "#f59e0b",
    borderWidth: 3,
    backgroundColor: "#fef3c7",
  },
  // Veredito pós-AVANÇAR (Figma Marcar Caixas 3/6): verde no correto,
  // vermelho no errado, com badge circular sobreposto no canto.
  markItemOk: {
    borderColor: "#2fa536",
    borderWidth: 3,
    backgroundColor: "#ffffff",
  },
  markItemErr: {
    borderColor: "#e11d2c",
    borderWidth: 3,
    backgroundColor: "#ffffff",
  },
  markVerdictBadge: {
    position: "absolute",
    top: -14,
    right: -12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  markVerdictBadgeOk: {
    backgroundColor: "#2fa536",
  },
  markVerdictBadgeErr: {
    backgroundColor: "#e11d2c",
  },
  markVerdictBadgeText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
  },
  markItemImage: {
    width: 78,
    height: 78,
  },
  markItemFallback: {
    width: 78,
    height: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    backgroundColor: learnerTheme.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  markItemFallbackText: {
    fontSize: 24,
    color: learnerTheme.primary,
    fontWeight: "700",
  },
  markItemLabel: {
    color: learnerTheme.text,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  markIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    backgroundColor: learnerTheme.surfaceMuted,
  },
  markIndicatorSelected: {
    borderColor: learnerTheme.primary,
    backgroundColor: learnerTheme.primary,
  },
  reinforcementCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: learnerTheme.selectedBorder,
    backgroundColor: learnerTheme.selectedBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  reinforcementTitle: {
    color: learnerTheme.selectedText,
    fontSize: 13,
    fontWeight: "700",
  },
  reinforcementText: {
    color: learnerTheme.text,
    fontSize: 12,
    lineHeight: 18,
  },
  reinforcementAudioButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: learnerTheme.selectedBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: learnerTheme.surface,
  },
  reinforcementAudioButtonText: {
    color: learnerTheme.selectedText,
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackCardSuccess: {
    borderColor: "#9bc844",
    backgroundColor: "#f2f9df",
  },
  feedbackCardError: {
    borderColor: "#f5b0b0",
    backgroundColor: "#fff2f2",
  },
});
