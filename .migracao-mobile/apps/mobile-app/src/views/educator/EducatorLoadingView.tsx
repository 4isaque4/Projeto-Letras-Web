import { useEffect } from 'react';
import { useAssets } from 'expo-asset';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgUri } from 'react-native-svg';
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';
import { httpClient } from '../../infra/api/http-client';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorLoading'>;

const LOADING_DURATION_MS = 1800;

export function EducatorLoadingView({ navigation }: Props) {
  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    const repository = new EducatorRepositoryImpl();

    const timer = setTimeout(() => {
      void (async () => {
        // Guard: só age quando EducatorLoading é a rota do topo (splash de
        // restauração de sessão). Se o usuário entrou no EducatorFlow direto
        // numa tela acima — ex.: EducatorSplash (cadastro do alfabetizador
        // vindo da tela de login) — não reseta para o login. Espelha o guard
        // da LearnerLoadingView.
        const { routes, index } = navigation.getState();
        if (routes[index]?.name !== 'EducatorLoading') return;

        const token = await EducatorStorage.getAuthToken();
        const expiresAt = await EducatorStorage.getAuthSessionExpiry();

        if (!token || !expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
          await EducatorStorage.clearAuthSession();
          httpClient.setAuthToken(null);
          // Sessão inválida: volta para o login unificado (CPF), não para o
          // login de educador — o acesso é unificado para os dois perfis.
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'UnifiedLogin' }] });
          return;
        }

        httpClient.setAuthToken(token);

        try {
          const me = await repository.fetchCurrentEducator();
          await EducatorStorage.saveAuthSession(token, me.expiresAt, me.educator);
          navigation.replace('EducatorHome', {
            fullName: me.educator.fullName,
            educatorId: me.educator.id,
          });
        } catch {
          await EducatorStorage.clearAuthSession();
          httpClient.setAuthToken(null);
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'UnifiedLogin' }] });
        }
      })();
    }, LOADING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {logoUri ? (
        <>
          <SvgUri uri={logoUri} width={220} height={128} />
          <Text style={styles.subtitle}>Alfabetizador</Text>
        </>
      ) : (
        <ActivityIndicator size="small" color="#111827" />
      )}
      <EducatorBottomMenu active="inicio" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ededed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.4,
  },
});
