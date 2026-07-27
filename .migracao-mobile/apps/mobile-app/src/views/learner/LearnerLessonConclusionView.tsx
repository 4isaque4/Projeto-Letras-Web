import { useCallback, useRef } from 'react';
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
const TRANSITION_DELAY_MS = 700;

export function LearnerLessonConclusionView({ navigation, route }: Props) {
  const { moduleId, lessonId } = route.params;
  const { getLesson } = useLearnerFlowData();
  const learnerSession = useLearnerSession();
  const lesson = getLesson(moduleId, lessonId);
  const completedRecordedRef = useRef<string | null>(null);
  const completionResultRef = useRef<LessonCompletionResult | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveNextStep = useCallback((stageCompleted: boolean) => {
    if (!lesson) { navigation.navigate('LearnerHome'); return; }
    if (lesson.stageNumber && stageCompleted) {
      navigation.replace('LearnerStageConclusion', {
        stageNumber: lesson.stageNumber,
        stageTitle: `Etapa ${lesson.stageNumber}`,
        pointsEarned: completionResultRef.current?.totalPoints,
      });
      return;
    }
    navigation.navigate('LearnerHome');
  }, [lesson, navigation]);

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
      navigationTimeoutRef.current = setTimeout(
        () => resolveNextStep(result?.stageCompleted === true),
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
  }, [learnerSession, lesson, lessonId, moduleId, resolveNextStep]));

  if (!lesson) {
    return <LearnerScreenLayout activeMenu="inicio" onMenuHome={() => navigation.navigate('LearnerHome')}><Text style={styles.error}>Conclusão indisponível.</Text></LearnerScreenLayout>;
  }

  return <LearnerScreenLayout minimalChrome><View style={styles.wrapper}><ActivityIndicator color={learnerTheme.primary} size="large" /><Text style={styles.message}>Registrando a conclusão da aula...</Text></View></LearnerScreenLayout>;
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 120, alignItems: 'center', gap: 14 },
  message: { color: learnerTheme.text, fontSize: 14 },
  error: { color: learnerTheme.danger, fontSize: 14 },
});
