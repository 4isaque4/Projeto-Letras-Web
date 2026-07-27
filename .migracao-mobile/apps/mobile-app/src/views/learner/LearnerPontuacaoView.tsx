import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from 'expo-asset';
import { SvgUri } from 'react-native-svg';
import { LearnerRootStackParamList } from '../../types';
import { BellIcon } from '../shared/BellIcon';
import { PhraseProgressWidget } from '../educator/components/PhraseProgressWidget';
import { LearnerBottomMenu } from './components/LearnerBottomMenu';
import { useLearnerSession } from './learnerSessionContext';
import { httpClient } from '../../infra/api/http-client';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerScore'>;

interface ScoreData {
  totalPoints: number;
  completedCount: number;
  totalActivities: number;
}

// Figma (Pontuação): "Cada 200 pontos, você ganha uma nova Letra" —
// ex.: 2.620 pontos → 13 letras no marcador.
const POINTS_PER_LETTER = 200;

const SHARE_TEXT =
  'Estou me alfabetizando pelo app Letras e transformando a minha vida! #Letras #Alfabetização';

function buildSocialShareUrl(platform: 'linkedin' | 'facebook' | 'instagram' | 'x'): string {
  const encoded = encodeURIComponent(SHARE_TEXT);
  if (platform === 'linkedin') return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
  if (platform === 'facebook') return `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`;
  if (platform === 'instagram') return 'https://www.instagram.com/';
  return `https://x.com/intent/tweet?text=${encoded}`;
}

export function LearnerPontuacaoView({ navigation }: Props) {
  const learnerSession = useLearnerSession();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [logoAsset] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = logoAsset?.[0]?.localUri ?? logoAsset?.[0]?.uri;

  useEffect(() => {
    const learnerId = learnerSession.learnerProfileId;
    if (!learnerId) {
      setIsLoading(false);
      return;
    }
    void (async () => {
      try {
        const data = await httpClient.get<ScoreData>(`/painel/score/${learnerId}`);
        setScoreData(data);
      } catch {
        setScoreData(null);
      }
      setIsLoading(false);
    })();
  }, [learnerSession.learnerProfileId]);

  const totalPoints = scoreData?.totalPoints ?? 0;
  const lettersUnlocked = Math.floor(totalPoints / POINTS_PER_LETTER);
  const updatedDateStr = new Date().toLocaleDateString('pt-BR');

  const handleSocial = async (platform: 'linkedin' | 'facebook' | 'instagram' | 'x') => {
    const url = buildSocialShareUrl(platform);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          {logoUri ? (
            <SvgUri uri={logoUri} width={84} height={50} />
          ) : (
            <View style={{ width: 84, height: 50 }} />
          )}
        </View>
        <BellIcon size={22} />
      </View>

      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#000" />
        ) : (
          <>
            {/* Figma (Pontuação): ícone de certificado + textos do sistema */}
            <View style={styles.summaryCard}>
              <Image source={require('../../../assets/menu/pontuacao.png')} style={styles.awardIcon} />
              <Text style={styles.summaryText}>
                Letras tem um sistema de pontuação. Cada {POINTS_PER_LETTER} pontos, você ganha uma nova Letra no seu Alfabeto de PESSOA QUE TRANSFORMA PESSOA.
              </Text>
              <Text style={styles.scoreText}>
                Sua pontuação atual:{' '}
                <Text style={styles.scoreHighlight}>{totalPoints.toLocaleString('pt-BR')} pontos obtidos.</Text>
                {' '}(atualizado em {updatedDateStr})
              </Text>
              <Text style={styles.summaryText}>
                Você já conseguiu incluir {lettersUnlocked} letra{lettersUnlocked !== 1 ? 's' : ''} no seu marcador.
              </Text>
            </View>

            {/* RN096: PESSOA QUE TRANSFORMA PESSOA com letras destravadas */}
            <View style={styles.phraseContainer}>
              <PhraseProgressWidget lettersUnlocked={lettersUnlocked} />
            </View>

            <Text style={styles.shareIntro}>
              Compartilhe suas conquistas e mostre que outras pessoas também podem fazer o mundo um lugar mais humano pra se viver.
            </Text>

            <View style={styles.socialsRow}>
              <Pressable onPress={() => void handleSocial('linkedin')} style={styles.socialBtn}>
                <Image source={require('../../../assets/social-linkedin.png')} style={styles.socialIcon} />
              </Pressable>
              <Pressable onPress={() => void handleSocial('facebook')} style={styles.socialBtn}>
                <Image source={require('../../../assets/social-facebook.png')} style={styles.socialIcon} />
              </Pressable>
              <Pressable onPress={() => void handleSocial('instagram')} style={styles.socialBtn}>
                <Image source={require('../../../assets/social-instagram.png')} style={styles.socialIcon} />
              </Pressable>
              <Pressable onPress={() => void handleSocial('x')} style={styles.socialBtn}>
                <Image source={require('../../../assets/social-x.png')} style={styles.socialIcon} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <LearnerBottomMenu
        active="pontuacao"
        onInicioPress={() => navigation.navigate('LearnerHome')}
        onTutorialPress={() => navigation.navigate('LearnerTutorials')}
        onPontuacaoPress={() => navigation.navigate('LearnerScore')}
        onPerfilPress={() => navigation.navigate('LearnerProfile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  scrollFlex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 110,
  },
  summaryCard: {
    gap: 10,
    alignItems: 'center',
  },
  awardIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111111',
    textDecorationLine: 'underline',
  },
  scoreText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111111',
    textDecorationLine: 'underline',
  },
  scoreHighlight: {
    fontWeight: '700',
  },
  phraseContainer: {
    marginVertical: 18,
  },
  shareIntro: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111111',
    textDecorationLine: 'underline',
    marginBottom: 14,
  },
  socialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 18,
  },
  socialBtn: {
    padding: 6,
  },
  socialIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});
