import { useMemo, useState } from 'react';
import { useAssets } from 'expo-asset';
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
import { httpClient } from '../../infra/api/http-client';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { EducatorRootStackParamList } from '../../types';
type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorLogin'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isValidCpf(value: string) {
  return normalizeDigits(value).length === 11;
}

export function EducatorLoginView({ navigation }: Props) {
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const isIdentifierValid = useMemo(() => isValidCpf(identifier), [identifier]);
  const canLogin = isIdentifierValid && !isSubmitting;

  const handleLogin = async () => {
    if (!canLogin) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const auth = await repository.loginEducator(identifier.trim());
      await EducatorStorage.saveAuthSession(auth.token, auth.expiresAt, auth.educator);
      httpClient.setAuthToken(auth.token);
      navigation.replace('EducatorHome', {
        fullName: auth.educator.fullName,
        educatorId: auth.educator.id,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoWrap}>
          {logoUri ? <SvgUri uri={logoUri} width={94} height={56} /> : <ActivityIndicator size="small" color="#111" />}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>Entrar no Letras</Text>
          <Text style={styles.subtitle}>Use seu CPF para continuar.</Text>

          <Text style={styles.label}>CPF *</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            style={[styles.input, identifier.length > 0 && !isIdentifierValid ? styles.inputInvalid : null]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            placeholder="CPF (11 digitos)"
            placeholderTextColor="#7a7a7a"
          />

          <Pressable
            style={[styles.loginButton, !canLogin ? styles.loginButtonDisabled : null]}
            onPress={() => void handleLogin()}
            disabled={!canLogin}
          >
            {isSubmitting ? <ActivityIndicator size="small" color="#f5f5f5" /> : <Text style={styles.loginButtonText}>ENTRAR</Text>}
          </Pressable>

          <Pressable style={styles.registerLink} onPress={() => navigation.navigate('EducatorSplash')}>
            <Text style={styles.registerLinkText}>Primeiro acesso? Fazer cadastro</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
    fontSize: 29 / 1.4,
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
