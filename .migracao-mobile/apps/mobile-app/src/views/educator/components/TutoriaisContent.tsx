import { useAssets } from 'expo-asset';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { SvgUri, SvgXml } from 'react-native-svg';
import { httpClient } from '../../../infra/api/http-client';
import {
  formatDate,
  formatDuration,
  getCompletedTutorialCount,
  isTutorialUnlocked,
  sortTutorials,
  Tutorial,
} from './tutorialPresentation';
import { EducatorBottomMenu } from './EducatorBottomMenu';

const ICON_YT_PLAY = `<svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#FF0000"/><path d="M45.02 23.97L27.04 13.46v21.08z" fill="#FFFFFF"/></svg>`;

interface VideoOverlayProps {
  tutorial: Tutorial;
  educatorId: string;
  logoUri?: string;
  onClose: () => void;
  onCompleted: (tutorialId: string) => void;
}

function VideoOverlay({ tutorial, educatorId, logoUri, onClose, onCompleted }: VideoOverlayProps) {
  const slideX = useRef(new Animated.Value(400)).current;
  const [markedCompleted, setMarkedCompleted] = useState(tutorial.completion?.is_completed === true);

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [slideX]);

  const handleClose = () => {
    Animated.timing(slideX, {
      toValue: -420,
      duration: 260,
      useNativeDriver: true,
    }).start(onClose);
  };

  const markCompleted = useCallback(async () => {
    if (markedCompleted) return;
    setMarkedCompleted(true);
    try {
      await httpClient.post(`/painel/tutoriais/${tutorial.id}/progresso`, {
        educatorId,
        markCompleted: true,
        positionSec: tutorial.duration_sec ?? 0,
      });
      onCompleted(tutorial.id);
    } catch {
      // Reconciliado no proximo fetch.
    }
  }, [educatorId, markedCompleted, onCompleted, tutorial.duration_sec, tutorial.id]);

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateX: slideX }] }]}>
      <View style={styles.overlayHeader}>
        <View style={styles.overlayHeaderText}>
          <Text style={styles.overlayEyebrow}>ASSISTINDO AGORA</Text>
          <Text style={styles.overlayTitle} numberOfLines={2}>{tutorial.title}</Text>
        </View>
        {logoUri ? (
          <View style={styles.overlayLogoWrap}>
            <SvgUri uri={logoUri} width={52} height={30} />
          </View>
        ) : null}
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={styles.overlayClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar video"
        >
          <Text style={styles.overlayCloseText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.overlayBody}>
        <View style={styles.overlayVideoCard}>
          <View style={styles.overlayVideo}>
            {tutorial.public_url ? (
              Platform.OS === 'web'
                ? createElement('video', {
                    src: tutorial.public_url,
                    controls: true,
                    autoPlay: true,
                    playsInline: true,
                    preload: 'auto',
                    onEnded: () => { void markCompleted(); },
                    style: {
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      backgroundColor: '#0f1720',
                      objectFit: 'contain',
                    },
                  })
                : (
                  <Video
                    source={{ uri: tutorial.public_url }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping={false}
                    onPlaybackStatusUpdate={(status) => {
                      if (status.isLoaded && status.didJustFinish) {
                        void markCompleted();
                      }
                    }}
                  />
                )
            ) : (
              <View style={styles.noVideoWrap}>
                <Text style={styles.noVideoText}>
                  Vídeo ainda não configurado.{'\n'}Defina a URL no painel antes de publicar.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.overlayFooter}>
        {markedCompleted ? (
          <View style={styles.overlayCompletedBadge}>
            <Text style={styles.overlayCompletedText}>Tutorial concluído</Text>
          </View>
        ) : (
          <Pressable style={styles.overlayCompleteBtn} onPress={() => void markCompleted()}>
            <Text style={styles.overlayCompleteBtnText}>MARCAR COMO ASSISTIDO</Text>
          </Pressable>
        )}
        {/* Saída explícita do vídeo: o overlay cobre o menu inferior, então sem um
            botão rotulado o alfabetizador só tinha o ✕ (pouco intuitivo). */}
        <Pressable
          style={styles.overlayBackBtn}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Voltar aos tutoriais"
        >
          <Text style={styles.overlayBackBtnText}>VOLTAR AOS TUTORIAIS</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const LOGO_PNG = require('../../../../assets/logo-letras-2.png');

function TutorialThumbnail({
  tutorial,
  label,
}: {
  tutorial: Tutorial;
  label: string;
}) {
  const thumbUrl = tutorial.metadata?.thumbnail_url as string | undefined;
  return (
    <View style={styles.thumbnailShell}>
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailFallback} />
      )}

      <View style={styles.thumbnailShade} />

      <View style={styles.thumbnailPlayWrap}>
        <SvgXml xml={ICON_YT_PLAY} width={42} height={30} />
      </View>

      {!thumbUrl ? (
        <View style={styles.thumbnailLogoWrap}>
          <Image source={LOGO_PNG} style={styles.thumbnailLogo} resizeMode="contain" />
        </View>
      ) : null}

      <View style={styles.thumbnailLabelWrap}>
        <Text style={styles.thumbnailLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TutorialCard({
  tutorial,
  index,
  tutorials,
  onPress,
}: {
  tutorial: Tutorial;
  index: number;
  tutorials: Tutorial[];
  onPress: () => void;
}) {
  const unlocked = isTutorialUnlocked(tutorials, index);
  const completed = tutorial.completion?.is_completed === true;
  const paddedNumber = String(index + 1).padStart(2, '0');
  const chipLabel = `VÍDEO ${index + 1}`;
  const durationLabel = tutorial.duration_sec ? formatDuration(tutorial.duration_sec) : null;
  const title = `Vídeo ${paddedNumber} - ${tutorial.title}${durationLabel ? ` - ${durationLabel}` : ''}`;

  return (
    <Pressable
      style={[styles.card, !unlocked ? styles.cardLocked : null]}
      onPress={onPress}
      disabled={!unlocked}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardRow}>
        <TutorialThumbnail tutorial={tutorial} label={chipLabel} />
        <View style={styles.cardMeta}>
          {completed && tutorial.completion?.completed_at ? (
            <>
              <Text style={styles.cardMetaLabel}>Assistido em</Text>
              <Text style={styles.cardMetaValue}>{formatDate(tutorial.completion.completed_at)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.cardMetaLabel}>Não assistido.</Text>
              <Text style={styles.cardMetaValue}>Assista para poder alfabetizar.</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

interface TutoriaisContentProps {
  educatorId: string | undefined;
  navigation?: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export function TutoriaisContent({ educatorId, navigation }: TutoriaisContentProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingTutorial, setPlayingTutorial] = useState<Tutorial | null>(null);
  const [brandAssets] = useAssets([require('../../../../assets/Logo-LETRAS-2.svg')]);
  const brandLogoUri = brandAssets?.[0]?.localUri ?? brandAssets?.[0]?.uri;

  const fetchTutorials = useCallback(async () => {
    // A API Express de produção exige educatorId em /painel/tutoriais.
    if (!educatorId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const raw = await httpClient.get<Tutorial[]>(`/painel/tutoriais?educatorId=${educatorId}`);
      // A tela de Tutoriais do educador mostra só a capacitação obrigatória
      // (kind=tutorial). intro-etapa/intro-modulo aparecem nas aberturas de
      // etapa/módulo; dica aparece no card de apoio das atividades.
      const capacitacao = (raw ?? []).filter((t) => t.kind === 'tutorial');
      setTutorials(sortTutorials(capacitacao));
    } catch {
      setError('Não foi possível carregar os tutoriais. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [educatorId]);

  useEffect(() => {
    void fetchTutorials();
  }, [fetchTutorials]);

  function handleCompleted(tutorialId: string) {
    setTutorials((prev) =>
      prev.map((t) =>
        t.id === tutorialId
          ? {
              ...t,
              completion: {
                completed_at: new Date().toISOString(),
                position_sec: t.duration_sec ?? 0,
                watch_count: (t.completion?.watch_count ?? 0) + 1,
                is_completed: true,
              },
            }
          : t,
      ),
    );
  }

  const completedCount = getCompletedTutorialCount(tutorials);
  const total = tutorials.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header com logo */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          {brandLogoUri
            ? <SvgUri uri={brandLogoUri} width={84} height={50} />
            : <View style={styles.logoPlaceholder} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {total > 0 ? (
          <Text style={styles.progressLabel}>
            {completedCount} de {total} vídeos assistidos
          </Text>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color="#111111" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void fetchTutorials()}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : !educatorId ? (
          <Text style={styles.emptyText}>Carregando perfil...</Text>
        ) : tutorials.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum tutorial disponível no momento.</Text>
        ) : (
          <View style={styles.listWrap}>
            {tutorials.map((tutorial, index) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                index={index}
                tutorials={tutorials}
                onPress={() => setPlayingTutorial(tutorial)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {playingTutorial && educatorId ? (
        <VideoOverlay
          tutorial={playingTutorial}
          educatorId={educatorId}
          logoUri={brandLogoUri}
          onClose={() => {
            setPlayingTutorial(null);
            void fetchTutorials();
          }}
          onCompleted={handleCompleted}
        />
      ) : null}

      <EducatorBottomMenu
        active="tutorial"
        onInicioPress={() => navigation?.goBack()}
        // Sem handler o EducatorBottomMenu renderiza a aba com disabled=true — era
        // por isso que "o clique no botão tutorial não funcionava". Na própria tela
        // de Tutoriais, a aba leva de volta à lista (fecha o vídeo em reprodução).
        onTutorialPress={() => {
          setPlayingTutorial(null);
          void fetchTutorials();
        }}
        onAcompanharPress={() => navigation?.goBack()}
        onPontuacaoPress={() =>
          educatorId
            ? navigation?.navigate('EducatorScore', { educatorId, fullName: '' } as Record<string, unknown>)
            : navigation?.goBack()
        }
        onPerfilPress={() => navigation?.navigate('EducatorProfile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 84,
    height: 50,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 4,
  },
  progressLabel: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 18,
  },
  listWrap: {
    gap: 20,
  },
  card: {
    gap: 10,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardTitle: {
    color: '#111111',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  thumbnailShell: {
    width: 140,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#d9d9d9',
    position: 'relative',
    flexShrink: 0,
  },
  thumbnailImage: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#d9d9d9',
  },
  thumbnailShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  thumbnailPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLogoWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  thumbnailLogo: {
    width: 44,
    height: 26,
  },
  thumbnailLabelWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
    backgroundColor: 'rgba(17,17,17,0.75)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  thumbnailLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardMeta: {
    flex: 1,
    paddingTop: 4,
  },
  cardMetaLabel: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 19,
  },
  cardMetaValue: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 19,
  },
  loader: {
    marginTop: 40,
  },
  errorWrap: {
    marginTop: 40,
    alignItems: 'center',
    gap: 14,
  },
  errorText: {
    color: '#7d1f1f',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111111',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 40,
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 100,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e4',
    gap: 12,
  },
  overlayHeaderText: {
    flex: 1,
    gap: 4,
  },
  overlayEyebrow: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  overlayTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  overlayLogoWrap: {
    marginTop: 2,
  },
  overlayClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCloseText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  overlayBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  overlayVideoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  overlayVideo: {
    flex: 1,
    backgroundColor: '#0f1720',
    borderRadius: 18,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    backgroundColor: '#0f1720',
  },
  noVideoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noVideoText: {
    color: '#d3d6db',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlayFooter: {
    paddingHorizontal: 10,
    paddingBottom: 14,
    gap: 10,
  },
  overlayBackBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111111',
  },
  overlayBackBtnText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overlayCompleteBtn: {
    backgroundColor: '#111111',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  overlayCompleteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overlayCompletedBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111111',
  },
  overlayCompletedText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
});
