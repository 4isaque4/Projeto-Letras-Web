import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, HinaMincho_400Regular } from '@expo-google-fonts/hina-mincho';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { RootNavigator } from './src/navigation/RootNavigator';

// Desativa cursor de texto em elementos não editáveis no web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = [
    '* { user-select: none; -webkit-user-select: none; cursor: default; }',
    'input, textarea, [contenteditable] {',
    '  user-select: text !important;',
    '  -webkit-user-select: text !important;',
    '  cursor: text !important;',
    '}',
  ].join('\n');
  document.head.appendChild(style);
}

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    enableLogs: true,
  });
}

const linking = {
  prefixes: ['https://mobile.letras.cloud', 'mobile.letras.cloud://'],
  config: {
    screens: {
      UnifiedLogin: '',
      EducatorFlow: {
        path: 'educador',
        screens: {
          EducatorLoading: '',
          EducatorLogin: 'login',
          EducatorSplash: 'cadastro',
          EducatorProfile: 'perfil',
          EducatorOnboardingStepTwo: 'cadastro/passo-2',
          EducatorOnboardingStepThree: 'cadastro/passo-3',
          EducatorOnboardingConfirm: 'cadastro/confirmar',
          EducatorHome: 'inicio',
          EducatorLearningMode: 'alfabetizando/:learnerId',
          LearnerOnboardingStep1: 'novo-aluno/passo-1',
          LearnerOnboardingStep2: 'novo-aluno/passo-2',
          LearnerOnboardingConfirm: 'novo-aluno/confirmar',
          EducatorEtapa1Lessons: {
            path: 'etapa-1/:learnerId',
            screens: {
              LearnerHome: '',
              LearnerLessonIntro: 'aula/:lessonId',
              LearnerLessonScreen: 'aula/:lessonId/tela/:screenIndex',
              LearnerLessonActivity: 'aula/:lessonId/atividade/:screenIndex',
              LearnerLessonConclusion: 'aula/:lessonId/conclusao',
              LearnerStageConclusion: 'conclusao',
            },
          },
        },
      },
      LearnerFlow: {
        path: 'aluno',
        screens: {
          LearnerLoading: '',
          LearnerOnboardingStep1: 'cadastro/passo-1',
          LearnerOnboardingStep2: 'cadastro/passo-2',
          LearnerOnboardingConfirm: 'cadastro/confirmar',
          LearnerHome: 'inicio',
          LearnerProfile: 'perfil',
          LearnerLessonIntro: 'aula/:lessonId',
          LearnerLessonScreen: 'aula/:lessonId/tela/:screenIndex',
          LearnerLessonActivity: 'aula/:lessonId/atividade/:screenIndex',
          LearnerLessonConclusion: 'aula/:lessonId/conclusao',
        },
      },
    },
  },
};

export default Sentry.wrap(function App() {
  const [fontsLoaded] = useFonts({ HinaMincho_400Regular });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.loadingText}>Carregando Letras...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  loadingText: {
    color: '#222222',
    fontSize: 15,
  },
});
