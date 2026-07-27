import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from 'expo-asset';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { httpClient } from '../../infra/api/http-client';
import { EducatorRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorSessionConfirm'>;

interface PendingRequest {
  id: string;
  requestedAt: string;
  learnerProfile: {
    id: string;
    displayName: string;
    cpfOrPassport: string | null;
    phoneDigits: string | null;
    birthDate: string | null;
    uf: string | null;
    city: string | null;
  };
}

type ScreenState = 'loading' | 'list' | 'empty' | 'error' | 'confirmed' | 'deny-reason';

// RN098 — opções exatas da caixa de recusa de vínculo.
const DENIAL_REASONS = [
  'Não conheço essa pessoa',
  'Desistiu da alfabetização',
  'Não irei mais alfabetizar',
  'Outro motivo',
];

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

function formatBirthDate(date: string): string {
  const base = date.split('T')[0];
  if (base.includes('-')) {
    const [y, m, d] = base.split('-');
    return `${d}/${m}/${y}`;
  }
  return date;
}


export function EducatorSessionConfirmView({ navigation, route }: Props) {
  const { educatorId, fullName } = route.params;

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/nao-confirmar.svg'),
    require('../../../assets/confirmar.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const negarUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;
  const confirmarUri = assets?.[2]?.localUri ?? assets?.[2]?.uri;

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedLearnerName, setConfirmedLearnerName] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      setScreenState('loading');
      setErrorMessage(null);
      // A API Express de produção exige educatorId no GET (400 sem ele).
      const data = await httpClient.get<PendingRequest[]>(
        `/cadastros/sessoes-confirmacao?educatorId=${encodeURIComponent(educatorId)}`,
      );
      setRequests(data);
      setScreenState(data.length === 0 ? 'empty' : 'list');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar solicitações.');
      setScreenState('error');
    }
  }, [educatorId]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  useFocusEffect(
    useCallback(() => {
      void fetchPending();
    }, [fetchPending]),
  );

  const currentRequest = requests[0];

  const handleConfirm = async () => {
    if (!currentRequest || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await httpClient.patch(`/cadastros/sessoes-confirmacao/${currentRequest.id}`, {
        status: 'CONFIRMED',
      });
      setConfirmedLearnerName(currentRequest.learnerProfile.displayName);
      setScreenState('confirmed');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao confirmar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = () => {
    if (!currentRequest || isSubmitting) return;
    setSelectedReason('');
    setShowReasonDropdown(false);
    setScreenState('deny-reason');
  };

  const handleSubmitDenial = async () => {
    if (!currentRequest || isSubmitting || !selectedReason) return;
    setIsSubmitting(true);
    try {
      await httpClient.patch(`/cadastros/sessoes-confirmacao/${currentRequest.id}`, {
        status: 'DENIED',
        denialReason: selectedReason,
      });
      const remaining = requests.slice(1);
      setRequests(remaining);
      setSelectedReason('');
      setShowReasonDropdown(false);
      setScreenState(remaining.length === 0 ? 'empty' : 'list');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao recusar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAfterConfirmed = () => {
    const remaining = requests.slice(1);
    if (remaining.length > 0) {
      setRequests(remaining);
      setScreenState('list');
    } else {
      navigation.navigate('EducatorHome', { fullName, educatorId });
    }
  };

  const goToEducatorHome = () => {
    navigation.navigate('EducatorHome', { fullName, educatorId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          {logoUri ? (
            <SvgUri uri={logoUri} width={84} height={50} />
          ) : (
            <ActivityIndicator size="small" color="#111827" />
          )}
        </View>

        {screenState === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#101010" />
          </View>
        )}

        {screenState === 'error' && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => void fetchPending()} style={styles.textBtn}>
              <Text style={styles.textBtnLabel}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {screenState === 'empty' && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
            <Pressable onPress={goToEducatorHome} style={styles.textBtn}>
              <Text style={styles.textBtnLabel}>Voltar</Text>
            </Pressable>
          </View>
        )}

        {screenState === 'list' && currentRequest && (
          <View style={styles.body}>
            <Text style={styles.questionText}>
              {'O Alfabetizando enviou uma notificação para se vincular a você.\nConfirma a vinculação?'}
            </Text>

            <View style={styles.dataSection}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{'Nome completo: '}</Text>
                <Text style={styles.dataValue}>{currentRequest.learnerProfile.displayName}</Text>
              </View>
              {currentRequest.learnerProfile.phoneDigits ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{'Celular: '}</Text>
                  <Text style={styles.dataValue}>{formatPhone(currentRequest.learnerProfile.phoneDigits)}</Text>
                </View>
              ) : null}
              {currentRequest.learnerProfile.birthDate ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{'Data de Nascimento: '}</Text>
                  <Text style={styles.dataValue}>{formatBirthDate(currentRequest.learnerProfile.birthDate)}</Text>
                </View>
              ) : null}
              {currentRequest.learnerProfile.cpfOrPassport ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{'CPF ou Passaporte: '}</Text>
                  <Text style={styles.dataValue}>{currentRequest.learnerProfile.cpfOrPassport}</Text>
                </View>
              ) : null}
              {currentRequest.learnerProfile.city ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{'Cidade: '}</Text>
                  <Text style={styles.dataValue}>{currentRequest.learnerProfile.city}</Text>
                </View>
              ) : null}
              {currentRequest.learnerProfile.uf ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{'UF: '}</Text>
                  <Text style={styles.dataValue}>{currentRequest.learnerProfile.uf}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <Pressable
                  style={[styles.iconButton, isSubmitting && styles.iconButtonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleDeny}
                >
                  {negarUri ? (
                    <SvgUri uri={negarUri} width={56} height={56} />
                  ) : (
                    <ActivityIndicator size="small" color="#e01b24" />
                  )}
                </Pressable>
                <Text style={[styles.actionLabel, styles.denyLabel]}>{'NÃO\nCONFIRMAR'}</Text>
              </View>

              <View style={styles.actionItem}>
                <Pressable
                  style={[styles.iconButton, isSubmitting && styles.iconButtonDisabled]}
                  disabled={isSubmitting}
                  onPress={() => void handleConfirm()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : confirmarUri ? (
                    <SvgUri uri={confirmarUri} width={56} height={56} />
                  ) : (
                    <ActivityIndicator size="small" color="#111111" />
                  )}
                </Pressable>
                <Text style={styles.actionLabel}>CONFIRMAR</Text>
              </View>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        )}

        {screenState === 'confirmed' && (
          <View style={styles.body}>
            <Text style={styles.confirmedTitle}>Vinculação confirmada.</Text>
            <Text style={styles.confirmedBody}>
              {'Você já pode seguir para a etapa 2 da alfabetização de '}
              <Text style={styles.bold}>{confirmedLearnerName}</Text>
              {'.'}
            </Text>

            <Pressable style={styles.navBtn} onPress={handleAfterConfirmed}>
              <Image source={require('../../../assets/avancar.png')} style={styles.arrowIcon} resizeMode="contain" />
              <Text style={styles.navLabel}>SEGUIR</Text>
            </Pressable>
          </View>
        )}

        {screenState === 'deny-reason' && (
          <View style={styles.body}>
            <Text style={styles.deniedTitle}>Vinculação não confirmada.</Text>
            <Text style={styles.deniedQuestion}>Por qual motivo você não vinculou?</Text>

            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setShowReasonDropdown((v) => !v)}
            >
              <Text style={selectedReason ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                {selectedReason || ' '}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Pressable>

            {showReasonDropdown && (
              <View style={styles.dropdownList}>
                {DENIAL_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedReason(reason);
                      setShowReasonDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <Pressable style={styles.navBtn} onPress={() => setScreenState('list')}>
                  <Image source={require('../../../assets/voltar.png')} style={styles.arrowIcon} resizeMode="contain" />
                  <Text style={styles.navLabel}>VOLTAR</Text>
                </Pressable>
              </View>

              <View style={styles.actionItem}>
                <Pressable
                  style={[styles.navBtn, (!selectedReason || isSubmitting) && styles.iconButtonDisabled]}
                  disabled={!selectedReason || isSubmitting}
                  onPress={() => void handleSubmitDenial()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#111" />
                  ) : (
                    <Image source={require('../../../assets/avancar.png')} style={styles.arrowIcon} resizeMode="contain" />
                  )}
                  <Text style={styles.navLabel}>ENVIAR</Text>
                </Pressable>
              </View>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
  },
  logoWrap: { minHeight: 50, justifyContent: 'center', marginBottom: 0 },
  centered: { marginTop: 80, alignItems: 'center', gap: 16 },
  body: { flex: 1, paddingTop: 32, gap: 24 },

  // --- LIST state ---
  questionText: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 24,
  },
  dataSection: { gap: 6 },
  dataRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dataLabel: { fontSize: 15, color: '#111111', lineHeight: 22 },
  dataValue: { fontSize: 15, color: '#111111', lineHeight: 22, flexShrink: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  actionItem: { alignItems: 'center', gap: 8 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconButtonDisabled: { opacity: 0.35 },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 18,
  },
  denyLabel: { color: '#c0392b' },

  // --- CONFIRMED state ---
  confirmedTitle: {
    fontSize: 18,
    color: '#111111',
    lineHeight: 26,
  },
  confirmedBody: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 24,
  },
  bold: { fontWeight: '700' },

  // --- DENY-REASON state ---
  deniedTitle: {
    fontSize: 18,
    color: '#111111',
    lineHeight: 26,
  },
  deniedQuestion: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 3,
  },
  dropdownSelected: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#aaaaaa',
  },
  dropdownArrow: {
    fontSize: 11,
    color: '#555555',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: -16,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#111111',
  },

  // --- NAV buttons (SEGUIR / VOLTAR / ENVIAR) ---
  navBtn: {
    alignItems: 'center',
    gap: 8,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#101010',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // --- Shared ---
  errorText: { color: '#9e1b1b', fontSize: 13, textAlign: 'center' },
  emptyText: { color: '#444444', fontSize: 15, textAlign: 'center' },
  textBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  textBtnLabel: { fontSize: 14, color: '#20385f', fontWeight: '600' },
});
