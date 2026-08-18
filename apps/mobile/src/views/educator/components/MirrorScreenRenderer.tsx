import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { LearnerScreenInteraction, LearnerScreenSnapshot } from '@letras/shared-types';
import { LearnerExerciseConfig, getLearnerVisibleExerciseLabel } from '../../learner/learnerFlowMapper';

interface MirrorScreenRendererProps {
  snapshot: LearnerScreenSnapshot | null;
}

// Seta verde AVANÇAR preenchida — mesma do app do aluno (LearnerActionButtons),
// aqui apenas decorativa/somente-leitura para replicar o que ele vê.
const NEXT_ARROW_FILLED = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" fill="#2fa536"/>
</svg>`;

// Alto-falante verde — réplica do SoundWaveIcon do app do aluno.
function GreenSpeaker({ large = false }: { large?: boolean }) {
  const color = '#2fa536';
  const strokeWidth = large ? 4.5 : 4;
  return (
    <Svg width={large ? 66 : 38} height={large ? 54 : 32} viewBox="0 0 66 54" fill="none">
      <Path d="M8 22H19L33 10V44L19 32H8V22Z" fill={color} />
      <Path d="M42 20C45 23.5 45 30.5 42 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M49 15C55 21 55 33 49 39" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {large ? (
        <Path d="M56 10C65 19 65 35 56 44" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}

function asExercise(value: unknown): LearnerExerciseConfig | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as LearnerExerciseConfig;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return null;
  return candidate;
}

function isContentScreen(template: string): boolean {
  return ![ 'home', 'lesson-conclusion', 'locked' ].includes(template);
}

/**
 * Réplica SOMENTE LEITURA da tela do aprendiz, a partir do snapshot recebido
 * via Socket.IO. Reaproveita os padrões visuais do app do aluno (ícones verdes,
 * grade do exercício) sem nenhuma lógica de negócio/interação.
 */
export function MirrorScreenRenderer({ snapshot }: MirrorScreenRendererProps) {
  if (!snapshot) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Sem tela registrada ainda.</Text>
      </View>
    );
  }

  const template = String(snapshot.screenTemplate ?? '').trim();
  const exercise = asExercise(snapshot.exercise);
  const mediaKind = snapshot.mediaKind;
  const mediaUrl = snapshot.mediaUrl;

  return (
    <View style={styles.frame} pointerEvents="none">
      {/* Título/mensagem de destaque da tela */}
      {snapshot.highlightMessage ? (
        <View style={styles.highlightPill}>
          <Text style={styles.highlightText}>{snapshot.highlightMessage}</Text>
        </View>
      ) : null}

      {/* Mídia principal */}
      {mediaUrl && mediaKind === 'image' ? (
        <View style={styles.imageCard}>
          <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="contain" />
        </View>
      ) : null}

      {mediaKind === 'video' ? (
        <View style={styles.videoCard}>
          <View style={styles.playTriangle} />
          <Text style={styles.mediaCardLabel}>Vídeo da aula</Text>
        </View>
      ) : null}

      {mediaKind === 'audio' && !exercise ? (
        <View style={styles.audioRow}>
          <GreenSpeaker large />
          <Text style={styles.mediaCardLabel}>Áudio da tela</Text>
        </View>
      ) : null}

      {/* Fala/instrução para o aprendiz */}
      {snapshot.learnerSpeech ? (
        <Text style={styles.learnerSpeech}>{snapshot.learnerSpeech}</Text>
      ) : null}

      {/* Exercício — alternativas + seleções do aprendiz, sem interação */}
      {exercise ? (
        <ExerciseReplica exercise={exercise} template={template} interaction={snapshot.interaction ?? null} />
      ) : null}

      {/* Seta AVANÇAR verde (decorativa) das telas de conteúdo */}
      {isContentScreen(template) ? (
        <View style={styles.arrowRow}>
          <SvgXml xml={NEXT_ARROW_FILLED} width={55} height={46} />
        </View>
      ) : null}

      {/* Telas sem mídia nem exercício (intro/conclusão/home) */}
      {!mediaUrl && !exercise && mediaKind !== 'video' && mediaKind !== 'audio' && !snapshot.learnerSpeech ? (
        <View style={styles.plainScreen}>
          <Text style={styles.plainScreenTitle}>{snapshot.screenTitle ?? 'Tela do alfabetizando'}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ExerciseReplica({
  exercise,
  template,
  interaction,
}: {
  exercise: LearnerExerciseConfig;
  template: string;
  interaction: LearnerScreenInteraction | null;
}) {
  const isMatchLetter = template === 'exercise-match-letter' || exercise.template === 'exercise-match-letter';
  const selectedLetters = interaction?.selectedLetters ?? {};
  const completedIds = new Set(interaction?.completedItemIds ?? []);
  const selectedImageIds = new Set(interaction?.selectedImageIds ?? []);

  return (
    <View style={styles.exerciseCard}>
      {/* Ícone de áudio de instrução — presente em ambos os exercícios */}
      <View style={styles.instructionAudioRow}>
        <GreenSpeaker large />
      </View>

      {isMatchLetter
        ? exercise.items.map((item) => {
            const word = String(item.label || '').toUpperCase();
            const letters = word.split('').filter(Boolean);
            const isCompleted = completedIds.has(item.id);
            const selectedLetter = String(selectedLetters[item.id] ?? '').toUpperCase();
            const targetLetter = String(item.correctOptions[0] ?? '').toUpperCase();
            const targetIndex = letters.indexOf(targetLetter);
            const selectedIndex = selectedLetter ? letters.indexOf(selectedLetter) : -1;
            return (
              <View key={item.id} style={styles.matchItem}>
                <View style={styles.matchItemTopRow}>
                  <View style={styles.matchImageWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.matchItemImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.matchItemImageFallback}>
                        <Text style={styles.matchItemImageFallbackText}>{word.slice(0, 1)}</Text>
                      </View>
                    )}
                    {isCompleted ? (
                      <View style={styles.itemStatusBadge}>
                        <Text style={styles.itemStatusBadgeText}>✓</Text>
                      </View>
                    ) : null}
                  </View>
                  <GreenSpeaker />
                </View>
                <View style={styles.squaresRow}>
                  {letters.map((letter, squareIndex) => {
                    const isTarget = squareIndex === targetIndex;
                    const isSelectedSquare = !isCompleted && squareIndex === selectedIndex;
                    const showLetter = isCompleted || isSelectedSquare;
                    return (
                      <View
                        key={`${item.id}-sq-${squareIndex}`}
                        style={[
                          styles.letterSquare,
                          isCompleted && isTarget ? styles.letterSquareTarget : null,
                          isCompleted && !isTarget ? styles.letterSquareRevealed : null,
                          isSelectedSquare ? styles.letterSquareSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.letterSquareText,
                            isCompleted && isTarget ? styles.letterSquareTextTarget : null,
                          ]}
                        >
                          {showLetter ? letter : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        : (
          <View style={styles.markGrid}>
            {exercise.items.map((item, itemIndex) => {
              const caption = getLearnerVisibleExerciseLabel(item.label, itemIndex);
              const isSelected = selectedImageIds.has(item.id);
              return (
                <View key={item.id} style={[styles.markItem, isSelected ? styles.markItemSelected : null]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.markItemImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.markItemFallback}>
                      <Text style={styles.markItemFallbackText}>{caption ?? `Imagem ${itemIndex + 1}`}</Text>
                    </View>
                  )}
                  {isSelected ? (
                    <View style={styles.itemStatusBadge}>
                      <Text style={styles.itemStatusBadgeText}>✓</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderColor: '#d6dae0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    minHeight: 220,
    gap: 12,
  },
  emptyState: {
    borderWidth: 2,
    borderColor: '#d6dae0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 24,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#7a7a7a',
    fontSize: 14,
  },
  highlightPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9f7ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  highlightText: {
    color: '#1f7a4d',
    fontSize: 12,
    fontWeight: '700',
  },
  imageCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 180,
  },
  videoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
    marginLeft: 6,
  },
  mediaCardLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  audioRow: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  learnerSpeech: {
    color: '#1a1a1a',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: '#f7f8fa',
    borderRadius: 12,
    padding: 12,
    gap: 14,
  },
  instructionAudioRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  matchItem: {
    gap: 8,
  },
  matchItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchImageWrap: {
    width: 72,
    height: 72,
  },
  matchItemImage: {
    width: 72,
    height: 72,
  },
  matchItemImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchItemImageFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6b7280',
  },
  squaresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 8,
  },
  letterSquare: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c3c9d2',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSquareTarget: {
    borderColor: '#2fa536',
    backgroundColor: '#2fa536',
  },
  letterSquareRevealed: {
    borderColor: '#d3d7dd',
    backgroundColor: '#eef1f4',
  },
  letterSquareSelected: {
    borderColor: '#e6b800',
    backgroundColor: '#fff3c4',
  },
  letterSquareText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#25313f',
  },
  letterSquareTextTarget: {
    color: '#ffffff',
  },
  itemStatusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2fa536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemStatusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  markGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  markItem: {
    width: '46%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d6dae0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  markItemSelected: {
    borderColor: '#2fa536',
    backgroundColor: '#eafbef',
  },
  markItemImage: {
    width: '100%',
    height: '100%',
  },
  markItemFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markItemFallbackText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrowRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  plainScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  plainScreenTitle: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
