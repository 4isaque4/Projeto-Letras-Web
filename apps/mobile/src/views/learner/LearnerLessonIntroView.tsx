import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { LearnerRootStackParamList } from '../../types';
import { LearnerActionButtons } from './components/LearnerActionButtons';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { learnerTheme } from './learnerTheme';
import { useLearnerFlowData } from './learnerFlowData';
import { useLearnerSession } from './learnerSessionContext';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerLessonIntro'>;

export function LearnerLessonIntroView({ navigation, route }: Props) {
  const { moduleId, lessonId, moduleLabel, moduleTitle } = route.params;
  const { getLesson } = useLearnerFlowData();
  const learnerSession = useLearnerSession();
  const lesson = getLesson(moduleId, lessonId);
  const stageLabel = lesson?.stageNumber ? `Etapa ${lesson.stageNumber}` : null;

  useFocusEffect(
    useCallback(() => {
      void learnerSession.syncCurrentState({
        currentView: 'LearnerLessonIntro',
        currentActivityId: lessonId,
        statePayload: {
          moduleId,
          lessonId,
          // Snapshot parcial (Fase 1): identifica aula/etapa para o espelho do
          // educador mesmo antes de o aprendiz entrar nas telas da aula.
          snapshot: {
            moduleId,
            lessonId,
            moduleLabel,
            moduleTitle,
            lessonTitle: lesson?.title ?? null,
            screenTitle: lesson?.title ?? null,
            totalScreens: lesson?.screens.length,
            stage: lesson?.stageNumber ? String(lesson.stageNumber) : undefined,
            screenTemplate: 'lesson-intro',
          },
        },
      });
    }, [learnerSession, lesson, lessonId, moduleId, moduleLabel, moduleTitle]),
  );

  const startLesson = () => {
    if (learnerSession.isLocked) {
      return;
    }

    navigation.push('LearnerLessonScreen', {
      moduleId,
      lessonId,
      screenIndex: 0,
      moduleLabel,
      moduleTitle,
    });
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('LearnerHome');
  };

  if (!lesson) {
    return (
      <LearnerScreenLayout activeMenu="inicio" onMenuHome={() => navigation.navigate('LearnerHome')}>
        <Text style={styles.error}>Aula não encontrada.</Text>
      </LearnerScreenLayout>
    );
  }

  return (
    <LearnerScreenLayout
      activeMenu="inicio"
      onMenuHome={() => navigation.navigate('LearnerHome')}
      onMenuTutorial={() => navigation.navigate('LearnerTutorials')}
      onMenuScore={() => navigation.navigate('LearnerScore')}
      onMenuProfile={() => navigation.navigate('LearnerProfile')}
      roleLabel="alfabetizando"
      learnerName={learnerSession.learnerName}
      stageLabel={stageLabel}
      isSessionLocked={learnerSession.isLocked}
      onRequestHelp={() => learnerSession.requestHelp('Preciso de ajuda antes de iniciar esta aula.')}
      helpAcknowledgedAt={learnerSession.helpAcknowledgedAt}
      isHelpPending={learnerSession.isHelpPending}
      sessionErrorMessage={learnerSession.errorMessage}
    >
      <View style={styles.wrapper}>
        {/* RN038: primeiro dado é a identificação do alfabetizando. */}
        <Text style={styles.nameLine}>
          Nome do Alfabetizando: {learnerSession.learnerName?.trim() || '—'}
        </Text>

        {/* RN039: "Conteúdos a serem abordados" (dados do conteudista). A lista de
            tópicos do Figma exige um campo próprio no painel de conteúdo (pendente);
            por ora usamos o objetivo da aula como descrição do conteúdo. */}
        <View style={styles.contentsBlock}>
          <Text style={styles.contentsTitle}>Conteúdos a serem abordados:</Text>
          <Text style={styles.contentItem}>{lesson.objective}</Text>
        </View>

        <LearnerActionButtons
          variant="dark"
          backLabel="VOLTAR"
          nextLabel="AVANÇAR"
          onBack={goBack}
          onNext={startLesson}
        />
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 18,
    marginTop: 4,
  },
  error: {
    color: learnerTheme.danger,
    fontSize: 14,
  },
  nameLine: {
    fontSize: 16,
    lineHeight: 22,
    color: learnerTheme.textStrong,
  },
  contentsBlock: {
    gap: 8,
  },
  contentsTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: learnerTheme.textStrong,
    fontWeight: '600',
  },
  contentItem: {
    fontSize: 15,
    lineHeight: 22,
    color: learnerTheme.text,
    paddingLeft: 8,
  },
});
