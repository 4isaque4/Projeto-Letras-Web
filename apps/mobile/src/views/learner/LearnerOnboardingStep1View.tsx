import { useAssets } from 'expo-asset';
import { useMemo, useState } from 'react';
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
import { BellIcon } from '../shared/BellIcon';
import { LearnerRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerOnboardingStep1'>;

// — helpers copiados do EducatorSplashView —

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function sanitizePhone(value: string) {
  return normalizeDigits(value).slice(0, 11);
}

function formatBrazilPhone(digits: string) {
  const ddd = digits.slice(0, 2);
  const first = digits.slice(2, 7);
  const second = digits.slice(7, 11);
  return `(${ddd}) ${first}-${second}`;
}

// — CPF: máscara 000.000.000-00 (14 chars quando completo) —

function maskCpf(value: string) {
  const digits = normalizeDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isAllDigits(value: string) {
  return /^\d+$/.test(value.replace(/[.\-\s]/g, ''));
}

export function LearnerOnboardingStep1View({ navigation, route }: Props) {
  const isEducatorFlow = Boolean(route.params?.isEducatorFlow);

  // CPF armazena o valor mascarado; passaporte armazena como digitado
  const [cpfOrPassport, setCpfOrPassport] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/avançar.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const forwardUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;

  const looksLikeCpf = useMemo(
    () => isAllDigits(cpfOrPassport) && normalizeDigits(cpfOrPassport).length <= 11,
    [cpfOrPassport],
  );

  const isCpfOrPassportValid = useMemo(() => {
    if (looksLikeCpf) return normalizeDigits(cpfOrPassport).length === 11;
    return cpfOrPassport.trim().length >= 6;
  }, [cpfOrPassport, looksLikeCpf]);

  const phoneValue = useMemo(
    () => (phoneDigits.length === 11 ? formatBrazilPhone(phoneDigits) : phoneDigits),
    [phoneDigits],
  );

  const isPhoneValid = useMemo(() => phoneDigits.length === 11, [phoneDigits]);

  const canProceed = isCpfOrPassportValid && isPhoneValid;

  const handleCpfChange = (text: string) => {
    if (isAllDigits(text.replace(/[.\-]/g, '')) || text === '') {
      setCpfOrPassport(maskCpf(text));
    } else {
      setCpfOrPassport(text.toUpperCase().slice(0, 20));
    }
  };

  const showCpfError = cpfOrPassport.length > 0 && !isCpfOrPassportValid;
  const showPhoneError = phoneDigits.length > 0 && !isPhoneValid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : null} style={styles.backButton}>
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
          <Pressable style={styles.notificationButton} onPress={() => {}}>
            <BellIcon size={22} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.fieldLabel}>Insira o CPF ou passaporte da pessoa que será alfabetizada.</Text>
          <TextInput
            value={cpfOrPassport}
            onChangeText={handleCpfChange}
            style={[styles.input, showCpfError ? styles.inputInvalid : null]}
            placeholder="000.000.000-00"
            placeholderTextColor="#7a7a7a"
            keyboardType="default"
            autoCapitalize="characters"
          />
          {showCpfError ? (
            <Text style={styles.errorText}>
              {looksLikeCpf ? 'CPF deve ter 11 dígitos.' : 'Passaporte deve ter pelo menos 6 caracteres.'}
            </Text>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>
            Insira o número do celular da pessoa que será alfabetizada.
          </Text>
          <TextInput
            value={phoneValue}
            onChangeText={(text) => setPhoneDigits(sanitizePhone(text))}
            style={[styles.input, showPhoneError ? styles.inputInvalid : null]}
            keyboardType="phone-pad"
            placeholder="(XX) XXXXX-XXXX"
            placeholderTextColor="#7a7a7a"
          />
          {showPhoneError ? (
            <Text style={styles.errorText}>Celular deve ter 11 dígitos (DDD + número).</Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.advanceButton, !canProceed ? styles.advanceButtonDisabled : null]}
          disabled={!canProceed}
          onPress={() =>
            navigation.navigate('LearnerOnboardingStep2', {
              cpfOrPassport: cpfOrPassport.trim(),
              phoneDigits,
              ...(isEducatorFlow ? { isEducatorFlow: true } : {}),
            })
          }
        >
          {forwardUri ? (
            <SvgUri uri={forwardUri} width={64} height={40} />
          ) : (
            <ActivityIndicator size="small" color="#20385f" />
          )}
          <Text style={styles.advanceLabel}>AVANÇAR</Text>
        </Pressable>
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
    marginTop: 36,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 22,
    color: '#141414',
    fontWeight: '400',
  },
  input: {
    height: 38,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 12,
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
  inputInvalid: {
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: -2,
  },
  advanceButton: {
    marginTop: 48,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  advanceButtonDisabled: {
    opacity: 0.35,
  },
  advanceLabel: {
    fontSize: 17,
    lineHeight: 21,
    color: '#101010',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
});
