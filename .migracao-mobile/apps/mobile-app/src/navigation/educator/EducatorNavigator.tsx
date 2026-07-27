import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { EducatorLoadingView } from '../../views/educator/EducatorLoadingView';
import { EducatorLoginView } from '../../views/educator/EducatorLoginView';
import { EducatorSplashView } from '../../views/educator/EducatorSplashView';
import { EducatorProfileView } from '../../views/educator/EducatorProfileView';
import { EducatorOnboardingStepTwoView } from '../../views/educator/EducatorOnboardingStepTwoView';
import { EducatorOnboardingStepThreeView } from '../../views/educator/EducatorOnboardingStepThreeView';
import { EducatorOnboardingConfirmView } from '../../views/educator/EducatorOnboardingConfirmView';
import { EducatorLearningModeView } from '../../views/educator/EducatorLearningModeView';
import { EducatorLiveMirrorView } from '../../views/educator/EducatorLiveMirrorView';
import { EducatorComparativoView } from '../../views/educator/EducatorComparativoView';
import { EducatorHomeView } from '../../views/educator/EducatorHomeView';
import { EducatorScoreView } from '../../views/educator/EducatorScoreView';
import { EducatorScoreRulesView } from '../../views/educator/EducatorScoreRulesView';
import { EducatorTutoriaisView } from '../../views/educator/EducatorTutoriaisView';
import { EducatorEtapa1LessonsView } from '../../views/educator/EducatorEtapa1LessonsView';
import { EducatorNotificacoesView } from '../../views/educator/EducatorNotificacoesView';
import { EducatorSessionConfirmView } from '../../views/educator/EducatorSessionConfirmView';
import { LearnerOnboardingStep1View } from '../../views/learner/LearnerOnboardingStep1View';
import { LearnerOnboardingStep2View } from '../../views/learner/LearnerOnboardingStep2View';
import { LearnerOnboardingConfirmView } from '../../views/learner/LearnerOnboardingConfirmView';
import { LearnerThemeSelectView } from '../../views/learner/LearnerThemeSelectView';
import { LearnerThemeConfirmView } from '../../views/learner/LearnerThemeConfirmView';
import { EducatorRootStackParamList } from '../../types';

const Stack = createNativeStackNavigator<EducatorRootStackParamList>();

export function EducatorNavigator() {
  return (
    <Stack.Navigator initialRouteName="EducatorLoading">
      <Stack.Screen
        name="EducatorLoading"
        component={EducatorLoadingView}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="EducatorLogin"
        component={EducatorLoginView}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="EducatorSplash"
        component={EducatorSplashView}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="EducatorProfile"
        component={EducatorProfileView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EducatorOnboardingStepTwo"
        component={EducatorOnboardingStepTwoView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EducatorOnboardingStepThree"
        component={EducatorOnboardingStepThreeView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EducatorOnboardingConfirm"
        component={EducatorOnboardingConfirmView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LearnerOnboardingStep1"
        component={LearnerOnboardingStep1View as React.ComponentType<object>}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LearnerOnboardingStep2"
        component={LearnerOnboardingStep2View as React.ComponentType<object>}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LearnerOnboardingConfirm"
        component={LearnerOnboardingConfirmView as React.ComponentType<object>}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorHome"
        component={EducatorHomeView}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="EducatorTutorials"
        component={EducatorTutoriaisView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorNotificacoes"
        component={EducatorNotificacoesView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorLearningMode"
        component={EducatorLearningModeView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EducatorLiveMirror"
        component={EducatorLiveMirrorView}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EducatorComparativo"
        component={EducatorComparativoView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LearnerThemeSelect"
        component={LearnerThemeSelectView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LearnerThemeConfirm"
        component={LearnerThemeConfirmView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorScore"
        component={EducatorScoreView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorScoreRules"
        component={EducatorScoreRulesView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorEtapa1Lessons"
        component={EducatorEtapa1LessonsView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducatorSessionConfirm"
        component={EducatorSessionConfirmView}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
