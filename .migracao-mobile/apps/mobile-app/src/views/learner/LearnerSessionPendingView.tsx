import { useAssets } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgUri } from 'react-native-svg';
import { httpClient } from '../../infra/api/http-client';
import { SessionStorage } from '../../infra/storage/session-storage';
import { LearnerRootStackParamList } from '../../types';
import { useOptionalLearnerSession } from './learnerSessionContext';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerSessionPending'>;

type RequestStatus = 'PENDING' | 'CONFIRMED' | 'DENIED';

interface SessionRequestStatusResponse {
  id: string;
  status: RequestStatus;
  denialReason: string | null;
  respondedAt: string | null;
}

const POLL_INTERVAL_MS = 3000;

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}


export function LearnerSessionPendingView({ navigation, route }: Props) {
  const { requestId, learnerProfileId, educatorName, learnerName, educatorPhone } = route.params;
  const session = useOptionalLearnerSession();

  const [status, setStatus] = useState<RequestStatus>('PENDING');
  const [denialReason, setDenialReason] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const checkStatus = useCallback(async () => {
    try {
      const result = await httpClient.get<SessionRequestStatusResponse>(
        `/cadastros/sessoes-confirmacao/${requestId}`,
      );
      if (result.status === 'CONFIRMED') {
        intervalRef.current && clearInterval(intervalRef.current);
        await SessionStorage.setLearnerProfileId(learnerProfileId);
        if (session) await session.initialize();
        setStatus('CONFIRMED');
      } else if (result.status === 'DENIED') {
        setStatus('DENIED');
        setDenialReason(result.denialReason);
        intervalRef.current && clearInterval(intervalRef.current);
      }
    } catch {
      // Polling silencioso
    }
  }, [requestId, learnerProfileId, session]);

  useEffect(() => {
    void checkStatus();
    intervalRef.current = setInterval(() => void checkStatus(), POLL_INTERVAL_MS);
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, [checkStatus]);

  const handleCancel = () => {
    intervalRef.current && clearInterval(intervalRef.current);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'UnifiedLogin' }] });
  };

  const handleStart = () => {
    navigation.reset({ index: 0, routes: [{ name: 'LearnerHome' }] });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          {logoUri ? (
            <SvgUri uri={logoUri} width={84} height={50} />
          ) : (
            <ActivityIndicator size="small" color="#111827" />
          )}
        </View>

        {status === 'PENDING' && (
          <View style={styles.body}>
            <Text style={styles.pendingTitle}>Notificação enviada para o celular</Text>
            {educatorPhone ? (
              <Text style={styles.phoneText}>{formatPhone(educatorPhone)}</Text>
            ) : (
              <Text style={styles.phoneText}>(XX) XXXXX-XXXX</Text>
            )}
            <Text style={styles.pendingHint}>Faça a confirmação no número indicado.</Text>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        {status === 'CONFIRMED' && (
          <View style={styles.body}>
            <Text style={styles.successTitle}>Vinculação realizada com sucesso.</Text>

            <Text style={styles.successBody}>
              {'O alfabetizando '}
              <Text style={styles.bold}>{learnerName ?? 'Alfabetizando'}</Text>
              {'\nestá vinculado ao\nalfabetizador '}
              <Text style={styles.bold}>{educatorName}</Text>
            </Text>

            <View style={styles.attentionBox}>
              <Text style={styles.attentionLabel}>ATENÇÃO:</Text>
              <Text style={styles.attentionText}>
                {' esta é a última tela gerenciada por você no celular do alfabetizando.\nA partir de agora, você deve auxiliar o alfabetizando à distância, sempre o acompanhando pelo seu celular.'}
              </Text>
            </View>

            <Pressable style={styles.startBtn} onPress={handleStart}>
              <Image source={require('../../../assets/avancar.png')} style={styles.arrowIcon} resizeMode="contain" />
              <Text style={styles.startLabel}>INICIAR{'\n'}ALFABETIZAÇÃO</Text>
            </Pressable>
          </View>
        )}

        {status === 'DENIED' && (
          <View style={styles.body}>
            <Text style={styles.deniedTitle}>Acesso não autorizado</Text>
            <Text style={styles.deniedMessage}>
              {denialReason ?? 'Acesso recusado pelo alfabetizador.'}
            </Text>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelLabel}>TENTAR NOVAMENTE</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
    marginBottom: 0,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 40,
  },

  // --- PENDING ---
  pendingTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#111111',
    lineHeight: 26,
  },
  phoneText: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '400',
    lineHeight: 24,
  },
  pendingHint: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 24,
  },

  // --- CONFIRMED ---
  successTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#111111',
    lineHeight: 26,
  },
  successBody: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  attentionBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attentionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 22,
  },
  attentionText: {
    fontSize: 14,
    color: '#111111',
    lineHeight: 22,
    flexShrink: 1,
  },
  startBtn: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  startLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#101010',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 19,
  },

  // --- DENIED ---
  deniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9e1b1b',
    textAlign: 'center',
  },
  deniedMessage: {
    fontSize: 15,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 22,
  },

  // --- SHARED ---
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  cancelLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
});
