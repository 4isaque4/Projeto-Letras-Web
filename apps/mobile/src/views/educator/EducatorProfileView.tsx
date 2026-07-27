import { ReferenceCity, ReferenceUf } from '@letras/shared-types';
import { useAssets } from 'expo-asset';
import { EducatorBell } from '../shared/EducatorBell';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { CommonActions } from '@react-navigation/native';
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
import { httpClient } from '../../infra/api/http-client';
import { EducatorStorage } from '../../infra/storage/educator-storage';
import { EducatorRootStackParamList } from '../../types';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorProfile'>;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function maskDate(value: string) {
  const digits = normalizeDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatBrazilPhone(digits: string) {
  const normalized = normalizeDigits(digits).slice(0, 11);
  if (normalized.length <= 2) {
    return normalized;
  }
  if (normalized.length <= 7) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2)}`;
  }
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isLocalFileUri(value?: string | null): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('file://') || normalized.startsWith('content://');
}

export function EducatorProfileView({ navigation }: Props) {
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [uf, setUf] = useState('');
  const [city, setCity] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [trainingArea, setTrainingArea] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [educatorId, setEducatorId] = useState<string | null>(null);

  const [ufs, setUfs] = useState<ReferenceUf[]>([]);
  const [cities, setCities] = useState<ReferenceCity[]>([]);
  const [isUfOpen, setIsUfOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingUfs, setIsLoadingUfs] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/confirmar.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const confirmUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;

  const sortedUfs = useMemo(
    () =>
      [...ufs].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', {
          sensitivity: 'base',
        }),
      ),
    [ufs],
  );
  const selectedUf = useMemo(() => sortedUfs.find((item) => item.code === uf) ?? null, [sortedUfs, uf]);
  const sortedCities = useMemo(
    () =>
      [...cities].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', {
          sensitivity: 'base',
        }),
      ),
    [cities],
  );

  const isFullNameValid = fullName.trim().length >= 2;
  const isCpfValid = cpf.length === 11;
  const isPhoneValid = phoneDigits.length === 11;
  const isUfValid = uf.length === 2;
  const isCityValid = city.trim().length >= 2;
  const canSave = isFullNameValid && isCpfValid && isPhoneValid && isUfValid && isCityValid && !isSaving;

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        setErrorMessage(null);

        // Restaura token do AsyncStorage se não estiver em memória.
        // Garante que a tela funcione ao ser acessada diretamente pela URL.
        const storedToken = await EducatorStorage.getAuthToken();
        const storedExpiry = await EducatorStorage.getAuthSessionExpiry();
        const isTokenValid = storedToken && storedExpiry && new Date(storedExpiry).getTime() > Date.now();

        if (isTokenValid) {
          httpClient.setAuthToken(storedToken);
        } else {
          // Sem token válido — redireciona para login
          if (mounted) {
            navigation.getParent()?.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'UnifiedLogin' }] }),
            );
          }
          return;
        }

        const [me, fetchedUfs] = await Promise.all([
          repository.fetchCurrentEducator(),
          repository.fetchUfs(),
        ]);

        if (!mounted) {
          return;
        }

        setUfs(fetchedUfs);

        setFullName(me.educator.fullName ?? '');
        setEducatorId(me.educator.id ?? null);
        setCpf((me.educator.cpf ?? '').replace(/\D/g, '').slice(0, 11));
        setPhoneDigits((me.educator.phoneDigits ?? '').replace(/\D/g, '').slice(0, 11));
        setBirthDate(me.educator.birthDate ?? '');
        setUf((me.educator.uf ?? '').trim().toUpperCase());
        setCity(me.educator.city ?? '');
        setPhotoUri(me.educator.photoUri ?? null);
        setEducationLevel(me.educator.educationLevel ?? '');
        setTrainingArea(me.educator.trainingArea ?? '');
        setLinkedin(me.educator.linkedin ?? '');
        setFacebook(me.educator.facebook ?? '');
        setInstagram(me.educator.instagram ?? '');
        setXHandle(me.educator.xHandle ?? '');
      } catch (error) {
        if (mounted) {
          // Se ainda falhar, usa os dados em cache do AsyncStorage como fallback
          const cached = await EducatorStorage.getAuthProfile();
          if (cached) {
            setFullName(cached.fullName ?? '');
            setEducatorId(cached.id ?? null);
            setCpf((cached.cpf ?? '').replace(/\D/g, '').slice(0, 11));
            setPhoneDigits((cached.phoneDigits ?? '').replace(/\D/g, '').slice(0, 11));
            setErrorMessage(null);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Erro ao carregar perfil.');
          }
        }
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
          setIsLoadingUfs(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      mounted = false;
    };
  }, [repository]);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      if (!uf || uf.length !== 2) {
        setCities([]);
        return;
      }

      try {
        setIsLoadingCities(true);
        const fetchedCities = await repository.fetchCitiesByUf(uf);
        if (!mounted) {
          return;
        }

        setCities(fetchedCities);
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Erro ao carregar cidades.');
          setCities([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingCities(false);
        }
      }
    };

    void loadCities();

    return () => {
      mounted = false;
    };
  }, [repository, uf]);

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos da permissao para acessar sua galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos da permissao da camera para tirar a foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
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

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setStatusMessage(null);

      let uploadedPhotoUri = photoUri;
      if (isLocalFileUri(photoUri)) {
        const uploaded = await repository.uploadImageAsset({
          uri: photoUri,
          title: `Foto ${fullName.trim() || 'Alfabetizador'}`,
          createdByEducatorId: educatorId ?? undefined,
        });
        uploadedPhotoUri = uploaded.asset.sourceUrl;
      }

      const response = await repository.updateEducatorProfile({
        fullName: fullName.trim(),
        cpf,
        phoneDigits,
        birthDate: birthDate.trim(),
        uf,
        city: city.trim(),
        photoUri: uploadedPhotoUri,
        educationLevel: educationLevel.trim(),
        trainingArea: trainingArea.trim(),
        linkedin: linkedin.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        xHandle: xHandle.trim(),
      });

      const token = await EducatorStorage.getAuthToken();
      if (token) {
        await EducatorStorage.saveAuthSession(token, response.expiresAt, response.educator);
      }

      setFullName(response.educator.fullName ?? '');
      setCpf((response.educator.cpf ?? '').replace(/\D/g, '').slice(0, 11));
      setPhoneDigits((response.educator.phoneDigits ?? '').replace(/\D/g, '').slice(0, 11));
      setBirthDate(response.educator.birthDate ?? '');
      setUf((response.educator.uf ?? '').trim().toUpperCase());
      setCity(response.educator.city ?? '');
      setPhotoUri(response.educator.photoUri ?? uploadedPhotoUri ?? null);
      setEducationLevel(response.educator.educationLevel ?? '');
      setTrainingArea(response.educator.trainingArea ?? '');
      setLinkedin(response.educator.linkedin ?? '');
      setFacebook(response.educator.facebook ?? '');
      setInstagram(response.educator.instagram ?? '');
      setXHandle(response.educator.xHandle ?? '');

      setStatusMessage('Perfil salvo com sucesso.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await repository.logoutEducator();
    } catch {
      // No-op: local cleanup still proceeds.
    } finally {
      await EducatorStorage.clearAuthSession();
      httpClient.setAuthToken(null);
      navigation.getParent()?.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'UnifiedLogin' }] }),
      );
    }
  };

  const phoneValue = formatBrazilPhone(phoneDigits);
  const cityList = sortedCities.filter((item) => {
    if (!city.trim()) return true;
    return normalizeText(item.name).includes(normalizeText(city));
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : <ActivityIndicator size="small" color="#111827" />}
          </View>

          <EducatorBell educatorId={educatorId ?? undefined} />
        </View>

        {isLoadingProfile ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color="#101010" />
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.label}>CPF ou passaporte</Text>
            <TextInput
              value={cpf}
              onChangeText={(value) => setCpf(normalizeDigits(value).slice(0, 11))}
              style={[styles.input, cpf.length > 0 && !isCpfValid ? styles.inputInvalid : null]}
              keyboardType="number-pad"
              placeholder="XXX.XXX.XXX-XX"
              placeholderTextColor="#8f8f8f"
            />

            <Text style={styles.label}>Celular:</Text>
            <TextInput
              value={phoneValue}
              onChangeText={(value) => setPhoneDigits(normalizeDigits(value).slice(0, 11))}
              style={[styles.input, phoneDigits.length > 0 && !isPhoneValid ? styles.inputInvalid : null]}
              keyboardType="number-pad"
              placeholder="(XX) XXXXX-XXXX"
              placeholderTextColor="#8f8f8f"
            />

            <Text style={styles.label}>Nome completo:</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, fullName.length > 0 && !isFullNameValid ? styles.inputInvalid : null]}
              placeholder="Nome completo"
              placeholderTextColor="#8f8f8f"
            />

            <Text style={styles.label}>Foto:</Text>
            <Pressable style={styles.photoBox} onPress={openPhotoChooser}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={styles.photoText}>Adicionar foto</Text>
              )}
            </Pressable>

            <Text style={styles.label}>Data de Nascimento:</Text>
            <TextInput
              value={birthDate}
              onChangeText={(value) => setBirthDate(maskDate(value))}
              style={styles.dateInput}
              placeholder="XX/XX/XXXX"
              placeholderTextColor="#8f8f8f"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>UF</Text>
            <Pressable style={styles.selectField} onPress={() => setIsUfOpen((prev) => !prev)}>
              <Text style={[styles.selectText, !selectedUf ? styles.placeholderText : null]}>
                {selectedUf?.code ?? 'XX'}
              </Text>
              <Text style={styles.arrow}>{isUfOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isUfOpen ? (
              <View style={styles.selectList}>
                <ScrollView nestedScrollEnabled style={styles.selectListScroll}>
                  {isLoadingUfs ? (
                    <ActivityIndicator size="small" color="#101010" />
                  ) : (
                    sortedUfs.map((item) => (
                      <Pressable
                        key={item.code}
                        style={styles.selectItem}
                        onPress={() => {
                          setUf(item.code);
                          setCity('');
                          setIsUfOpen(false);
                          setIsCityOpen(false);
                        }}
                      >
                        <Text style={styles.selectItemText}>
                          {item.code} - {item.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.label}>Cidade</Text>
            <Pressable style={styles.selectField} onPress={() => setIsCityOpen((prev) => !prev)} disabled={!uf}>
              <Text style={[styles.selectText, !city ? styles.placeholderText : null]}>
                {city || (uf ? 'Selecione a cidade' : 'Selecione uma UF primeiro')}
              </Text>
              <Text style={styles.arrow}>{isCityOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isCityOpen && uf ? (
              <View style={styles.selectList}>
                <ScrollView nestedScrollEnabled style={styles.selectListScroll}>
                  {isLoadingCities ? (
                    <ActivityIndicator size="small" color="#101010" />
                  ) : (
                    cityList.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.selectItem}
                        onPress={() => {
                          setCity(item.name);
                          setIsCityOpen(false);
                        }}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.label}>Grau de Escolaridade</Text>
            <TextInput
              value={educationLevel}
              onChangeText={setEducationLevel}
              style={styles.input}
              placeholder=""
              placeholderTextColor="#8f8f8f"
            />

            <Text style={styles.label}>Area de Formacao:</Text>
            <TextInput
              value={trainingArea}
              onChangeText={setTrainingArea}
              style={styles.input}
              placeholder=""
              placeholderTextColor="#8f8f8f"
            />

            <Text style={styles.label}>Redes Sociais:</Text>
            <View style={styles.socialRow}>
              <View style={styles.socialIcon}>
                <Text style={styles.socialIconText}>in</Text>
              </View>
              <TextInput
                value={linkedin}
                onChangeText={setLinkedin}
                style={styles.socialInput}
                placeholder="@xxxxxxx"
                placeholderTextColor="#8f8f8f"
              />
            </View>
            <View style={styles.socialRow}>
              <View style={styles.socialIcon}>
                <Text style={styles.socialIconText}>f</Text>
              </View>
              <TextInput
                value={facebook}
                onChangeText={setFacebook}
                style={styles.socialInput}
                placeholder="@xxxxxxx"
                placeholderTextColor="#8f8f8f"
              />
            </View>
            <View style={styles.socialRow}>
              <View style={styles.socialIcon}>
                <Text style={styles.socialIconText}>ig</Text>
              </View>
              <TextInput
                value={instagram}
                onChangeText={setInstagram}
                style={styles.socialInput}
                placeholder="@xxxxxxx"
                placeholderTextColor="#8f8f8f"
              />
            </View>
            <View style={styles.socialRow}>
              <View style={styles.socialIcon}>
                <Text style={styles.socialIconText}>x</Text>
              </View>
              <TextInput
                value={xHandle}
                onChangeText={setXHandle}
                style={styles.socialInput}
                placeholder="@xxxxxxx"
                placeholderTextColor="#8f8f8f"
              />
            </View>

            <Pressable
              style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
              onPress={() => void handleSave()}
              disabled={!canSave}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#101010" />
              ) : confirmUri ? (
                <View style={styles.confirmIconCrop}>
                  <SvgUri uri={confirmUri} width={70} height={64} />
                </View>
              ) : (
                <ActivityIndicator size="small" color="#101010" />
              )}
              <Text style={styles.saveLabel}>SALVAR</Text>
            </Pressable>

            <Pressable style={styles.logoutButton} onPress={() => void handleLogout()}>
              <Text style={styles.logoutLabel}>LOG OUT</Text>
            </Pressable>

            {statusMessage ? <Text style={styles.successText}>{statusMessage}</Text> : null}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        )}
      </ScrollView>

      <EducatorBottomMenu
        active="perfil"
        onInicioPress={() => navigation.navigate('EducatorHome', { fullName: fullName.trim() || 'Alfabetizador', educatorId: educatorId ?? undefined })}
        onTutorialPress={() => navigation.navigate('EducatorSplash')}
        onAcompanharPress={() => navigation.navigate('EducatorHome', { fullName: fullName.trim() || 'Alfabetizador', educatorId: educatorId ?? undefined })}
        onPontuacaoPress={() => navigation.navigate('EducatorHome', { fullName: fullName.trim() || 'Alfabetizador', educatorId: educatorId ?? undefined })}
        onPerfilPress={() => navigation.navigate('EducatorProfile')}
      />
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
    paddingBottom: 130,
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
  loadingBlock: {
    marginTop: 120,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#222222',
    fontSize: 14,
  },
  body: {
    marginTop: 20,
    gap: 6,
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    color: '#141414',
    fontWeight: '500',
  },
  input: {
    height: 34,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 10,
    color: '#101010',
    fontSize: 14,
  },
  dateInput: {
    width: 110,
    height: 34,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 10,
    color: '#101010',
    fontSize: 14,
  },
  inputInvalid: {
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  photoBox: {
    width: 74,
    height: 86,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  selectField: {
    height: 34,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  selectText: {
    color: '#101010',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#7a7a7a',
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
    maxHeight: 180,
  },
  selectListScroll: {
    maxHeight: 180,
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
  },
  selectItemText: {
    fontSize: 14,
    color: '#121212',
  },
  socialRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  socialIconText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  socialInput: {
    flex: 1,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#e4e4e4',
    paddingHorizontal: 10,
    color: '#101010',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    gap: 4,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  confirmIconCrop: {
    width: 52,
    height: 38,
    overflow: 'hidden',
    alignItems: 'center',
  },
  saveLabel: {
    color: '#101010',
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 4,
  },
  logoutLabel: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  successText: {
    marginTop: 12,
    color: '#0b6b3a',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#9e1b1b',
    fontSize: 12,
    textAlign: 'center',
  },
});
