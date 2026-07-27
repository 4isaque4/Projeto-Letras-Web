import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnerRootStackParamList } from '../../types';
import { httpClient } from '../../infra/api/http-client';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { LearnerHintVideoOverlay } from './components/LearnerHintVideoOverlay';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerTutorials'>;

// Vídeos de dica/apoio (kind=dica) que o alfabetizando pode consultar quando
// quiser — complementam as dicas contextuais que aparecem em cada tela de aula
// (RN042/057/069). Vêm de GET /painel/dicas.
interface SupportVideo {
  id: string;
  title: string;
  description: string | null;
  public_url: string | null;
  metadata?: { thumbnail_url?: string } | null;
}

export function LearnerTutoriaisView({ navigation }: Props) {
  const [videos, setVideos] = useState<SupportVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const fetchDicas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await httpClient.get<SupportVideo[]>('/painel/dicas');
      setVideos((raw ?? []).filter((v) => v.public_url));
    } catch {
      setError('Não foi possível carregar as dicas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDicas();
  }, [fetchDicas]);

  return (
    <>
      <LearnerScreenLayout
        activeMenu="tutorial"
        onMenuHome={() => navigation.navigate('LearnerHome')}
        onMenuTutorial={() => navigation.navigate('LearnerTutorials')}
        onMenuScore={() => navigation.navigate('LearnerScore')}
        onMenuProfile={() => navigation.navigate('LearnerProfile')}
      >
        <View style={styles.wrap}>
          <Text style={styles.title}>Vídeos de dica</Text>
          <Text style={styles.subtitle}>Toque em um vídeo para assistir sempre que precisar de ajuda.</Text>

          {isLoading ? (
            <ActivityIndicator color="#111111" style={styles.loader} />
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => void fetchDicas()}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : videos.length === 0 ? (
            <Text style={styles.empty}>Nenhuma dica disponível no momento.</Text>
          ) : (
            <View style={styles.list}>
              {videos.map((v) => {
                const thumb = v.metadata?.thumbnail_url;
                return (
                  <Pressable
                    key={v.id}
                    style={styles.card}
                    onPress={() => setPlaying(v.public_url)}
                    accessibilityRole="button"
                    accessibilityLabel={`Assistir dica: ${v.title}`}
                  >
                    <View style={styles.thumb}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumbImg} resizeMode="cover" />
                      ) : null}
                      <View style={styles.playDot}>
                        <Text style={styles.playTri}>▶</Text>
                      </View>
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{v.title}</Text>
                      {v.description ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>{v.description}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </LearnerScreenLayout>

      {playing ? (
        <LearnerHintVideoOverlay videoUrl={playing} onClose={() => setPlaying(null)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#555555',
    marginBottom: 10,
  },
  loader: {
    marginTop: 28,
  },
  list: {
    gap: 14,
    marginTop: 6,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
  },
  thumb: {
    width: 108,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#d9d9d9',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    ...StyleSheet.absoluteFillObject,
  },
  playDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(17,17,17,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTri: {
    color: '#ffffff',
    fontSize: 13,
    marginLeft: 2,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 19,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  empty: {
    marginTop: 28,
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  errorWrap: {
    marginTop: 28,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#7d1f1f',
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111111',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
});
