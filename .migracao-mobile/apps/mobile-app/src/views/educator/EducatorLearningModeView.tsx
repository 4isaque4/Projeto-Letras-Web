import { useCallback, useEffect, useState } from 'react';
import { useAssets } from 'expo-asset';
import {
  ActivityIndicator,
  Linking,
  Platform,
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
import { httpClient } from '../../infra/api/http-client';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorLearningMode'>;

interface LearnerDetail {
  id: string;
  displayName: string;
  cpfOrPassport?: string | null;
  phoneDigits?: string | null;
  birthDate?: string | null;
  uf?: string | null;
  city?: string | null;
  notes?: string | null;
  educator?: { id: string; name: string; email?: string | null; phoneDigits?: string | null } | null;
}

interface LearnerSessionState {
  currentView?: string | null;
  currentActivityId?: string | null;
  statePayload?: Record<string, unknown> | null;
  isLocked?: boolean;
  updatedAt?: string;
}

interface LearnerSession {
  updatedAt?: string;
  sessionState?: LearnerSessionState | null;
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '');
}

function formatPhone(phone?: string | null) {
  const digits = normalizeDigits(phone).slice(0, 11);
  if (digits.length !== 11) return phone || '-';
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function fallbackValue(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : '-';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatCurrentView(value?: string | null) {
  const normalized = fallbackValue(value);
  const labels: Record<string, string> = {
    LearnerHome: 'Início do alfabetizando',
    LearnerLessonIntro: 'Introdução da aula',
    LearnerLessonScreen: 'Tela de aula',
    LearnerLessonActivity: 'Atividade da aula',
    LearnerLessonConclusion: 'Conclusão da aula',
  };
  return labels[normalized] ?? normalized;
}

export function EducatorLearningModeView({ navigation, route }: Props) {
  const [learner, setLearner] = useState<LearnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(route.params?.learnerId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [learnerSession, setLearnerSession] = useState<LearnerSession | null>(null);

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const educatorName = route.params?.fullName?.trim() || 'Alfabetizador';
  const educatorId = route.params?.educatorId;
  const learnerId = route.params?.learnerId;
  const learnerName = route.params?.learnerName?.trim() || 'O alfabetizando';

  const goHome = () => navigation.navigate('EducatorHome', { fullName: educatorName, educatorId });

  const loadLearner = useCallback(async () => {
    if (!learnerId) {
      setIsLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      setIsLoading(true);
      const [data, session] = await Promise.all([
        httpClient.get<LearnerDetail>(`/cadastros/alfabetizandos/${learnerId}`),
        httpClient.get<LearnerSession>(`/sessions/${learnerId}`).catch(() => null),
      ]);
      setLearner(data);
      setLearnerSession(session);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível carregar o alfabetizando.');
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    void loadLearner();
  }, [loadLearner]);

  const titleName = learner?.displayName || learnerName;
  const phoneDigits = normalizeDigits(learner?.phoneDigits);
  const sessionState = learnerSession?.sessionState ?? null;
  const hasSession = Boolean(sessionState?.currentView || sessionState?.currentActivityId);
  const sessionUpdatedAt = sessionState?.updatedAt ?? learnerSession?.updatedAt;

  const copyValue = async (key: string, value: string) => {
    const text = value.trim();
    if (!text || text === '-') return;

    try {
      if (Platform.OS === 'web') {
        const nav = globalThis.navigator as
          | (Navigator & { clipboard?: { writeText?: (text: string) => Promise<void> } })
          | undefined;
        await nav?.clipboard?.writeText?.(text);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1400);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : goHome())} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {logoUri ? (
              <SvgUri uri={logoUri} width={84} height={50} />
            ) : (
              <ActivityIndicator size="small" color="#111827" />
            )}
          </View>
          <EducatorBell educatorId={educatorId} />
        </View>

        <View style={styles.body}>
          <Text style={styles.screenTitle}>Detalhes do alfabetizando</Text>
          <Text style={styles.learnerTitle}>{titleName}</Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color="#111827" />
          ) : errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <>
              <View style={styles.infoCard}>
                <InfoRow
                  label="CPF ou passaporte"
                  value={fallbackValue(learner?.cpfOrPassport)}
                  copyKey="cpf"
                  copiedKey={copiedKey}
                  onCopy={copyValue}
                />
                <InfoRow
                  label="Celular"
                  value={formatPhone(learner?.phoneDigits)}
                  copyKey="telefone"
                  copiedKey={copiedKey}
                  onCopy={copyValue}
                />
                <InfoRow
                  label="Cidade / UF"
                  value={fallbackValue(learner?.city && learner?.uf ? `${learner.city} / ${learner.uf}` : (learner?.city || learner?.uf))}
                  copyKey="cidade"
                  copiedKey={copiedKey}
                  onCopy={copyValue}
                />
                <InfoRow
                  label="Tutor"
                  value={fallbackValue(learner?.educator?.name || educatorName)}
                  copyKey="tutor"
                  copiedKey={copiedKey}
                  onCopy={copyValue}
                />
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, !phoneDigits ? styles.actionButtonDisabled : null]}
                  disabled={!phoneDigits}
                  onPress={() => phoneDigits && Linking.openURL(`tel:+55${phoneDigits}`)}
                >
                  <Text style={styles.actionText}>LIGAR</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, !phoneDigits ? styles.actionButtonDisabled : null]}
                  disabled={!phoneDigits}
                  onPress={() => phoneDigits && Linking.openURL(`https://wa.me/55${phoneDigits}`)}
                >
                  <Text style={styles.actionText}>WHATSAPP</Text>
                </Pressable>
                {/* RN059/RN070: atividade fotografada pelo aluno -> comparativo. */}
                <Pressable
                  style={styles.actionButton}
                  onPress={() =>
                    learnerId &&
                    navigation.navigate('EducatorComparativo', {
                      educatorId,
                      learnerId,
                      learnerName: learner?.displayName ?? learnerName,
                      phoneDigits,
                    })
                  }
                >
                  <Text style={styles.actionText}>ATIVIDADE ENVIADA</Text>
                </Pressable>
              </View>

              {sessionState ? (
                <View style={[styles.supportCard, sessionState?.isLocked ? styles.supportCardLocked : null]}>
                  <Text style={styles.supportEyebrow}>
                    {sessionState?.isLocked ? 'PEDIDO DE APOIO ATIVO' : 'ULTIMA TELA REGISTRADA'}
                  </Text>
                  <Text style={styles.supportTitle}>
                    {sessionState?.isLocked
                      ? 'Este alfabetizando esta com a tela bloqueada.'
                      : 'Ultima tela vista pelo alfabetizando.'}
                  </Text>
                  <View style={styles.supportInfoRow}>
                    <Text style={styles.supportLabel}>Tela</Text>
                    <Text selectable style={styles.supportValue}>{formatCurrentView(sessionState?.currentView)}</Text>
                  </View>
                  <View style={styles.supportInfoRow}>
                    <Text style={styles.supportLabel}>Atividade</Text>
                    <Text selectable style={styles.supportValue}>{fallbackValue(sessionState?.currentActivityId)}</Text>
                  </View>
                  <View style={styles.supportInfoRow}>
                    <Text style={styles.supportLabel}>Atualizado</Text>
                    <Text style={styles.supportValue}>{formatDateTime(sessionUpdatedAt)}</Text>
                  </View>
                  <Pressable style={styles.supportRefreshButton} onPress={() => void loadLearner()}>
                    <Text style={styles.supportRefreshText}>ATUALIZAR SITUAÇÃO</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Progresso</Text>
                <Text style={styles.mutedText}>Acompanhe o progresso na tela inicial.</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <EducatorBottomMenu
        active="acompanhar"
        onInicioPress={goHome}
        onTutorialPress={goHome}
        onAcompanharPress={goHome}
        onPontuacaoPress={goHome}
        onPerfilPress={() => navigation.navigate('EducatorProfile')}
      />
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  const canCopy = value.trim().length > 0 && value !== '-';
  const isCopied = copiedKey === copyKey;

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueLine}>
        <Text selectable style={styles.infoValue}>
          {value}
        </Text>
        {canCopy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Copiar ${label}`}
            onPress={() => onCopy(copyKey, value)}
            style={[styles.copyButton, isCopied ? styles.copyButtonDone : null]}
          >
            <Text style={[styles.copyButtonText, isCopied ? styles.copyButtonTextDone : null]}>
              {isCopied ? 'Copiado' : 'Copiar'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ededed',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 130,
    backgroundColor: '#ededed',
  },
  backButton: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontSize: 15, color: '#20385f', fontWeight: '500' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  notificationButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  body: {
    marginTop: 28,
  },
  loader: {
    marginTop: 32,
  },
  screenTitle: {
    color: '#505050',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  learnerTitle: {
    color: '#1a1a1a',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 20,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 21,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  infoLabel: {
    fontSize: 13,
    color: '#646464',
    marginBottom: 2,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    fontWeight: '600',
  },
  infoValueLine: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: '#c8d0dd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
  },
  copyButtonDone: {
    borderColor: '#1f7a4d',
    backgroundColor: '#e9f7ef',
  },
  copyButtonText: {
    color: '#20385f',
    fontSize: 11,
    fontWeight: '700',
  },
  copyButtonTextDone: {
    color: '#1f7a4d',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  supportCard: {
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d3d7de',
    backgroundColor: '#ffffff',
    padding: 14,
  },
  supportCardLocked: {
    borderColor: '#e1c46b',
    backgroundColor: '#fff8d6',
  },
  supportEyebrow: {
    color: '#20385f',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  supportTitle: {
    color: '#111111',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 5,
    marginBottom: 10,
  },
  supportInfoRow: {
    borderTopWidth: 1,
    borderTopColor: '#e9e9e9',
    paddingTop: 9,
    paddingBottom: 8,
  },
  supportLabel: {
    color: '#606060',
    fontSize: 12,
    marginBottom: 2,
  },
  supportValue: {
    color: '#111111',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  supportRefreshButton: {
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: '#0f172a',
    paddingVertical: 11,
    alignItems: 'center',
  },
  supportRefreshText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '700',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d8d8d8',
    paddingVertical: 9,
  },
  progressLabel: {
    color: '#111111',
    fontSize: 14,
  },
  progressValue: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  mutedText: {
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#d8d8d8',
    paddingVertical: 10,
  },
  historyType: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  historyObs: {
    color: '#333333',
    fontSize: 13,
    marginTop: 2,
  },
  historyDate: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
});
