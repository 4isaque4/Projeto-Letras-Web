import { useCallback, useEffect, useState } from 'react';
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
import { SvgUri, SvgXml } from 'react-native-svg';
import { httpClient } from '../../infra/api/http-client';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBell } from '../shared/EducatorBell';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorComparativo'>;

interface ActivityPhoto {
  id: string;
  student_id: string;
  activity_id: string | null;
  kind: string;
  public_url: string;
  status: string;
  created_at: string;
}

// Figma "Etapa 3 - Comparativo de Atividade": Atividade solicitada × entregue,
// contato (ligar/WhatsApp) e VOLTAR / APROVAR TAREFA. A avaliação por IA é
// MVP-3 (decisão 17/05) — aqui a aprovação é manual do alfabetizador (RN082).

const BACK_ARROW_NAVY = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M51 17H25V8L4 23L25 38V29H51V17Z" stroke="#1e3a5f" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const APPROVE_SEAL = `
<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M26 2 L31 7 L38 5 L40 12 L47 14 L45 21 L50 26 L45 31 L47 38 L40 40 L38 47 L31 45 L26 50 L21 45 L14 47 L12 40 L5 38 L7 31 L2 26 L7 21 L5 14 L12 12 L14 5 L21 7 Z" fill="#111111"/>
  <path d="M17 26 L23 32 L35 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function EducatorComparativoView({ navigation, route }: Props) {
  const { educatorId, learnerId, learnerName, phoneDigits } = route.params;

  const [logoAsset] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = logoAsset?.[0]?.localUri ?? logoAsset?.[0]?.uri;

  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await httpClient.get<ActivityPhoto[]>(
        `/painel/fotos-atividade?studentId=${learnerId}&kind=atividade`,
      );
      setPhotos(data ?? []);
    } catch {
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  // RN081: em múltiplas tentativas, exibir apenas a última enviada.
  const latest = photos[0] ?? null;

  const approve = async () => {
    if (!latest || isApproving) return;
    setIsApproving(true);
    try {
      await httpClient.patch(`/painel/fotos-atividade/${latest.id}/aprovar`, { educatorId });
      setFeedback('Tarefa aprovada.');
      await loadPhotos();
    } catch {
      setFeedback('Não foi possível aprovar. Tente novamente.');
    } finally {
      setIsApproving(false);
    }
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('EducatorHome', { fullName: undefined, educatorId });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : <ActivityIndicator size="small" color="#111" />}
          </View>
          <EducatorBell educatorId={educatorId} />
        </View>

        <Text style={styles.sectionLabel}>Atividade solicitada:</Text>
        <View style={styles.contentCard}>
          <Text style={styles.requestedText}>
            {learnerName ? `Atividade pedida a ${learnerName}` : 'Atividade pedida ao alfabetizando'} na tela da aula
            {latest?.activity_id ? ` (${latest.activity_id.slice(0, 8)}…)` : ''}.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Atividade entregue:</Text>
        <View style={styles.contentCard}>
          {isLoading ? (
            <ActivityIndicator color="#111111" style={{ marginVertical: 40 }} />
          ) : latest ? (
            <Image source={{ uri: latest.public_url }} style={styles.photo} resizeMode="contain" />
          ) : (
            <Text style={styles.emptyText}>Nenhuma foto enviada por este alfabetizando ainda.</Text>
          )}
        </View>

        {latest ? (
          <Text style={styles.statusLine}>
            {latest.status === 'aprovada' ? 'Tarefa já aprovada.' : 'Aguardando sua avaliação.'}
            {'  '}Enviada em {new Date(latest.created_at).toLocaleDateString('pt-BR')}.
          </Text>
        ) : null}

        <Text style={styles.contactText}>
          É necessário você ligar ou enviar mensagem de áudio via Whatsapp para o alfabetizando. Use o que for mais fácil para ele.
        </Text>

        <View style={styles.contactRow}>
          <Pressable
            style={[styles.contactBtn, !phoneDigits ? styles.disabled : null]}
            disabled={!phoneDigits}
            onPress={() => phoneDigits && Linking.openURL(`tel:+55${phoneDigits}`)}
            accessibilityLabel="Ligar"
          >
            <Text style={styles.contactIcon}>📞</Text>
          </Pressable>
          <Pressable
            style={[styles.contactBtn, !phoneDigits ? styles.disabled : null]}
            disabled={!phoneDigits}
            onPress={() => phoneDigits && Linking.openURL(`https://wa.me/55${phoneDigits}`)}
            accessibilityLabel="WhatsApp"
          >
            <Text style={styles.contactIcon}>🟢</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={goBack} accessibilityRole="button">
            <SvgXml xml={BACK_ARROW_NAVY} width={55} height={46} />
            <Text style={styles.actionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, !latest || latest.status === 'aprovada' ? styles.disabled : null]}
            onPress={() => void approve()}
            disabled={!latest || latest.status === 'aprovada' || isApproving}
            accessibilityRole="button"
          >
            {isApproving ? <ActivityIndicator color="#111111" /> : <SvgXml xml={APPROVE_SEAL} width={46} height={46} />}
            <Text style={styles.actionLabel}>APROVAR{'\n'}TAREFA</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </ScrollView>

      <EducatorBottomMenu
        active="acompanhar"
        onInicioPress={() => navigation.navigate('EducatorHome', { fullName: undefined, educatorId })}
        onTutorialPress={() => navigation.navigate('EducatorTutorials', { educatorId })}
        onPontuacaoPress={() => navigation.navigate('EducatorScore', { educatorId: educatorId ?? '', fullName: '' })}
        onPerfilPress={() => navigation.navigate('EducatorProfile' as never)}
        onAcompanharPress={() => navigation.navigate('EducatorHome', { fullName: undefined, educatorId })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    color: '#111111',
    marginTop: 8,
  },
  contentCard: {
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  requestedText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111111',
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 220,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 30,
  },
  statusLine: {
    fontSize: 13,
    color: '#374151',
  },
  contactText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111111',
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  contactBtn: {
    padding: 8,
  },
  contactIcon: {
    fontSize: 34,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 14,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.35,
  },
  feedback: {
    fontSize: 13,
    color: '#15803d',
    textAlign: 'center',
  },
});
