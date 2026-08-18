import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LearnerRootStackParamList } from '../../types';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { learnerTheme } from './learnerTheme';
import { useLearnerFlowData } from './learnerFlowData';
import { useLearnerSession } from './learnerSessionContext';
import type { LessonCompletionResult } from './learnerAccessPolicy.js';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerLessonConclusion'>;
// Tempo que o "Aula concluída!" fica na tela antes de voltar à lista. 700ms
// (valor anterior) contava a partir do fim da gravação e passava batido — o
// alfabetizador relatou não ver confirmação nenhuma ao terminar o exercício.
const TRANSITION_DELAY_MS = 1500;

export function LearnerLessonConclusionView({ navigation, route }: Props) {
  const {
    moduleId,
    lessonId,
    stageCompleted: stageCompletedFromScreen,
    stagePoints: stagePointsFromScreen,
  } = route.params;
  const { getLesson } = useLearnerFlowData();
  const learnerSession = useLearnerSession();
  const lesson = getLesson(moduleId, lessonId);
  const completedRecordedRef = useRef<string | null>(null);
  const completionResultRef = useRef<LessonCompletionResult | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sem isto a tela só mostrava um spinner de carregamento e voltava direto
  // para a lista — sem nenhuma confirmação visual de que a aula concluiu
  // (a celebração com pontos só existe quando a ETAPA inteira fecha, RN048).
  const [isSaved, setIsSaved] = useState(false);

  const resolveNextStep = useCallback((stageCompleted: boolean) => {
    if (!lesson) { navigation.navigate('LearnerHome'); return; }
    if (lesson.stageNumber && stageCompleted) {
      navigation.replace('LearnerStageConclusion', {
        stageNumber: lesson.stageNumber,
        stageTitle: `Etapa ${lesson.stageNumber}`,
        // Mesma lógica do sinal de conclusão: os pontos vêm com a gravação da
        // última tela; a regravação daqui volta deduplicada e sem pontos.
        pointsEarned:
          stagePointsFromScreen ?? completionResultRef.current?.totalPoints,
      });
      return;
    }
    navigation.navigate('LearnerHome');
  }, [lesson, navigation, stagePointsFromScreen]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void learnerSession.syncCurrentState({
      currentView: 'LearnerLessonConclusion',
      currentActivityId: lessonId,
      statePayload: {
        moduleId,
        lessonId,
        snapshot: {
          moduleId,
          lessonId,
          lessonTitle: lesson?.title ?? null,
          screenTitle: lesson?.conclusionTitle ?? 'Aula concluída',
          totalScreens: lesson?.screens.length,
          stage: lesson?.stageNumber ? String(lesson.stageNumber) : undefined,
          screenTemplate: 'lesson-conclusion',
        },
      },
    });

    const scheduleNavigation = (result: LessonCompletionResult | null) => {
      if (cancelled) return;
      completionResultRef.current = result;
      setIsSaved(true);
      // `stageCompletedFromScreen` vem da última tela da aula, que é quem
      // recebe o sinal fresco do backend; o `result` daqui é a segunda
      // gravação da mesma etapa e sempre volta deduplicado (stageCompleted
      // false). Qualquer um dos dois sendo verdadeiro fecha a etapa.
      const didCompleteStage =
        stageCompletedFromScreen === true || result?.stageCompleted === true;
      navigationTimeoutRef.current = setTimeout(
        () => resolveNextStep(didCompleteStage),
        TRANSITION_DELAY_MS,
      );
    };

    if (completedRecordedRef.current !== lessonId) {
      completedRecordedRef.current = lessonId;
      void learnerSession.recordProgress({
        activityId: lesson?.progressId ?? lessonId,
        status: 'COMPLETED',
      }).then(scheduleNavigation);
    } else {
      scheduleNavigation(completionResultRef.current);
    }

    return () => {
      cancelled = true;
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    };
  }, [learnerSession, lesson, lessonId, moduleId, resolveNextStep, stageCompletedFromScreen]));

  if (!lesson) {
    return <LearnerScreenLayout activeMenu="inicio" onMenuHome={() => navigation.navigate('LearnerHome')}><Text style={styles.error}>Conclusão indisponível.</Text></LearnerScreenLayout>;
  }

  return (
    <LearnerScreenLayout minimalChrome>
      <View style={styles.wrapper}>
        {isSaved ? (
          <>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.messageSuccess}>Aula concluída!</Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={learnerTheme.primary} size="large" />
            <Text style={styles.message}>Registrando a conclusão da aula...</Text>
          </>
        )}
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 120, alignItems: 'center', gap: 14 },
  message: { color: learnerTheme.text, fontSize: 14 },
  messageSuccess: { color: learnerTheme.successText, fontSize: 16, fontWeight: '700' },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: learnerTheme.successBg,
    borderWidth: 2,
    borderColor: learnerTheme.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: learnerTheme.successText, fontSize: 28, fontWeight: '800' },
  error: { color: learnerTheme.danger, fontSize: 14 },
});
