import { useCallback } from 'react';
import { useAssets } from 'expo-asset';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { EducatorBell } from '../shared/EducatorBell';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';
import { MirrorScreenRenderer } from './components/MirrorScreenRenderer';
import { resolveMirrorGuidance } from './mirrorGuidance';
import { useEducatorLiveMirrorViewModel } from '../../viewmodels/educator/useEducatorLiveMirrorViewModel';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorLiveMirror'>;

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function EducatorLiveMirrorView({ navigation, route }: Props) {
  const educatorName = route.params?.fullName?.trim() || 'Alfabetizador';
  const educatorId = route.params?.educatorId;
  const learnerId = route.params?.learnerId;
  const learnerName = route.params?.learnerName?.trim() || 'alfabetizando';

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const vm = useEducatorLiveMirrorViewModel({ learnerProfileId: learnerId, educatorId });

  // Conecta ao focar; desconecta ao sair (blur/unmount) para não vazar sockets.
  const { start, stop } = vm;
  useFocusEffect(
    useCallback(() => {
      start();
      return () => stop();
    }, [start, stop]),
  );

  const goHome = () => navigation.navigate('EducatorHome', { fullName: educatorName, educatorId });

  const snapshot = vm.snapshot;
  const screenIndex = snapshot?.screenIndex;
  const totalScreens = snapshot?.totalScreens;
  const stage = snapshot?.stage;
  const hasCounter =
    typeof screenIndex === 'number' && typeof totalScreens === 'number' && totalScreens > 0;
  const counterText = hasCounter
    ? `Tela ${screenIndex + 1} de ${totalScreens}${stage ? ` da Etapa ${stage}` : ''} de Alfabetização.`
    : null;

  const guidance = resolveMirrorGuidance(snapshot);
  const showSpinner = vm.loading && !snapshot;

  // Defesa em profundidade: se a Etapa 1 ainda não foi concluída, o espelhamento
  // não abre — CTA leva o alfabetizador ao runner da Etapa 1. (Fail-open em erro
  // de rede: mirrorBlocked fica false e o gate primário é o da EducatorHome.)
  if (vm.mirrorBlocked && learnerId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.blockedWrap}>
          <Text style={styles.blockedTitle}>Espelhamento bloqueado</Text>
          <Text style={styles.blockedText}>
            Conclua a Etapa 1 com {learnerName} para liberar o espelhamento e a Etapa 2.
          </Text>
          <Pressable
            style={styles.blockedCta}
            onPress={() =>
              navigation.navigate('EducatorEtapa1Lessons', {
                learnerId,
                learnerName: route.params?.learnerName,
                educatorId,
              })
            }
          >
            <Text style={styles.blockedCtaText}>IR PARA A ETAPA 1</Text>
          </Pressable>
          <Pressable style={styles.blockedBack} onPress={goHome}>
            <Text style={styles.blockedBackText}>Voltar ao início</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : goHome())}
          style={styles.backButton}
        >
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
          <View style={styles.titleRow}>
            <Text style={styles.title}>Alfabetizando {learnerName}</Text>
            <View style={[styles.badge, vm.isOnline ? styles.badgeLive : styles.badgeOffline]}>
              <View style={[styles.badgeDot, vm.isOnline ? styles.badgeDotLive : styles.badgeDotOffline]} />
              <Text style={[styles.badgeText, vm.isOnline ? styles.badgeTextLive : styles.badgeTextOffline]}>
                {vm.isOnline ? 'AO VIVO' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            {vm.isOnline
              ? `Veja a tela que o alfabetizando está vendo.${counterText ? ` ${counterText}` : ''}`
              : `Última tela registrada${formatTime(vm.lastUpdatedAt) ? ` às ${formatTime(vm.lastUpdatedAt)}` : ''}.${
                  counterText ? ` ${counterText}` : ''
                }`}
          </Text>

          {vm.isLocked ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedEyebrow}>PEDIDO DE APOIO ATIVO</Text>
              <Text style={styles.lockedText}>
                Este alfabetizando está com a tela bloqueada aguardando seu apoio.
              </Text>
            </View>
          ) : null}

          {showSpinner ? (
            <View style={styles.spinnerFrame}>
              <ActivityIndicator color="#111827" />
              <Text style={styles.spinnerText}>Carregando a tela do alfabetizando…</Text>
            </View>
          ) : (
            <MirrorScreenRenderer snapshot={snapshot} />
          )}

          {vm.errorMessage && !snapshot ? (
            <Text style={styles.errorText}>{vm.errorMessage}</Text>
          ) : null}

          {/* Orientação pedagógica variável por tipo de tela */}
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>Orientação para o(a) alfabetizador(a):</Text>
            <Text style={styles.guidanceText}>{guidance}</Text>
          </View>

          {/* Card "Está com dúvidas?" → tutorial do tipo de atividade */}
          <Pressable
            style={styles.hintCard}
            onPress={() => navigation.navigate('EducatorTutorials', { educatorId })}
            accessibilityRole="button"
          >
            <View style={styles.hintTextWrap}>
              <Text style={styles.hintTitle}>Está com dúvidas?</Text>
              <Text style={styles.hintText}>
                Confira o trecho do tutorial que explica sobre este tipo de atividade.
              </Text>
            </View>
            <View style={styles.playCircle}>
              <View style={styles.playTriangle} />
            </View>
          </Pressable>

          {/* Acesso discreto aos dados cadastrais (LIGAR/WHATSAPP/ATIVIDADE) */}
          <Pressable
            style={styles.dataLink}
            onPress={() =>
              learnerId &&
              navigation.navigate('EducatorLearningMode', {
                fullName: educatorName,
                educatorId,
                learnerName: route.params?.learnerName,
                learnerId,
              })
            }
            accessibilityRole="button"
          >
            <Text style={styles.dataLinkText}>DADOS DO ALFABETIZANDO →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EducatorBottomMenu
        active="acompanhar"
        onInicioPress={goHome}
        onTutorialPress={() => navigation.navigate('EducatorTutorials', { educatorId })}
        onAcompanharPress={goHome}
        onPontuacaoPress={goHome}
        onPerfilPress={() => navigation.navigate('EducatorProfile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ededed',
  },
  blockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#a5670f',
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  blockedCta: {
    marginTop: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  blockedCtaText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  blockedBack: {
    paddingVertical: 8,
  },
  blockedBackText: {
    color: '#666',
    fontWeight: '600',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
  body: {
    marginTop: 22,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeLive: {
    backgroundColor: '#e9f7ef',
  },
  badgeOffline: {
    backgroundColor: '#eceff3',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeDotLive: {
    backgroundColor: '#1f9d55',
  },
  badgeDotOffline: {
    backgroundColor: '#9aa3af',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextLive: {
    color: '#1f7a4d',
  },
  badgeTextOffline: {
    color: '#5f6b7a',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  lockedCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1c46b',
    backgroundColor: '#fff8d6',
    padding: 14,
  },
  lockedEyebrow: {
    color: '#8a6d00',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  lockedText: {
    color: '#4a3b00',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 5,
  },
  spinnerFrame: {
    borderWidth: 2,
    borderColor: '#d6dae0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 24,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  spinnerText: {
    color: '#6b7280',
    fontSize: 13,
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    lineHeight: 19,
  },
  guidanceCard: {
    backgroundColor: '#eef1f4',
    borderRadius: 10,
    padding: 14,
  },
  guidanceTitle: {
    color: '#20385f',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
  },
  guidanceText: {
    color: '#25313f',
    fontSize: 14,
    lineHeight: 21,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
  },
  hintTextWrap: {
    flex: 1,
  },
  hintTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  hintText: {
    color: '#555555',
    fontSize: 13,
    lineHeight: 18,
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
    marginLeft: 3,
  },
  dataLink: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  dataLinkText: {
    color: '#20385f',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
