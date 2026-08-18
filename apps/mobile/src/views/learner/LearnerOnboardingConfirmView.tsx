import { useAssets } from 'expo-asset';
import { BellIcon } from '../shared/BellIcon';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgUri } from 'react-native-svg';
import { LearnerSessionRepositoryImpl } from '../../data/repositories/learner-session-repository.impl';
import { SessionStorage } from '../../infra/storage/session-storage';
import { LearnerRootStackParamList } from '../../types';
import { useOptionalLearnerSession } from './learnerSessionContext';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerOnboardingConfirm'>;

function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length < 10) return digits;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isLocalFileUri(value?: string | null): value is string {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n.startsWith('file://') || n.startsWith('content://');
}

export function LearnerOnboardingConfirmView({ navigation, route }: Props) {
  const repository = useMemo(() => new LearnerSessionRepositoryImpl(), []);
  const session = useOptionalLearnerSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/confirmar.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const confirmUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;

  const data = route.params;
  const isEducatorFlow = Boolean(data.isEducatorFlow);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);

      const deviceId = await SessionStorage.getOrCreateLearnerDeviceId();

      let photoUri = data.photoUri ?? undefined;
      if (isLocalFileUri(data.photoUri)) {
        const { EducatorRepositoryImpl } = await import('../../data/repositories/educator-repository.impl');
        const educatorRepo = new EducatorRepositoryImpl();
        const uploaded = await educatorRepo.uploadImageAsset({
          uri: data.photoUri,
          title: `Foto ${data.fullName}`,
        });
        photoUri = uploaded.asset.sourceUrl;
      }

      let educatorId: string | undefined;
      if (isEducatorFlow) {
        const { EducatorStorage } = await import('../../infra/storage/educator-storage');
        const profile = await EducatorStorage.getAuthProfile();
        educatorId = profile?.id ?? undefined;
      }

      // Enviamos o educatorId para o backend GRAVAR a associação (metadata.educatorId),
      // mas ele NÃO cria vínculo (tutor_student_link) — isso é uma associação pendente.
      // Serve para o app do alfabetizando (Etapa 2, UnifiedLoginView) saber a quem pedir
      // o vínculo. O aceite/confirmação só acontece na Etapa 2 (EducatorSessionConfirmView).
      const profileId = await repository.registerLearner(
        {
          cpfOrPassport: data.cpfOrPassport,
          phoneDigits: data.phoneDigits,
          fullName: data.fullName,
          birthDate: data.birthDate,
          uf: data.uf,
          city: data.city,
          photoUri: photoUri ?? null,
          educatorId,
        },
        deviceId,
      );

      if (isEducatorFlow) {
        if (!educatorId) throw new Error('Sessão do alfabetizador não encontrada. Faça login novamente.');
        navigation.dispatch(
          CommonActions.navigate({
            name: 'LearnerThemeSelect',
            params: { learnerId: profileId, learnerName: data.fullName, educatorId },
          }),
        );
      } else {
        await SessionStorage.setLearnerProfileId(profileId);
        if (session) await session.initialize();
        navigation.reset({ index: 0, routes: [{ name: 'LearnerHome' }] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.';
      if (message.includes('409') || message.toLowerCase().includes('ja existe') || message.toLowerCase().includes('já existe')) {
        Alert.alert('Cadastro existente', 'Este CPF/passaporte já possui cadastro. Entre em contato com seu alfabetizador.');
        return;
      }
      Alert.alert('Erro no cadastro', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {logoUri ? (
              <SvgUri uri={logoUri} width={84} height={50} />
            ) : (
              <ActivityIndicator size="small" color="#111827" />
            )}
          </View>
          <Pressable style={styles.notificationButton} onPress={() => {}}>
            <BellIcon size={22} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.infoLine}>Celular: {formatPhone(data.phoneDigits)}</Text>
          <Text style={styles.infoLine}>Nome completo: {data.fullName}</Text>
          <Text style={styles.infoLine}>CPF ou Passaporte: {data.cpfOrPassport}</Text>
          <Text style={styles.infoLine}>Data de Nascimento: {data.birthDate}</Text>
          <Text style={styles.infoLine}>Cidade: {data.city}</Text>
          <Text style={styles.infoLine}>UF: {data.uf}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Image source={require('../../../assets/voltar.png')} style={styles.arrowIcon} resizeMode="contain" />
            <Text style={styles.actionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, isSubmitting ? styles.actionButtonDisabled : null]}
            onPress={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#101010" />
            ) : confirmUri ? (
              <View style={styles.iconCrop}>
                <SvgUri uri={confirmUri} width={72} height={62} />
              </View>
            ) : (
              <ActivityIndicator size="small" color="#101010" />
            )}
            <Text style={styles.actionLabel}>CONFIRMAR</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
    backgroundColor: '#ededed',
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
  badge: {
    position: 'absolute',
    right: 1,
    top: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  body: {
    marginTop: 40,
    gap: 4,
  },
  infoLine: {
    fontSize: 15,
    lineHeight: 26,
    color: '#141414',
  },
  actions: {
    marginTop: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 56,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 90,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  iconCrop: {
    width: 72,
    height: 62,
    overflow: 'hidden',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 15,
    color: '#101010',
    letterSpacing: 0.2,
    fontWeight: '500',
  },
});
