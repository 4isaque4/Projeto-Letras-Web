import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LearnerRootStackParamList } from '../../types';
import { LearnerLoadingView } from '../../views/learner/LearnerLoadingView';
import { LearnerSessionPendingView } from '../../views/learner/LearnerSessionPendingView';
import { LearnerOnboardingStep1View } from '../../views/learner/LearnerOnboardingStep1View';
import { LearnerOnboardingStep2View } from '../../views/learner/LearnerOnboardingStep2View';
import { LearnerOnboardingConfirmView } from '../../views/learner/LearnerOnboardingConfirmView';
import { LearnerHomeView } from '../../views/learner/LearnerHomeView';
import { LearnerTutoriaisView } from '../../views/learner/LearnerTutoriaisView';
import { LearnerPontuacaoView } from '../../views/learner/LearnerPontuacaoView';
import { LearnerStageConclusionView } from '../../views/learner/LearnerStageConclusionView';
import { LearnerProfileView } from '../../views/learner/LearnerProfileView';
import { LearnerLessonIntroView } from '../../views/learner/LearnerLessonIntroView';
import { LearnerLessonScreenView } from '../../views/learner/LearnerLessonScreenView';
import { LearnerLessonActivityView } from '../../views/learner/LearnerLessonActivityView';
import { LearnerLessonConclusionView } from '../../views/learner/LearnerLessonConclusionView';
import { LearnerPhotoReviewView } from '../../views/learner/LearnerPhotoReviewView';
import { LearnerSessionProvider } from '../../views/learner/learnerSessionContext';

const Stack = createNativeStackNavigator<LearnerRootStackParamList>();

export function LearnerNavigator() {
  return (
    <LearnerSessionProvider>
      <Stack.Navigator initialRouteName="LearnerLoading">
        <Stack.Screen
          name="LearnerLoading"
          component={LearnerLoadingView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerSessionPending"
          component={LearnerSessionPendingView}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="LearnerOnboardingStep1"
          component={LearnerOnboardingStep1View}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerOnboardingStep2"
          component={LearnerOnboardingStep2View}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerOnboardingConfirm"
          component={LearnerOnboardingConfirmView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerHome"
          component={LearnerHomeView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerTutorials"
          component={LearnerTutoriaisView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerScore"
          component={LearnerPontuacaoView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerStageConclusion"
          component={LearnerStageConclusionView}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="LearnerProfile"
          component={LearnerProfileView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerLessonIntro"
          component={LearnerLessonIntroView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerLessonScreen"
          component={LearnerLessonScreenView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerLessonActivity"
          component={LearnerLessonActivityView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerLessonConclusion"
          component={LearnerLessonConclusionView}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearnerPhotoReview"
          component={LearnerPhotoReviewView}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </LearnerSessionProvider>
  );
}
