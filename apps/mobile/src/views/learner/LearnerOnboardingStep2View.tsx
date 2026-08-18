import { ReferenceCity, ReferenceUf } from '@letras/shared-types';
import { useAssets } from 'expo-asset';
import { BellIcon } from '../shared/BellIcon';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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
import { LearnerRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerOnboardingStep2'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date()
  );
}

export function LearnerOnboardingStep2View({ navigation, route }: Props) {
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [uf, setUf] = useState('');
  const [isUfSelectOpen, setIsUfSelectOpen] = useState(false);
  const [city, setCity] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [isCityAutocompleteOpen, setIsCityAutocompleteOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [ufs, setUfs] = useState<ReferenceUf[]>([]);
  const [cities, setCities] = useState<ReferenceCity[]>([]);
  const [isLoadingUfs, setIsLoadingUfs] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    let isMounted = true;
    const loadUfs = async () => {
      try {
        setIsLoadingUfs(true);
        setReferenceError(null);
        const fetchedUfs = await repository.fetchUfs();
        if (isMounted) setUfs(fetchedUfs);
      } catch (error) {
        if (isMounted) setReferenceError(error instanceof Error ? error.message : 'Erro ao carregar UFs.');
      } finally {
        if (isMounted) setIsLoadingUfs(false);
      }
    };
    void loadUfs();
    return () => { isMounted = false; };
  }, [repository]);

  const sortedUfs = useMemo(
    () => [...ufs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
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
        if (isMounted) setCities(fetchedCities);
      } catch (error) {
        if (isMounted) {
          setReferenceError(error instanceof Error ? error.message : 'Erro ao carregar cidades.');
          setCities([]);
        }
      } finally {
        if (isMounted) setIsLoadingCities(false);
      }
    };
    void loadCities();
    return () => { isMounted = false; };
  }, [isUfValid, repository, uf]);

  const filteredCities = useMemo(() => {
    if (!isUfValid) return [];
    const query = normalizeText(city);
    if (!query) return cities.slice(0, 8);
    return cities.filter((item) => normalizeText(item.name).includes(query)).slice(0, 8);
  }, [cities, city, isUfValid]);

  const isFullNameValid = useMemo(() => fullName.trim().split(/\s+/).length >= 2, [fullName]);
  const isBirthDateValid = useMemo(() => isValidDate(birthDate), [birthDate]);
  const isCityValid = useMemo(() => {
    if (!isUfValid || !selectedCityId) return false;
    return cities.some((item) => item.id === selectedCityId && normalizeText(item.name) === normalizeText(city));
  }, [cities, city, isUfValid, selectedCityId]);

  const canProceed = isFullNameValid && isBirthDateValid && isUfValid && isCityValid;

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
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
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
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const openPhotoChooser = () => {
    const options: Array<{ text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void }> = [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Upload', onPress: () => void pickImageFromGallery() },
    ];
    if (Platform.OS !== 'web') {
      options.push({ text: 'Tirar foto', onPress: () => void takePhoto() });
    }
    Alert.alert('Foto do alfabetizando', 'Escolha como deseja adicionar a foto.', options);
  };

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
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={[styles.input, fullName.length > 0 && !isFullNameValid ? styles.inputInvalid : null]}
            placeholder=""
            placeholderTextColor="#8f8f8f"
          />

          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            value={birthDate}
            onChangeText={(text) => setBirthDate(maskDate(text))}
            style={[styles.dateInput, birthDate.length > 0 && !isBirthDateValid ? styles.inputInvalid : null]}
            keyboardType="number-pad"
            placeholder="DD / MM / AAAA"
            placeholderTextColor="#7a7a7a"
          />

          <Text style={styles.label}>UF</Text>
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
                      setIsCityAutocompleteOpen(false);
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

          <Text style={styles.label}>Cidade</Text>
          <TextInput
            value={city}
            onChangeText={(text) => {
              setCity(text);
              setSelectedCityId(null);
              setIsCityAutocompleteOpen(true);
            }}
            style={[styles.input, city.length > 0 && !isCityValid ? styles.inputInvalid : null]}
            placeholder={isUfValid ? 'Digite a cidade' : 'Selecione uma UF primeiro'}
            placeholderTextColor="#8f8f8f"
            editable={isUfValid && !isLoadingCities}
            onFocus={() => { if (isUfValid) setIsCityAutocompleteOpen(true); }}
          />

          {isLoadingCities ? <Text style={styles.helperText}>Carregando cidades...</Text> : null}

          {!isLoadingCities && isUfValid && isCityAutocompleteOpen && filteredCities.length > 0 ? (
            <View style={styles.cityList}>
              {filteredCities.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.cityListItem}
                  onPress={() => {
                    setCity(item.name);
                    setSelectedCityId(item.id);
                    setIsCityAutocompleteOpen(false);
                  }}
                >
                  <Text style={styles.cityListItemText}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!isLoadingCities && isUfValid && isCityAutocompleteOpen && filteredCities.length === 0 && city.length > 0 ? (
            <Text style={styles.helperText}>Nenhuma cidade encontrada para esse termo.</Text>
          ) : null}

          {referenceError ? <Text style={styles.errorText}>{referenceError}</Text> : null}

          <Text style={styles.photoLabel}>Faça o upload ou tire uma foto do alfabetizando.</Text>
          <Pressable
            style={[styles.photoBox, photoUri ? styles.photoBoxSelected : null]}
            onPress={openPhotoChooser}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : null}
          </Pressable>
        </View>

        <Pressable
          style={[styles.advanceButton, !canProceed ? styles.advanceButtonDisabled : null]}
          disabled={!canProceed}
          onPress={() =>
            navigation.navigate('LearnerOnboardingConfirm', {
              cpfOrPassport: route.params.cpfOrPassport,
              phoneDigits: route.params.phoneDigits,
              fullName: fullName.trim(),
              birthDate,
              uf,
              city: city.trim(),
              photoUri,
              ...(route.params.isEducatorFlow ? { isEducatorFlow: true } : {}),
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
    marginTop: 30,
    gap: 10,
  },
  label: {
    marginTop: 4,
    fontSize: 22 / 1.4,
    lineHeight: 22,
    color: '#141414',
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
    width: 160,
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
  cityList: {
    backgroundColor: '#f3f3f3',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dddddd',
    maxHeight: 180,
  },
  cityListItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e7',
  },
  cityListItemText: {
    color: '#0f172a',
    fontSize: 14,
  },
  photoLabel: {
    marginTop: 6,
    fontSize: 15,
    color: '#141414',
    fontWeight: '400',
    lineHeight: 22,
  },
  photoBox: {
    width: 78,
    height: 78,
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
  arrowIcon: {
    width: 64,
    height: 54,
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
  advanceLabel: {
    fontSize: 17,
    lineHeight: 21,
    color: '#101010',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
});
