import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnerRootStackParamList } from '../../types';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { LearnerActionButtons } from './components/LearnerActionButtons';
import { useLearnerSession } from './learnerSessionContext';
import { learnerTheme } from './learnerTheme';
import { httpClient } from '../../infra/api/http-client';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerStageConclusion'>;

// Ícone de certificado (RN049) — ao lado da letra do nível.
const CERT_ICON = `
<svg width="34" height="40" viewBox="0 0 34 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="2" width="28" height="24" rx="2" stroke="#111111" stroke-width="2.5"/>
  <circle cx="17" cy="13" r="5.5" stroke="#111111" stroke-width="2.5"/>
  <path d="M13 19L11 30L17 26L23 30L21 19" stroke="#111111" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

// Letra do nível (RN048/RN049) — "Letra do Alfabeto referente à sua posição".
// A posição real do alfabetizando depende de dado do progresso (pendente no
// modelo); por ora derivamos da etapa concluída (Etapa 1 -> A, 2 -> B, ...).
function levelLetter(stageNumber: number): string {
  const idx = Math.max(1, stageNumber) - 1;
  return String.fromCharCode(65 + Math.min(idx, 25));
}

const SOCIALS = [
  { key: 'linkedin', src: require('../../../assets/social-linkedin.png') },
  { key: 'facebook', src: require('../../../assets/social-facebook.png') },
  { key: 'instagram', src: require('../../../assets/social-instagram.png') },
  { key: 'x', src: require('../../../assets/social-x.png') },
] as const;

// RN050: divulgação real nas redes. LinkedIn/Facebook/X têm intents web;
// Instagram não expõe intent de publicação — cai no diálogo nativo de
// compartilhamento do aparelho.
const SHARE_URL = 'https://mobile.letras.cloud';

function buildShareMessage(stageNumber: number): string {
  return `Concluí a Etapa ${stageNumber} de alfabetização no projeto Letras! Pessoa que transforma pessoa. ${SHARE_URL}`;
}

async function shareTo(network: (typeof SOCIALS)[number]['key'], stageNumber: number) {
  const message = buildShareMessage(stageNumber);
  const encodedUrl = encodeURIComponent(SHARE_URL);
  const encodedMessage = encodeURIComponent(message);
  const intents: Record<string, string> = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
    x: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
  };
  try {
    const intent = intents[network];
    if (intent) {
      await Linking.openURL(intent);
      return;
    }
    await Share.share({ message });
  } catch {
    // Compartilhamento cancelado/indisponível — sem erro para o aluno.
  }
}

export function LearnerStageConclusionView({ navigation, route }: Props) {
  const { stageNumber, pointsEarned } = route.params;
  const learnerSession = useLearnerSession();
  const nome = learnerSession.learnerName?.trim() || 'alfabetizando';

  // RN048: "acumulou NN pontos". O param pointsEarned raramente é informado
  // (a conclusão de aula não o repassa), então buscamos o total real do aluno
  // no mesmo endpoint da tela de pontuação; o param, se vier, tem prioridade.
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  useEffect(() => {
    const learnerId = learnerSession.learnerProfileId;
    if (!learnerId) {
      return;
    }
    void (async () => {
      try {
        const data = await httpClient.get<{ totalPoints: number }>(`/painel/score/${learnerId}`);
        setTotalPoints(data?.totalPoints ?? null);
      } catch {
        setTotalPoints(null);
      }
    })();
  }, [learnerSession.learnerProfileId]);

  const pontos = typeof pointsEarned === 'number' ? pointsEarned : totalPoints ?? 0;
  const proximaEtapa = stageNumber + 1;

  // RN049: toque no ícone de certificado abre o certificado com nome e
  // conquistas (no web, imprimível — vira PDF pelo diálogo do navegador).
  const [isCertOpen, setIsCertOpen] = useState(false);

  const goNext = () => navigation.navigate('LearnerHome');

  return (
    <LearnerScreenLayout
      activeMenu="inicio"
      onMenuHome={() => navigation.navigate('LearnerHome')}
      onMenuTutorial={() => navigation.navigate('LearnerTutorials')}
      onMenuScore={() => navigation.navigate('LearnerScore')}
      onMenuProfile={() => navigation.navigate('LearnerProfile')}
      roleLabel="alfabetizando"
      learnerName={learnerSession.learnerName}
    >
      <View style={styles.wrapper}>
        <Text style={styles.congrats}>PARABÉNS!!!!</Text>

        <Text style={styles.body}>
          Você concluiu a Etapa {stageNumber} de alfabetização de {nome}.
        </Text>
        <Text style={styles.body}>
          Com isso, acumulou {pontos.toLocaleString('pt-BR')} ponto{pontos === 1 ? '' : 's'} e agora recebeu o selo de nível:
        </Text>

        <View style={styles.levelRow}>
          <Text style={styles.levelLetter}>{levelLetter(stageNumber)}</Text>
          <Pressable
            onPress={() => setIsCertOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir certificado"
            hitSlop={10}
          >
            <SvgXml xml={CERT_ICON} width={34} height={40} />
          </Pressable>
        </View>

        {isCertOpen ? (
          <Modal transparent animationType="fade" onRequestClose={() => setIsCertOpen(false)}>
            <View style={styles.certBackdrop}>
              <View style={styles.certCard}>
                <Text style={styles.certHeading}>CERTIFICADO</Text>
                <Text style={styles.certBody}>Certificamos que</Text>
                <Text style={styles.certName}>{nome}</Text>
                <Text style={styles.certBody}>
                  concluiu a Etapa {stageNumber} de Alfabetização do projeto Letras,
                  acumulando {pontos.toLocaleString('pt-BR')} ponto{pontos === 1 ? '' : 's'} e o selo de nível {levelLetter(stageNumber)}.
                </Text>
                <Text style={styles.certMotto}>PESSOA QUE TRANSFORMA PESSOA!</Text>
                <View style={styles.certActions}>
                  {Platform.OS === 'web' ? (
                    <Pressable
                      style={styles.certButton}
                      onPress={() => {
                        (globalThis as { print?: () => void }).print?.();
                      }}
                    >
                      <Text style={styles.certButtonText}>SALVAR EM PDF</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.certButtonOutline} onPress={() => setIsCertOpen(false)}>
                    <Text style={styles.certButtonOutlineText}>FECHAR</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : null}

        <Text style={styles.share}>
          Divulgue para todas e para todos que você está transformando a vida de pessoas. Quem sabe elas também não começam a atuar por um mundo melhor!
        </Text>

        <View style={styles.socialsRow}>
          {SOCIALS.map((s) => (
            <Pressable
              key={s.key}
              style={styles.socialBtn}
              accessibilityRole="button"
              accessibilityLabel={`Compartilhar no ${s.key}`}
              onPress={() => void shareTo(s.key, stageNumber)}
            >
              <Image source={s.src} style={styles.socialIcon} resizeMode="contain" />
            </Pressable>
          ))}
        </View>

        <View style={styles.cta}>
          <LearnerActionButtons
            variant="dark"
            hideBack
            nextLabel={`IR PARA ETAPA ${proximaEtapa}\nDE ALFABETIZAÇÃO`}
            onNext={goNext}
          />
        </View>
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
    marginTop: 6,
  },
  congrats: {
    fontSize: 20,
    fontWeight: '800',
    color: learnerTheme.textStrong,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: learnerTheme.textStrong,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginVertical: 8,
  },
  levelLetter: {
    fontSize: 72,
    lineHeight: 84,
    fontFamily: 'HinaMincho_400Regular',
    color: learnerTheme.textStrong,
  },
  share: {
    fontSize: 16,
    lineHeight: 23,
    color: learnerTheme.textStrong,
    marginTop: 4,
  },
  socialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  socialBtn: {
    padding: 4,
  },
  socialIcon: {
    width: 44,
    height: 44,
  },
  cta: {
    marginTop: 16,
    alignItems: 'center',
  },
  certBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  certCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#101a3d',
    borderRadius: 6,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  certHeading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#101a3d',
  },
  certBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111111',
    textAlign: 'center',
  },
  certName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101a3d',
    textAlign: 'center',
  },
  certMotto: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#2fa536',
  },
  certActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  certButton: {
    backgroundColor: '#101a3d',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  certButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  certButtonOutline: {
    borderWidth: 1.5,
    borderColor: '#101a3d',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  certButtonOutlineText: {
    color: '#101a3d',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
