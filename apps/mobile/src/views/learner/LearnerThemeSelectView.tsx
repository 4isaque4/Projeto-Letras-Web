import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from 'expo-asset';
import { SvgUri } from 'react-native-svg';
import { Theme } from '@letras/shared-types';
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';
import { EducatorRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'LearnerThemeSelect'>;

export function LearnerThemeSelectView({ navigation, route }: Props) {
  const { learnerId, learnerName, educatorId } = route.params;
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const [assets] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await repository.fetchThemes();
        if (isMounted) setThemes(data);
      } catch (error) {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'Erro ao carregar temas.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [repository]);

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null;
  const canProceed = selectedTheme !== null;

  const handleNext = () => {
    if (!selectedTheme) return;
    navigation.navigate('LearnerThemeConfirm', {
      learnerId,
      learnerName,
      educatorId,
      themeId: selectedTheme.id,
      themeName: selectedTheme.name,
      themeDescription: selectedTheme.description,
    });
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
          <Text style={styles.screenTitle}>Seleciona tema</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#20385f" style={styles.loader} />
          ) : loadError ? (
            <Text style={styles.errorText}>{loadError}</Text>
          ) : (
            <>
              <Text style={styles.instruction}>Selecione o tema para esta alfabetização:</Text>
              <View style={styles.themeList}>
                {themes.map((theme) => (
                  <Pressable
                    key={theme.id}
                    style={[
                      styles.themeItem,
                      selectedThemeId === theme.id ? styles.themeItemSelected : null,
                    ]}
                    onPress={() => setSelectedThemeId(theme.id)}
                  >
                    <View style={[styles.radio, selectedThemeId === theme.id ? styles.radioSelected : null]} />
                    <Text style={styles.themeItemText}>{theme.name}</Text>
                  </Pressable>
                ))}
                {themes.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum tema disponível no momento.</Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={() => navigation.goBack()}>
            <Image source={require('../../../assets/voltar.png')} style={styles.arrowIcon} resizeMode="contain" />
            <Text style={styles.actionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, !canProceed ? styles.actionButtonDisabled : null]}
            disabled={!canProceed}
            onPress={handleNext}
          >
            <Image source={require('../../../assets/avancar.png')} style={styles.arrowIcon} resizeMode="contain" />
            <Text style={styles.actionLabel}>AVANÇAR</Text>
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
    paddingBottom: 60,
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
    marginTop: 30,
    gap: 16,
  },
  screenTitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  instruction: {
    fontSize: 16,
    color: '#141414',
    lineHeight: 24,
  },
  themeList: {
    gap: 2,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d6d6d6',
  },
  themeItemSelected: {
    backgroundColor: '#e8eef7',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#20385f',
  },
  radioSelected: {
    backgroundColor: '#20385f',
  },
  themeItemText: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 56,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 90,
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  actionLabel: {
    fontSize: 15,
    color: '#101010',
    letterSpacing: 0.2,
    fontWeight: '500',
  },
});
