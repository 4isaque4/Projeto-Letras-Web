import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from 'expo-asset';
import { SvgUri, SvgXml } from 'react-native-svg';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';
import { EducatorTutorialStorage } from '../../infra/storage/educator-tutorial-storage';
import { EducatorStorage } from '../../infra/storage/educator-storage';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorTutorial'>;

const YOUTUBE_ICON = `<svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24L27 14v20" fill="#fff"/></svg>`;

const PLAYLIST = 'PLKoOmCj1vPmmd0xN6OeDtnNyqA3nVFx_T';

interface Tutorial {
  id: string;
  label: string;
  title: string;
  duration: string;
  embedUrl: string;
}

const TUTORIALS: Tutorial[] = [
  {
    id: '1',
    label: 'VÍDEO 1',
    title: 'Boas-vindas',
    duration: "3'15\"",
    embedUrl: 'https://www.youtube.com/embed/a3PwM72rMLE',
  },
  {
    id: '2',
    label: 'VÍDEO 2',
    title: 'Conheça os temas',
    duration: "1'10\"",
    embedUrl: `https://www.youtube.com/embed?listType=playlist&list=${PLAYLIST}&index=2`,
  },
  {
    id: '3',
    label: 'VÍDEO 3',
    title: 'Primeira Etapa (Presencial)',
    duration: "5'28\"",
    embedUrl: `https://www.youtube.com/embed?listType=playlist&list=${PLAYLIST}&index=3`,
  },
  {
    id: '4',
    label: 'VÍDEO 4',
    title: 'Segunda Etapa (Transição para o on-line)',
    duration: "6'18\"",
    embedUrl: `https://www.youtube.com/embed?listType=playlist&list=${PLAYLIST}&index=4`,
  },
];

const VIDEO_IDS = TUTORIALS.map(t => t.id);

function formatWatchedDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function VideoCard({
  label,
  logoUri,
  size,
}: {
  label: string;
  logoUri?: string | null;
  size: 'large' | 'small';
}) {
  const isLarge = size === 'large';
  return (
    <View style={[styles.videoCard, isLarge && styles.videoCardLarge]}>
      {logoUri ? (
        <View style={styles.videoCardLogo}>
          <SvgUri uri={logoUri} width={isLarge ? 64 : 48} height={isLarge ? 38 : 28} />
        </View>
      ) : null}
      <SvgXml xml={YOUTUBE_ICON} width={isLarge ? 60 : 44} height={isLarge ? 42 : 31} />
      <Text style={[styles.videoCardLabel, isLarge && styles.videoCardLabelLarge]}>{label}</Text>
    </View>
  );
}

export function EducatorTutorialView({ navigation }: Props) {
  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const [watchedDates, setWatchedDates] = useState<Record<string, string | null>>({});
  const [educatorId, setEducatorId] = useState<string | undefined>();
  const [educatorName, setEducatorName] = useState('');

  const video1Watched = Boolean(watchedDates['1']);

  useEffect(() => {
    void (async () => {
      const [profile, dates] = await Promise.all([
        EducatorStorage.getAuthProfile(),
        EducatorTutorialStorage.getAllWatchedDates(VIDEO_IDS),
      ]);
      setEducatorId(profile?.id);
      setEducatorName(profile?.fullName ?? '');
      setWatchedDates(dates);
    })();
  }, []);

  const handleVideoPress = useCallback(
    async (tutorial: Tutorial) => {
      const now = new Date().toISOString();
      await EducatorTutorialStorage.markWatched(tutorial.id, now);
      setWatchedDates(prev => ({ ...prev, [tutorial.id]: prev[tutorial.id] ?? now }));
      navigation.navigate('EducatorTutorialPlayer', {
        embedUrl: tutorial.embedUrl,
        title: `Vídeo ${tutorial.id.padStart(2, '0')} - ${tutorial.title}`,
      });
    },
    [navigation],
  );

  const handleLockedTab = useCallback(() => {
    Alert.alert(
      'Tutorial obrigatório',
      'Assista ao Vídeo 1 para desbloquear o aplicativo.',
      [{ text: 'OK' }],
    );
  }, []);

  const handleInicioPress = useCallback(() => {
    if (!video1Watched) { handleLockedTab(); return; }
    navigation.navigate('EducatorHome', { fullName: educatorName, educatorId });
  }, [video1Watched, navigation, educatorName, educatorId, handleLockedTab]);

  const handleAcompanharPress = useCallback(() => {
    if (!video1Watched) { handleLockedTab(); return; }
    navigation.navigate('EducatorHome', { fullName: educatorName, educatorId });
  }, [video1Watched, navigation, educatorName, educatorId, handleLockedTab]);

  const handlePontuacaoPress = useCallback(() => {
    if (!video1Watched) { handleLockedTab(); return; }
    if (educatorId) navigation.navigate('EducatorScore', { educatorId, fullName: educatorName });
  }, [video1Watched, navigation, educatorName, educatorId, handleLockedTab]);

  const handlePerfilPress = useCallback(() => {
    navigation.navigate('EducatorProfile');
  }, [navigation]);

  const bottomMenu = (
    <EducatorBottomMenu
      active="tutorial"
      onInicioPress={handleInicioPress}
      onAcompanharPress={handleAcompanharPress}
      onPontuacaoPress={handlePontuacaoPress}
      onPerfilPress={handlePerfilPress}
    />
  );

  if (!video1Watched) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoRow}>
            {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : null}
          </View>

          <Text style={styles.introHeading}>
            {'Aqui você ajuda pessoas a lerem o mundo à sua volta.\nO programa é gratuito.'}
          </Text>

          <Text style={styles.introParagraph}>
            {'Alfabetize quantas pessoas quiser. Você ainda ganha pontuação e certificados para mostrar que está transformando a vida das pessoas.'}
          </Text>

          <Text style={styles.dotDivider} numberOfLines={1}>
            {'· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·'}
          </Text>

          <Text style={styles.ctaText}>
            {'Para participar de nosso programa, você precisa assistir aos vídeos tutoriais.\nSão apenas 4 vídeos. Todos bem curtinhos. E vão ajudá-lo a entender toda a sua trajetória em nosso aplicativo.'}
          </Text>

          <Pressable
            style={styles.video1Wrap}
            onPress={() => void handleVideoPress(TUTORIALS[0])}
            android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
          >
            <VideoCard label="VÍDEO 1" logoUri={logoUri} size="large" />
          </Pressable>
        </ScrollView>
        {bottomMenu}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoRow}>
          {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : null}
        </View>

        {TUTORIALS.map(tutorial => {
          const watchedAt = watchedDates[tutorial.id];
          return (
            <View key={tutorial.id} style={styles.tutorialItem}>
              <Text style={styles.tutorialItemTitle}>
                {`Vídeo ${tutorial.id.padStart(2, '0')} - ${tutorial.title} - ${tutorial.duration}`}
              </Text>
              <Pressable
                style={styles.tutorialRow}
                onPress={() => void handleVideoPress(tutorial)}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
              >
                <VideoCard label={tutorial.label} logoUri={logoUri} size="small" />
                <View style={styles.tutorialRowInfo}>
                  {watchedAt ? (
                    <Text style={styles.watchedText}>{`Assistido em\n${formatWatchedDate(watchedAt)}`}</Text>
                  ) : (
                    <Text style={styles.notWatchedText}>
                      {'Não assistido.\nAssista para poder\nalfabetizar.'}
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {bottomMenu}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ededed',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  logoRow: {
    marginBottom: 28,
    minHeight: 50,
    justifyContent: 'center',
  },
  introHeading: {
    fontSize: 16,
    lineHeight: 25,
    color: '#111',
    fontWeight: '400',
    marginBottom: 18,
  },
  introParagraph: {
    fontSize: 16,
    lineHeight: 25,
    color: '#111',
    marginBottom: 24,
  },
  dotDivider: {
    fontSize: 14,
    color: '#999',
    letterSpacing: 2,
    marginBottom: 24,
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#111',
    marginBottom: 28,
  },
  video1Wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#20385f',
  },
  videoCard: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 10,
    minHeight: 160,
  },
  videoCardLarge: {
    minHeight: 200,
  },
  videoCardLogo: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  videoCardLabel: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  videoCardLabelLarge: {
    fontSize: 38,
  },
  tutorialItem: {
    marginBottom: 20,
  },
  tutorialItemTitle: {
    fontSize: 13,
    color: '#444',
    marginBottom: 8,
    fontWeight: '500',
  },
  tutorialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tutorialRowInfo: {
    flex: 1,
    paddingRight: 12,
  },
  watchedText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  notWatchedText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});
