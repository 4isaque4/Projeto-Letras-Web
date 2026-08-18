import { useState } from 'react';
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
type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorOnboardingStepThree'>;

const EDUCATION_LEVELS = [
  'Fundamental incompleto',
  'Fundamental completo',
  'Medio incompleto',
  'Medio completo',
  'Superior incompleto',
  'Superior completo',
  'Pos-graduacao',
  'Mestrado',
  'Doutorado',
] as const;

export function EducatorOnboardingStepThreeView({ navigation, route }: Props) {
  const [educationLevel, setEducationLevel] = useState('');
  const [isEducationSelectOpen, setIsEducationSelectOpen] = useState(false);
  const [trainingArea, setTrainingArea] = useState('');

  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [xHandle, setXHandle] = useState('');

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  const canProceed = true;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
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

        </View>

        <View style={styles.body}>
          <Text style={styles.infoOptional}>Todas as informações nessa tela são opcionais.</Text>

          <Text style={styles.label}>Grau de Escolaridade</Text>
          <Pressable
            style={styles.selectField}
            onPress={() => setIsEducationSelectOpen((prev) => !prev)}
          >
            <Text style={[styles.selectText, !educationLevel ? styles.placeholderText : null]}>
              {educationLevel || 'Selecione'}
            </Text>
            <Text style={styles.arrow}>{isEducationSelectOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {isEducationSelectOpen ? (
            <View style={styles.selectList}>
              <ScrollView nestedScrollEnabled style={styles.selectListScroll}>
                {EDUCATION_LEVELS.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.selectItem}
                    onPress={() => {
                      setEducationLevel(item);
                      setIsEducationSelectOpen(false);
                    }}
                  >
                    <Text style={styles.selectItemText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.label}>Área de Formação</Text>
          <TextInput
            value={trainingArea}
            onChangeText={setTrainingArea}
            style={styles.input}
            placeholder=""
            placeholderTextColor="#8f8f8f"
          />

          <Text style={styles.infoText}>
            Informe suas redes sociais. Você poderá divulgar as conquistas de seus alfabetizandos.
          </Text>

          <View style={styles.socialRow}>
            <Image source={require('../../../assets/social-linkedin.png')} style={styles.socialIcon} resizeMode="contain" />
            <TextInput value={linkedin} onChangeText={setLinkedin} style={styles.socialInput} placeholder="LinkedIn" placeholderTextColor="#9ca3af" />
          </View>

          <View style={styles.socialRow}>
            <Image source={require('../../../assets/social-facebook.png')} style={styles.socialIcon} resizeMode="contain" />
            <TextInput value={facebook} onChangeText={setFacebook} style={styles.socialInput} placeholder="Facebook" placeholderTextColor="#9ca3af" />
          </View>

          <View style={styles.socialRow}>
            <Image source={require('../../../assets/social-instagram.png')} style={styles.socialIcon} resizeMode="contain" />
            <TextInput value={instagram} onChangeText={setInstagram} style={styles.socialInput} placeholder="Instagram" placeholderTextColor="#9ca3af" />
          </View>

          <View style={styles.socialRow}>
            <Image source={require('../../../assets/social-x.png')} style={styles.socialIcon} resizeMode="contain" />
            <TextInput value={xHandle} onChangeText={setXHandle} style={styles.socialInput} placeholder="X (Twitter)" placeholderTextColor="#9ca3af" />
          </View>
        </View>

        <Pressable
          style={[styles.advanceButton, !canProceed ? styles.advanceButtonDisabled : null]}
          disabled={!canProceed}
          onPress={() =>
            navigation.navigate('EducatorOnboardingConfirm', {
              cpf: route.params.cpf,
              phoneDigits: route.params.phoneDigits,
              email: route.params.email,
              fullName: route.params.fullName,
              birthDate: route.params.birthDate,
              uf: route.params.uf,
              city: route.params.city,
              photoUri: route.params.photoUri,
              educationLevel: educationLevel || undefined,
              trainingArea: trainingArea.trim() || undefined,
              linkedin: linkedin.trim() || undefined,
              facebook: facebook.trim() || undefined,
              instagram: instagram.trim() || undefined,
              xHandle: xHandle.trim() || undefined,
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
    paddingTop: 28,
    paddingBottom: 32,
    backgroundColor: '#ededed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontSize: 15, color: '#20385f', fontWeight: '500' },
  logoWrap: {
    minHeight: 50,
    justifyContent: 'center',
  },
  body: {
    marginTop: 34,
    gap: 10,
  },
  infoOptional: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 4,
  },
  label: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: '#141414',
    fontWeight: '500',
  },
  selectField: {
    height: 38,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  selectText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#6b7280',
  },
  arrow: {
    color: '#8d8d8d',
    fontSize: 12,
    marginLeft: 8,
  },
  selectList: {
    borderWidth: 1,
    borderColor: '#d6d6d6',
    backgroundColor: '#f3f3f3',
    borderRadius: 4,
    maxHeight: 220,
  },
  selectListScroll: {
    maxHeight: 220,
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e7',
  },
  selectItemText: {
    color: '#0f172a',
    fontSize: 14,
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
  infoText: {
    marginTop: 10,
    color: '#1f2937',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
  },
  socialRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialIcon: {
    width: 26,
    height: 26,
  },
  socialInput: {
    flex: 1,
    height: 32,
    borderRadius: 1,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 10,
    color: '#111111',
    fontSize: 14,
  },
  inputInvalid: {
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  advanceButton: {
    marginTop: 44,
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
