import { useCallback } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStorage } from '../../infra/storage/session-storage';
import { LearnerRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerLoading'>;

const LOCAL_PROFILE_PREFIX = 'learner-local-profile';

export function LearnerLoadingView({ navigation }: Props) {
  useFocusEffect(
    useCallback(() => {
      // Guard contra o quirk do React Navigation onde useFocusEffect pode
      // disparar brevemente mesmo quando outra tela (ex: LearnerSessionPending)
      // está no topo da pilha durante a inicialização do navigator aninhado.
      const { routes, index } = navigation.getState();
      if (routes[index]?.name !== 'LearnerLoading') return;

      SessionStorage.getLearnerProfileId().then((id) => {
        const hasRealProfile = Boolean(id && !id.startsWith(`${LOCAL_PROFILE_PREFIX}-`));
        if (hasRealProfile) {
          navigation.replace('LearnerHome');
        } else {
          navigation.getParent()?.navigate('UnifiedLogin' as never);
        }
      });
    }, [navigation]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#111111" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ededed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
