import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LearnerRootStackParamList } from '../../types';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { learnerTheme } from './learnerTheme';
import { useLearnerFlowData } from './learnerFlowData';
import { useLearnerSession } from './learnerSessionContext';
import { canOpenLesson, getLessonActionLabel } from './learnerAccessPolicy.js';

const LOCK_ICON = `
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="10" width="14" height="9" rx="2" stroke="#b0b8b4" stroke-width="1.8"/>
  <path d="M7.5 10V7a3.5 3.5 0 0 1 7 0v3" stroke="#b0b8b4" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerHome'>;

export function LearnerHomeView({ navigation }: Props) {
  const { modules, loading, error, refresh, unlockedStages, firstStage } =
    useLearnerFlowData();
  const learnerSession = useLearnerSession();

  useFocusEffect(
    useCallback(() => {
      void learnerSession.syncCurrentState({
        currentView: 'LearnerHome',
        statePayload: {
          modulesCount: modules.length,
          // Snapshot parcial (Fase 1): o aprendiz está na tela inicial.
          snapshot: {
            screenTemplate: 'home',
            screenTitle: 'Tela inicial',
          },
        },
      });
      // Recarrega progresso sempre que a home ganha foco (ex: ao voltar da conclusão).
      void refresh();
    }, [learnerSession, modules.length, refresh]),
  );

  // Gate do alfabetizando: a Etapa 1 (a menor etapa-ENTIDADE do tema — mesma
  // semântica do painel, inclusive quando ela está vazia) é conduzida
  // presencialmente pelo alfabetizador no runner do modo educador — o learner
  // NUNCA a vê. Só aparecem etapas acima dela e desbloqueadas; a próxima abre
  // quando o alfabetizador conclui a primeira (firstStage/unlockedStages vêm do
  // stage-status do painel, com fallback local).
  const gatedModules = modules
    .map((moduleItem) => ({
      ...moduleItem,
      lessons: moduleItem.lessons.filter(
        (l) => l.stageNumber > firstStage && unlockedStages.has(l.stageNumber),
      ),
    }))
    .filter((moduleItem) => moduleItem.lessons.length > 0);

  const hasPublishedContent = modules.some((m) => m.lessons.length > 0);
  // Distingue "esperando a Etapa 1" de "nada publicado": há conteúdo, mas nenhuma
  // etapa >= 2 liberada ainda.
  const isWaitingForEtapa1 = !loading && hasPublishedContent && gatedModules.length === 0;

  return (
    <LearnerScreenLayout
      activeMenu="inicio"
      onMenuHome={() => navigation.navigate('LearnerHome')}
      onMenuTutorial={() => navigation.navigate('LearnerTutorials')}
      onMenuScore={() => navigation.navigate('LearnerScore')}
      onMenuProfile={() => navigation.navigate('LearnerProfile')}
      roleLabel="alfabetizando"
      learnerName={learnerSession.learnerName}
      isSessionLocked={learnerSession.isLocked}
      onRequestHelp={() => learnerSession.requestHelp('Preciso de apoio para seguir na aula inicial.')}
      helpAcknowledgedAt={learnerSession.helpAcknowledgedAt}
      isHelpPending={learnerSession.isHelpPending}
      sessionErrorMessage={learnerSession.errorMessage}
    >
      <View style={styles.wrapper}>
        {loading ? <Text style={styles.helper}>Carregando aulas...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isWaitingForEtapa1 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Aguardando liberação</Text>
            <Text style={styles.emptyStateText}>
              Suas aulas serão liberadas quando o alfabetizador concluir a Etapa 1 com você.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void refresh()}>
              <Text style={styles.retryText}>Atualizar</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !hasPublishedContent ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Nenhum conteúdo publicado</Text>
            <Text style={styles.emptyStateText}>
              Crie no painel um tema, depois um módulo e as telas da aula com os áudios, imagens e interações.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void refresh()}>
              <Text style={styles.retryText}>Recarregar conteúdo</Text>
            </Pressable>
          </View>
        ) : null}

        {gatedModules.map((moduleItem, moduleIndex) => {
          const firstLesson = moduleItem.lessons[0] ?? null;
          const moduleLabel = firstLesson?.moduleLabel ?? `MÓDULO ${moduleIndex + 1}`;
          return (
            <View key={moduleItem.id} style={styles.moduleBlock}>
              <Text style={styles.moduleLabel}>{moduleLabel}</Text>
              <Text style={styles.moduleTitle}>{moduleItem.title}</Text>
              <Text style={styles.moduleSubtitle}>{moduleItem.subtitle}</Text>

              {moduleItem.lessons.map((lesson) => {
                const unlocked = canOpenLesson(lesson);

                if (!unlocked) {
                  return (
                    <View key={lesson.id} style={styles.lessonCardLocked}>
                      <View style={styles.lessonBody}>
                        <Text style={styles.lessonTitleLocked}>{lesson.title}</Text>
                        <Text style={styles.lessonLockedHint}>
                          Esta aula ainda não foi liberada pelo alfabetizador
                        </Text>
                      </View>
                      <View style={styles.lockIcon}>
                        <SvgXml xml={LOCK_ICON} width={22} height={22} />
                      </View>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={lesson.id}
                    style={styles.lessonCard}
                    hitSlop={8}
                    onPress={() =>
                      navigation.navigate('LearnerLessonIntro', {
                        moduleId: moduleItem.id,
                        lessonId: lesson.id,
                        moduleLabel,
                        moduleTitle: moduleItem.title,
                      })
                    }
                  >
                    <View style={styles.lessonBody}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonSubtitle}>{lesson.objective}</Text>
                      <Text style={styles.lessonCount}>{lesson.screens.length} telas</Text>
                      {lesson.progressStatus === 'completed' ? (
                        <Text style={styles.lessonCompleted}>Aula concluída · disponível para repetir</Text>
                      ) : null}
                    </View>
                    <View style={styles.lessonAction}>
                      <Text style={styles.lessonActionText}>{getLessonActionLabel(lesson)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <View style={styles.motivationBox}>
          <Text style={styles.motivationText}>Cada aula é um passo a mais na sua jornada.</Text>
        </View>
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 18,
  },
  helper: {
    color: learnerTheme.textStrong,
    fontSize: 14,
  },
  error: {
    color: learnerTheme.danger,
    fontSize: 13,
  },
  emptyState: {
    borderRadius: 14,
    backgroundColor: learnerTheme.surface,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },
  emptyStateTitle: {
    color: learnerTheme.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    color: learnerTheme.text,
    fontSize: 14,
    lineHeight: 20,
  },
  moduleBlock: {
    gap: 8,
  },
  moduleLabel: {
    color: learnerTheme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  moduleTitle: {
    color: learnerTheme.textStrong,
    fontSize: 36 / 1.6,
    fontWeight: '700',
  },
  moduleSubtitle: {
    color: learnerTheme.text,
    fontSize: 16,
    marginBottom: 2,
  },
  lessonCard: {
    borderRadius: 14,
    backgroundColor: learnerTheme.surface,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lessonCardLocked: {
    borderRadius: 14,
    backgroundColor: learnerTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.7,
  },
  lessonBody: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    color: learnerTheme.textStrong,
    fontSize: 19 / 1.2,
    fontWeight: '700',
  },
  lessonTitleLocked: {
    color: learnerTheme.textMuted,
    fontSize: 19 / 1.2,
    fontWeight: '700',
  },
  lessonSubtitle: {
    color: learnerTheme.text,
    fontSize: 13,
  },
  lessonLockedHint: {
    color: learnerTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  lessonCount: {
    color: learnerTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  lessonCompleted: {
    color: learnerTheme.successText,
    fontSize: 12,
    fontWeight: '700',
  },
  lessonAction: {
    marginLeft: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: learnerTheme.selectedBorder,
    backgroundColor: learnerTheme.selectedBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lessonActionText: {
    color: learnerTheme.selectedText,
    fontSize: 12,
    fontWeight: '700',
  },
  lockIcon: {
    marginLeft: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationBox: {
    borderRadius: 12,
    backgroundColor: learnerTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: learnerTheme.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  motivationText: {
    textAlign: 'center',
    color: learnerTheme.textMuted,
    fontSize: 15,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: learnerTheme.primary,
  },
  retryText: {
    color: learnerTheme.primary,
    fontWeight: '700',
  },
});
