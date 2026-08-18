import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EducatorRootStackParamList } from '../../types';
import { TutoriaisContent } from './components/TutoriaisContent';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorTutorials'>;

export function EducatorTutoriaisView({ navigation, route }: Props) {
  const [educatorId, setEducatorId] = useState<string | undefined>(route.params?.educatorId);

  useEffect(() => {
    if (educatorId) return;
    void (async () => {
      const { EducatorStorage } = await import('../../infra/storage/educator-storage');
      const profile = await EducatorStorage.getAuthProfile();
      if (profile?.id) setEducatorId(profile.id);
    })();
  }, [educatorId]);

  return (
    <TutoriaisContent
      educatorId={educatorId}
      navigation={navigation}
    />
  );
}
