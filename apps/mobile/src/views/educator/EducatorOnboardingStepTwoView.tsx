import { ReferenceCity, ReferenceUf } from '@letras/shared-types';
import { useAssets } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';

function isAtLeast14(dateStr: string): boolean {
  const parts = dateStr.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return false;
  const birth = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 14);
  return birth <= cutoff;
}
import { EducatorRootStackParamList } from '../../types';
type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorOnboardingStepTwo'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function maskDate(value: string) {
  const digits = normalizeDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDate(value: string) {
  const parts = value.split('/');
  if (parts.length !== 3) return false;
  if (parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) return false;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (year < 1900) return false;
  if (month < 1 || month > 12) return false;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }

  return date <= new Date();
}

export function EducatorOnboardingStepTwoView({ navigation, route }: Props) {
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [uf, setUf] = useState('');
  const [isUfSelectOpen, setIsUfSelectOpen] = useState(false);
  const [city, setCity] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [isCitySelectOpen, setIsCitySelectOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [ufs, setUfs] = useState<ReferenceUf[]>([]);
  const [cities, setCities] = useState<ReferenceCity[]>([]);
  const [isLoadingUfs, setIsLoadingUfs] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    let isMounted = true;

    const loadUfs = async () => {
      try {
        setIsLoadingUfs(true);
        setReferenceError(null);
        const fetchedUfs = await repository.fetchUfs();
        if (isMounted) {
          setUfs(fetchedUfs);
        }
      } catch (error) {
        if (isMounted) {
          setReferenceError(error instanceof Error ? error.message : 'Erro ao carregar UFs.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingUfs(false);
        }
      }
    };

    void loadUfs();

    return () => {
      isMounted = false;
    };
  }, [repository]);

  const sortedUfs = useMemo(
    () =>
      [...ufs].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', {
          sensitivity: 'base',
        }),
      ),
    [ufs],
  );

  const isUfValid = useMemo(() => sortedUfs.some((item) => item.code === uf), [sortedUfs, uf]);
  const selectedUf = useMemo(() => sortedUfs.find((item) => item.code === uf) ?? null, [sortedUfs, uf]);

  useEffect(() => {
    let isMounted = true;

    const loadCities = async () => {
      if (!isUfValid) {
        setCities([]);
        setSelectedCityId(null);
        return;
      }

      try {
        setIsLoadingCities(true);
        setReferenceError(null);
        const fetchedCities = await repository.fetchCitiesByUf(uf);
        if (isMounted) {
          setCities(fetchedCities);
        }
      } catch (error) {
        if (isMounted) {
          setReferenceError(error instanceof Error ? error.message : 'Erro ao carregar cidades.');
          setCities([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCities(false);
        }
      }
    };

    void loadCities();

    return () => {
      isMounted = false;
    };
  }, [isUfValid, repository, uf]);

  const filteredCities = useMemo(() => {
    if (!isUfValid) return [];
    const query = normalizeText(citySearch);
    if (!query) return cities.slice(0, 12);
    return cities.filter((item) => normalizeText(item.name).includes(query)).slice(0, 12);
  }, [cities, citySearch, isUfValid]);

  const isFullNameValid = useMemo(() => fullName.trim().split(/\s+/).length >= 2, [fullName]);
  const isBirthDateValid = useMemo(() => isValidDate(birthDate), [birthDate]);
  const isOldEnough = useMemo(
    () => !isBirthDateValid || isAtLeast14(birthDate),
    [birthDate, isBirthDateValid],
  );
  const isCityValid = useMemo(() => {
    if (!isUfValid || !selectedCityId) return false;
    return cities.some((item) => item.id === selectedCityId);
  }, [cities, isUfValid, selectedCityId]);

  const hasPhoto = Boolean(photoUri);
  const canProceed = isFullNameValid && isBirthDateValid && isOldEnough && isUfValid && isCityValid;

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos da permissão para acessar sua galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos da permissão da câmera para tirar a foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const openPhotoChooser = () => {
    Alert.alert('Foto do alfabetizador', 'Escolha como deseja adicionar a foto.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Upload', onPress: () => void pickImageFromGallery() },
      { text: 'Tirar foto', onPress: () => void takePhoto() },
    ]);
  };

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
          <Text style={styles.label}>Nome completo: *</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={[styles.input, fullName.length > 0 && !isFullNameValid ? styles.inputInvalid : null]}
            placeholder=""
            placeholderTextColor="#8f8f8f"
          />

          <Text style={styles.label}>Data de Nascimento: *</Text>
          <TextInput
            value={birthDate}
            onChangeText={(text) => setBirthDate(maskDate(text))}
            style={[styles.dateInput, birthDate.length > 0 && !isBirthDateValid ? styles.inputInvalid : null]}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#7a7a7a"
          />
          {isBirthDateValid && !isOldEnough ? (
            <Text style={styles.ageError}>Somente maiores de 14 anos podem se cadastrar (LGPD).</Text>
          ) : null}

          <Text style={styles.label}>UF *</Text>
          <Pressable
            style={[styles.ufRow, uf.length > 0 && !isUfValid ? styles.inputInvalid : null]}
            onPress={() => setIsUfSelectOpen((prev) => !prev)}
          >
            <Text style={[styles.ufValue, !selectedUf ? styles.ufPlaceholder : null]}>
              {selectedUf ? `${selectedUf.name} (${selectedUf.code})` : 'Selecione o estado'}
            </Text>
            <Text style={styles.ufArrow}>{isUfSelectOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {isUfSelectOpen ? (
            <View style={styles.ufList}>
              <ScrollView nestedScrollEnabled style={styles.ufListScroll}>
                {sortedUfs.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.ufListItem}
                    onPress={() => {
                      setUf(item.code);
                      setCity('');
                      setSelectedCityId(null);
                      setIsUfSelectOpen(false);
                      setIsCitySelectOpen(false);
                    }}
                  >
                    <Text style={styles.ufListItemText}>
                      {item.name} ({item.code})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {isLoadingUfs ? <Text style={styles.helperText}>Carregando UFs...</Text> : null}

          <Text style={styles.label}>Cidade: *</Text>
          <Pressable
            style={[styles.ufRow, city.length > 0 && !isCityValid ? styles.inputInvalid : null]}
            onPress={() => { if (isUfValid) setIsCitySelectOpen((prev) => !prev); }}
            disabled={!isUfValid || isLoadingCities}
          >
            <Text style={[styles.ufValue, !city ? styles.ufPlaceholder : null]}>
              {city || (isUfValid ? 'Selecione a cidade' : 'Selecione uma UF primeiro')}
            </Text>
            <Text style={styles.ufArrow}>{isCitySelectOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {isCitySelectOpen && isUfValid ? (
            <View style={styles.ufList}>
              <TextInput
                value={citySearch}
                onChangeText={setCitySearch}
                style={styles.citySearchInput}
                placeholder="Filtrar por nome..."
                placeholderTextColor="#8f8f8f"
                autoFocus
              />
              {isLoadingCities ? (
                <Text style={styles.helperText}>Carregando cidades...</Text>
              ) : (
                <ScrollView nestedScrollEnabled style={styles.ufListScroll}>
                  {filteredCities.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.ufListItem}
                      onPress={() => {
                        setCity(item.name);
                        setSelectedCityId(item.id);
                        setCitySearch('');
                        setIsCitySelectOpen(false);
                      }}
                    >
                      <Text style={styles.ufListItemText}>{item.name}</Text>
                    </Pressable>
                  ))}
                  {filteredCities.length === 0 && citySearch.length > 0 ? (
                    <Text style={styles.helperText}>Nenhuma cidade encontrada.</Text>
                  ) : null}
                </ScrollView>
              )}
            </View>
          ) : null}

          {referenceError ? <Text style={styles.errorText}>{referenceError}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="exemplo@dominio.com"
            placeholderTextColor="#8f8f8f"
          />

          <Text style={styles.photoLabel}>Faça o upload ou tire uma foto sua.</Text>

          <Pressable style={[styles.photoBox, hasPhoto ? styles.photoBoxSelected : null]} onPress={openPhotoChooser}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.photoPlaceholder}>Adicionar foto</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.advanceButton, !canProceed ? styles.advanceButtonDisabled : null]}
          disabled={!canProceed}
          onPress={() =>
            navigation.navigate('EducatorOnboardingStepThree', {
              cpf: route.params.cpf,
              phoneDigits: route.params.phoneDigits,
              email: email.trim() || undefined,
              fullName: fullName.trim(),
              birthDate,
              uf,
              city: city.trim(),
              photoUri,
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
    marginTop: 30,
    gap: 10,
  },
  label: {
    marginTop: 4,
    fontSize: 22 / 1.4,
    lineHeight: 22,
    color: '#141414',
    maxWidth: 320,
    fontWeight: '500',
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
  dateInput: {
    width: 132,
    height: 40,
    marginTop: 4,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    color: '#111111',
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'center',
  },
  ufRow: {
    width: 220,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  ufValue: {
    flex: 1,
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
  },
  ufPlaceholder: {
    color: '#6b7280',
    fontWeight: '500',
  },
  ufArrow: {
    fontSize: 12,
    color: '#8d8d8d',
    marginLeft: 6,
  },
  ufList: {
    borderWidth: 1,
    borderColor: '#d6d6d6',
    backgroundColor: '#f3f3f3',
    borderRadius: 4,
    maxHeight: 220,
  },
  ufListScroll: {
    maxHeight: 220,
  },
  ufListItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e7',
  },
  ufListItemText: {
    color: '#0f172a',
    fontSize: 14,
  },
  helperText: {
    color: '#475569',
    fontSize: 12,
    marginTop: -4,
  },
  citySearchInput: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#d6d6d6',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    color: '#111111',
    fontSize: 14,
  },
  ageError: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 2,
  },
  photoLabel: {
    marginTop: 6,
    fontSize: 16,
    color: '#141414',
    fontWeight: '400',
  },
  photoBox: {
    width: 92,
    height: 92,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxSelected: {
    borderWidth: 1,
    borderColor: '#1d4a8c',
  },
  photoPlaceholder: {
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
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
    marginTop: 40,
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
