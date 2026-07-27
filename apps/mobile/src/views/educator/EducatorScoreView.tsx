import { useAssets } from 'expo-asset';
import React from 'react';
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
import { SvgUri } from 'react-native-svg';
import { EducatorBell } from '../shared/EducatorBell';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { useEducatorScoreViewModel } from '../../viewmodels/educator/useEducatorScoreViewModel';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';
import { PhraseProgressWidget } from './components/PhraseProgressWidget';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorScore'>;

const SHARE_TEXT =
  'Estou alfabetizando pessoas pelo app Letras e transformando vidas! Você também pode fazer isso. #Letras #Alfabetização';

function buildSocialShareUrl(platform: 'linkedin' | 'facebook' | 'instagram' | 'x', profileHandle?: string | null): string {
  const encoded = encodeURIComponent(SHARE_TEXT);
  if (platform === 'linkedin') {
    return profileHandle
      ? `linkedin://in/${profileHandle}`
      : `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
  }
  if (platform === 'facebook') {
    return profileHandle
      ? `https://www.facebook.com/${profileHandle}`
      : `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`;
  }
  if (platform === 'instagram') {
    return profileHandle
      ? `https://www.instagram.com/${profileHandle}`
      : `https://www.instagram.com/`;
  }
  if (platform === 'x') {
    return profileHandle
      ? `https://x.com/${profileHandle}`
      : `https://x.com/intent/tweet?text=${encoded}`;
  }
  return '';
}

export function EducatorScoreView({ route, navigation }: Props) {
  const { educatorId, fullName } = route.params;
  const { scoreData, socials, loading, error, refresh } = useEducatorScoreViewModel(educatorId);

  const [logoAsset] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = logoAsset?.[0]?.localUri ?? logoAsset?.[0]?.uri;

  const totalScore = scoreData?.totalScore ?? 0;
  const lettersUnlocked = scoreData?.lettersUnlocked ?? 1;
  const updatedAt = scoreData?.updatedAt ? new Date(scoreData.updatedAt) : null;
  const updatedDateStr = updatedAt
    ? updatedAt.toLocaleDateString('pt-BR')
    : '--/--/----';

  const handleSocial = async (platform: 'linkedin' | 'facebook' | 'instagram' | 'x') => {
    const handleMap: Record<string, string | null | undefined> = {
      linkedin: socials.linkedin,
      facebook: socials.facebook,
      instagram: socials.instagram,
      x: socials.xHandle,
    };
    const url = buildSocialShareUrl(platform, handleMap[platform]);
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
        <EducatorBell educatorId={educatorId} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#000" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Image source={require('../../../assets/menu/pontuacao.png')} style={styles.awardIcon} />
              <Text style={styles.summaryText}>
                Letras tem um sistema de pontuação. Cada 200 pontos, você ganha uma nova Letra no seu Alfabeto de PESSOA QUE TRANSFORMA PESSOA.
              </Text>
              <Text style={styles.scoreText}>
                Sua pontuação atual:{' '}
                <Text style={styles.scoreHighlight}>{totalScore.toLocaleString('pt-BR')} pontos obtidos.</Text>
                {' '}(atualizado em {updatedDateStr})
              </Text>
              <Text style={styles.summaryText}>
                Você já conseguiu incluir {lettersUnlocked} letra{lettersUnlocked !== 1 ? 's' : ''} no seu marcador.
              </Text>
            </View>

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

            <Pressable style={styles.rulesLink} onPress={() => navigation.navigate('EducatorScoreRules')}>
              <Text style={styles.rulesLinkText}>Conheça nosso sistema de pontuação.</Text>
              <Image source={require('../../../assets/Info.png')} style={styles.infoIcon} />
            </Pressable>

            <Text style={styles.footerText}>
              Pontuação é bom, sem dúvida. Mas o que vale mesmo é transformar a vida das pessoas. Confira a lista das pessoas você já alfabetizou e, agora, graças a você, enxergam o mundo de um jeito muito melhor.
            </Text>

            <Pressable style={styles.rulesIconBtn} onPress={() => navigation.navigate('EducatorScoreRules')}>
              <Image source={require('../../../assets/Rules.png')} style={styles.rulesIconLarge} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <EducatorBottomMenu
        active="pontuacao"
        onInicioPress={() => navigation.navigate('EducatorHome', { fullName, educatorId })}
        onTutorialPress={() => navigation.navigate('EducatorHome', { fullName, educatorId })}
        onAcompanharPress={() => navigation.navigate('EducatorHome', { fullName, educatorId })}
        onPontuacaoPress={() => void refresh()}
        onPerfilPress={() => navigation.navigate('EducatorProfile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  notificationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
  },
  summaryCard: {
    gap: 8,
  },
  awardIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  scoreText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  scoreHighlight: {
    fontWeight: '600',
    color: '#000',
  },
  phraseContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  shareIntro: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  socialsRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  socialBtn: {
    padding: 8,
  },
  socialIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  rulesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rulesLinkText: {
    fontSize: 15,
    color: '#333',
  },
  infoIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  rulesIconBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  rulesIconLarge: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  footerText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
    marginTop: 40,
  },
});
