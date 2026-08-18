import { useAssets } from 'expo-asset';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgUri } from 'react-native-svg';
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';
import { LearnerSessionRepositoryImpl } from '../../data/repositories/learner/learner-session-repository.impl';
import { httpClient } from '../../infra/api/http-client';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { SessionStorage } from '../../infra/storage/session-storage';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedLogin'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function maskCpf(value: string) {
  const d = normalizeDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isAllDigits(value: string) {
  return /^\d+$/.test(value.replace(/[.\-\s]/g, ''));
}

function isNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('(404)') || msg.includes('não encontrado') || msg.includes('not found');
}

export function UnifiedLoginView({ navigation }: Props) {
  const learnerRepo = useMemo(() => new LearnerSessionRepositoryImpl(), []);
  const educatorRepo = useMemo(() => new EducatorRepositoryImpl(), []);

  const [ready, setReady] = useState(false);
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  // Restore existing session on mount
  useEffect(() => {
    (async () => {
      const educatorToken = await EducatorStorage.getAuthToken();
      if (educatorToken) {
        httpClient.setAuthToken(educatorToken);
        navigation.replace('EducatorFlow');
        return;
      }
      const learnerId = await SessionStorage.getLearnerProfileId();
      if (learnerId && !learnerId.startsWith('learner-local-profile-')) {
        navigation.replace('LearnerFlow');
        return;
      }
      setReady(true);
    })();
  }, [navigation]);

  const looksLikeCpf = useMemo(
    () => isAllDigits(cpf) && normalizeDigits(cpf).length <= 11,
    [cpf],
  );

  const isValid = useMemo(() => {
    if (!cpf) return false;
    if (looksLikeCpf) return normalizeDigits(cpf).length === 11;
    return cpf.trim().length >= 6;
  }, [cpf, looksLikeCpf]);

  const handleChange = (text: string) => {
    setErrorMessage(null);
    if (isAllDigits(text.replace(/[.\-]/g, '')) || text === '') {
      setCpf(maskCpf(text));
    } else {
      setCpf(text.toUpperCase().slice(0, 20));
    }
  };

  const handleEntrar = useCallback(async () => {
    if (!isValid || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const query = looksLikeCpf ? normalizeDigits(cpf) : cpf.trim().toUpperCase();

    try {
      // 1. Busca como alfabetizando (apenas o lookup — erros de sessão ficam fora deste bloco)
      let learner: Awaited<ReturnType<typeof learnerRepo.lookupLearner>> | null = null;
      try {
        learner = await learnerRepo.lookupLearner(query, undefined);
      } catch (learnerError) {
        if (!isNotFoundError(learnerError)) throw learnerError;
      }

      if (learner) {
        if (!learner.educator) {
          // Alfabetizando sem educador vinculado: não pode acessar
          setErrorMessage(
            'Você ainda não foi cadastrado por um alfabetizador. Procure seu alfabetizador para que ele faça seu cadastro no aplicativo.',
          );
          return;
        }

        const request = await learnerRepo.createSessionRequest({
          learnerProfileId: learner.id,
          educatorId: learner.educator.id,
        });

        // Se o vínculo JÁ está confirmado (aluno voltando a entrar), não repetimos a
        // tela "Notificação enviada… / Vinculação realizada com sucesso". Entra direto.
        const isConfirmed = ['confirmado', 'confirmed'].includes(
          String(request.status ?? '').toLowerCase(),
        );
        if (isConfirmed) {
          await SessionStorage.setLearnerProfileId(learner.id);
          navigation.reset({ index: 0, routes: [{ name: 'LearnerFlow' }] });
          return;
        }

        // Vínculo pendente (primeiro acesso): mostra a tela de espera com polling.
        navigation.navigate('LearnerFlow', {
          screen: 'LearnerSessionPending',
          params: {
            requestId: request.id,
            learnerProfileId: learner.id,
            educatorId: learner.educator.id,
            educatorName: learner.educator.name,
            learnerName: learner.displayName,
            educatorPhone: learner.educator.phoneDigits ?? undefined,
          },
        });
        return;
      }

      // 2. Não é alfabetizando — tenta como educador
      const auth = await educatorRepo.loginEducator(query);
      await EducatorStorage.saveAuthSession(auth.token, auth.expiresAt, auth.educator);
      httpClient.setAuthToken(auth.token);
      navigation.navigate('EducatorFlow', {
        screen: 'EducatorHome',
        params: { fullName: auth.educator.fullName, educatorId: auth.educator.id },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const isCredentials =
        msg.includes('401') ||
        msg.includes('Credenciais') ||
        msg.includes('credenciais') ||
        isNotFoundError(error);
      setErrorMessage(
        isCredentials
          ? 'CPF não encontrado. Verifique os dados ou fale com seu educador.'
          : msg || 'Não foi possível entrar.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [cpf, educatorRepo, isLoading, isValid, learnerRepo, looksLikeCpf, navigation]);

  if (!ready) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          {logoUri ? (
            <SvgUri uri={logoUri} width={94} height={56} />
          ) : (
            <ActivityIndicator size="small" color="#111" />
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>Entrar no Letras</Text>
          <Text style={styles.subtitle}>Use seu CPF para continuar.</Text>

          <Text style={styles.label}>CPF *</Text>
          <TextInput
            value={cpf}
            onChangeText={handleChange}
            style={[styles.input, cpf.length > 0 && !isValid ? styles.inputInvalid : null]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            placeholder="CPF (11 dígitos)"
            placeholderTextColor="#7a7a7a"
            autoFocus
          />

          <Pressable
            style={[styles.loginButton, (!isValid || isLoading) ? styles.loginButtonDisabled : null]}
            onPress={() => void handleEntrar()}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#f5f5f5" />
            ) : (
              <Text style={styles.loginButtonText}>ENTRAR</Text>
            )}
          </Pressable>

          {/* Cadastro na tela de login = SÓ alfabetizador. O alfabetizando é
              cadastrado PELO alfabetizador (nunca se auto-cadastra). Leva ao
              onboarding do educador (EducatorSplash). Entrar direto em
              EducatorSplash não dispara o reset da EducatorLoading — ela tem
              guard por rota do topo (espelha a LearnerLoadingView). */}
          <Pressable
            style={styles.registerLink}
            onPress={() => navigation.navigate('EducatorFlow', { screen: 'EducatorSplash' })}
            accessibilityRole="button"
            accessibilityLabel="Primeiro acesso? Fazer cadastro"
          >
            <Text style={styles.registerLinkText}>Primeiro acesso? Fazer cadastro</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: '#ededed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ededed',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: '#ededed',
  },
  logoWrap: {
    minHeight: 56,
    justifyContent: 'center',
  },
  body: {
    marginTop: 58,
  },
  title: {
    fontSize: 21,
    lineHeight: 30,
    color: '#111111',
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    color: '#333333',
    maxWidth: 320,
  },
  label: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#101010',
    fontWeight: '500',
  },
  input: {
    height: 42,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 12,
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
  inputInvalid: {
    borderWidth: 1,
    borderColor: '#9e1b1b',
  },
  loginButton: {
    marginTop: 32,
    height: 46,
    borderRadius: 3,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.4,
  },
  loginButtonText: {
    color: '#f5f5f5',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  registerLink: {
    marginTop: 18,
    alignSelf: 'center',
  },
  registerLinkText: {
    color: '#1f2937',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorText: {
    marginTop: 14,
    color: '#9e1b1b',
    fontSize: 13,
    textAlign: 'center',
  },
});
