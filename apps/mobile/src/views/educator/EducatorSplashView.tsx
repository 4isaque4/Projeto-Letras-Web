import { useMemo, useState } from 'react';
import { useAssets } from 'expo-asset';
import {
  ActivityIndicator,
  Image,
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
import { EducatorRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorSplash'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function sanitizeCpf(value: string) {
  return normalizeDigits(value).slice(0, 11);
}

function sanitizePhone(value: string) {
  return normalizeDigits(value).slice(0, 11);
}

function formatBrazilPhone(digits: string) {
  const ddd = digits.slice(0, 2);
  const firstBlock = digits.slice(2, 7);
  const secondBlock = digits.slice(7, 11);
  return `(${ddd}) ${firstBlock}-${secondBlock}`;
}

export function EducatorSplashView({ navigation }: Props) {
  const [cpf, setCpf] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const isCpfValid = useMemo(() => cpf.length === 11, [cpf]);
  const isPhoneValid = useMemo(() => phoneDigits.length === 11, [phoneDigits]);
  const phoneValue = useMemo(
    () => (phoneDigits.length === 11 ? formatBrazilPhone(phoneDigits) : phoneDigits),
    [phoneDigits],
  );
  const canProceed = isCpfValid && isPhoneValid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : null} style={styles.backButton}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>
          <View style={styles.logoWrap}>
            {logoUri ? (
              <SvgUri uri={logoUri} width={84} height={50} />
            ) : (
              <ActivityIndicator size="small" color="#111827" />
            )}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.paragraph}>
            Receba nossas boas-vindas. É muito bom ter você neste projeto. Vamos unir forças e transformar a vida de
            pessoas.
          </Text>

          <Text style={styles.label}>Para começar, informe seu CPF ou passaporte: *</Text>
          <TextInput
            value={cpf}
            onChangeText={(text) => setCpf(sanitizeCpf(text))}
            style={[styles.input, cpf.length > 0 && !isCpfValid ? styles.inputInvalid : null]}
            keyboardType="number-pad"
            placeholder="Somente números (11 dígitos)"
            placeholderTextColor="#8f8f8f"
          />

          <Text style={styles.label}>Insira o número do celular que você utilizará para alfabetizar e transformar vidas. *</Text>
          <TextInput
            value={phoneValue}
            onChangeText={(text) => setPhoneDigits(sanitizePhone(text))}
            style={[styles.input, phoneDigits.length > 0 && !isPhoneValid ? styles.inputInvalid : null]}
            keyboardType="number-pad"
            placeholder="(XX) XXXXX-XXXX"
            placeholderTextColor="#5d5d5d"
          />
        </View>

        <Pressable
          style={[styles.advanceButton, !canProceed ? styles.advanceButtonDisabled : null]}
          disabled={!canProceed}
          onPress={() =>
            navigation.navigate('EducatorOnboardingStepTwo', {
              cpf,
              phoneDigits,
            })
          }
        >
          <Image source={require('../../../assets/avancar.png')} style={styles.arrowIcon} resizeMode="contain" />
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
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: '#ededed',
  },
  header: {
    flexDirection: 'column',
    gap: 8,
  },
  backButton: {
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    color: '#20385f',
    fontWeight: '500',
  },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  body: {
    marginTop: 58,
    gap: 16,
  },
  paragraph: {
    fontSize: 18,
    lineHeight: 31,
    color: '#141414',
    maxWidth: 310,
    fontWeight: '400',
  },
  label: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 28,
    color: '#141414',
    maxWidth: 315,
    fontWeight: '500',
  },
  input: {
    height: 40,
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
  advanceButton: {
    marginTop: 56,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  advanceButtonDisabled: {
    opacity: 0.35,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  advanceLabel: {
    fontSize: 17,
    lineHeight: 21,
    color: '#101010',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
});
