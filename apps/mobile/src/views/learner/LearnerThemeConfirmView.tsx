import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { EducatorRepositoryImpl } from '../../data/repositories/educator-repository.impl';
import { EducatorRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'LearnerThemeConfirm'>;

export function LearnerThemeConfirmView({ navigation, route }: Props) {
  const { learnerId, learnerName, educatorId, themeId, themeName, themeDescription } = route.params;
  const repository = useMemo(() => new EducatorRepositoryImpl(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assets] = useAssets([
    require('../../../assets/Logo-LETRAS.svg'),
    require('../../../assets/confirmar.svg'),
  ]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  const confirmUri = assets?.[1]?.localUri ?? assets?.[1]?.uri;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await repository.assignTheme(learnerId, themeId);

      // Abre direto o runner da Etapa 1 do tema recém-atribuído; tema sem
      // conteúdo cai no empty state do runner ("configure no painel").
      navigation.reset({
        index: 0,
        routes: [{
          name: 'EducatorEtapa1Lessons' as never,
          params: {
            learnerId,
            learnerName,
            educatorId,
            themeId,
          } as never,
        }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atribuir o tema.';
      Alert.alert('Erro', message);
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.screenTitle}>Confirmação de tema</Text>

          <Text style={styles.selectedText}>
            Você selecionou o tema <Text style={styles.bold}>{themeName}</Text>.
          </Text>

          {themeDescription ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>Indicação do tema:</Text>
              <Text style={styles.descriptionText}>{themeDescription}</Text>
            </View>
          ) : null}

          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Uma vez iniciada a alfabetização, não será possível trocar de tema. Você confirma sua escolha de tema?
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Image source={require('../../../assets/voltar.png')} style={styles.arrowIcon} resizeMode="contain" />
            <Text style={styles.actionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, isSubmitting ? styles.actionButtonDisabled : null]}
            onPress={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#101010" />
            ) : confirmUri ? (
              <View style={styles.iconCrop}>
                <SvgUri uri={confirmUri} width={72} height={62} />
              </View>
            ) : (
              <ActivityIndicator size="small" color="#101010" />
            )}
            <Text style={styles.actionLabel}>CONFIRMAR</Text>
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
    gap: 20,
  },
  screenTitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedText: {
    fontSize: 16,
    color: '#141414',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#111111',
  },
  descriptionCard: {
    backgroundColor: '#e4e4e4',
    borderRadius: 6,
    padding: 14,
    gap: 6,
  },
  descriptionLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 15,
    color: '#141414',
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#fff7ea',
    borderWidth: 1,
    borderColor: '#f2c387',
    borderRadius: 6,
    padding: 14,
  },
  warningText: {
    fontSize: 15,
    color: '#7d4b07',
    lineHeight: 22,
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
    opacity: 0.5,
  },
  arrowIcon: {
    width: 64,
    height: 54,
  },
  iconCrop: {
    width: 72,
    height: 62,
    overflow: 'hidden',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 15,
    color: '#101010',
    letterSpacing: 0.2,
    fontWeight: '500',
  },
});
