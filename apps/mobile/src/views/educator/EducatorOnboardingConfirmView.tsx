import { useMemo, useState } from 'react';
import { useAssets } from 'expo-asset';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgUri } from 'react-native-svg';
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';
import { httpClient } from '../../infra/api/http-client';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { EducatorRootStackParamList } from '../../types';
type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorOnboardingConfirm'>;

function formatPhoneFromDigits(digits: string) {
  const onlyDigits = digits.replace(/\D/g, '').slice(0, 11);
  if (onlyDigits.length !== 11) return digits;
  return `(${onlyDigits.slice(0, 2)}) ${onlyDigits.slice(2, 7)}-${onlyDigits.slice(7)}`;
}

function isLocalFileUri(value?: string | null): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('file://') || normalized.startsWith('content://');
}

export function EducatorOnboardingConfirmView({ navigation, route }: Props) {
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/confirmar.svg'),
  ]);

  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const confirmUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;

  const data = route.params;

  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedPhotoUri = data.photoUri ?? undefined;
      if (isLocalFileUri(data.photoUri)) {
        const uploaded = await repository.uploadImageAsset({
          uri: data.photoUri,
          title: `Foto ${data.fullName}`,
        });
        uploadedPhotoUri = uploaded.asset.sourceUrl;
      }

      const auth = await repository.registerEducator({
        fullName: data.fullName,
        cpf: data.cpf,
        email: data.email,
        phoneDigits: data.phoneDigits,
        birthDate: data.birthDate,
        uf: data.uf,
        city: data.city,
        photoUri: uploadedPhotoUri,
        educationLevel: data.educationLevel,
        trainingArea: data.trainingArea,
        linkedin: data.linkedin,
        facebook: data.facebook,
        instagram: data.instagram,
        xHandle: data.xHandle,
      });

      await EducatorStorage.saveAuthSession(auth.token, auth.expiresAt, auth.educator);
      httpClient.setAuthToken(auth.token);
      navigation.replace('EducatorHome', {
        fullName: data.fullName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.';
      if (message.includes('409') || message.toLowerCase().includes('ja existe')) {
        Alert.alert('Cadastro existente', 'Este CPF/e-mail já possui cadastro. Faça login na tela inicial.');
        navigation.replace('EducatorLogin');
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

        </View>

        <View style={styles.body}>
          <Text style={styles.infoLine}>Celular: {formatPhoneFromDigits(data.phoneDigits)}</Text>
          <Text style={styles.infoLine}>Nome completo: {data.fullName}</Text>
          <Text style={styles.infoLine}>CPF ou Passaporte: {data.cpf}</Text>
          {data.email ? <Text style={styles.infoLine}>Email: {data.email}</Text> : null}
          <Text style={styles.infoLine}>Data de Nascimento: {data.birthDate}</Text>
          <Text style={styles.infoLine}>Cidade: {data.city}</Text>
          <Text style={styles.infoLine}>UF: {data.uf}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={() => navigation.goBack()}>
            <Image source={require('../../../assets/voltar.png')} style={styles.backIconCrop} resizeMode="contain" />
            <Text style={styles.actionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#101010" />
            ) : confirmUri ? (
              <View style={styles.confirmIconCrop}>
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
    paddingBottom: 32,
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
  backIconCrop: {
    width: 64,
    height: 54,
  },
  confirmIconCrop: {
    width: 58,
    height: 42,
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
