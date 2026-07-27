import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LearnerRootStackParamList } from '../../types';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';
import { useLearnerSession } from './learnerSessionContext';
import { httpClient } from '../../infra/api/http-client';
import { playErrorBeep, playSuccessBeep } from './exerciseSounds';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerPhotoReview'>;

// Figma "Etapas 2 e 3 - Foto do exercício": foto grande, dois botões verdes
// de câmera (FAZER OUTRA FOTO / ENVIAR FOTO). Sem texto além dos rótulos.

function CameraIcon({ withArrow = false }: { withArrow?: boolean }) {
  return (
    <Svg width={44} height={34} viewBox="0 0 52 38" fill="none">
      <Rect x={2} y={8} width={38} height={28} rx={4} fill="#2fa536" />
      <Path d="M13 8 L16 2 H28 L31 8" fill="#2fa536" />
      <Circle cx={21} cy={22} r={8} fill="#ffffff" />
      <Circle cx={21} cy={22} r={4.5} fill="#2fa536" />
      {withArrow ? <Path d="M42 18 H48 M48 18 L44.5 14.5 M48 18 L44.5 21.5" stroke="#2fa536" strokeWidth={3.4} strokeLinecap="round" /> : null}
    </Svg>
  );
}

export async function captureActivityPhoto(): Promise<{
  uri: string;
  base64: string;
  mimeType: string;
} | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
    base64: true,
  };

  let result: ImagePicker.ImagePickerResult;
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    result = permission.granted
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  } catch {
    // Sem câmera (ex.: desktop) — cai na galeria/seletor de arquivos.
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  const asset = !result.canceled ? result.assets?.[0] : null;
  if (!asset?.base64) return null;
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType || 'image/jpeg',
  };
}

export function LearnerPhotoReviewView({ navigation, route }: Props) {
  const { activityId, kind } = route.params;
  const learnerSession = useLearnerSession();

  const [photo, setPhoto] = useState({
    uri: route.params.photoUri,
    base64: route.params.photoBase64,
    mimeType: route.params.mimeType,
  });
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const retake = async () => {
    if (isSending) return;
    const captured = await captureActivityPhoto();
    if (captured) {
      setPhoto(captured);
      setFeedback(null);
    }
  };

  const send = async () => {
    if (isSending) return;
    const learnerId = learnerSession.learnerProfileId;
    if (!learnerId) {
      setFeedback('Entre novamente para enviar a foto.');
      return;
    }
    setIsSending(true);
    try {
      await httpClient.post('/painel/fotos-atividade', {
        learnerProfileId: learnerId,
        activityId,
        kind: kind ?? 'atividade',
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
      });
      // RN112: som de confirmação; o alfabetizando não lê a mensagem.
      playSuccessBeep();
      navigation.goBack();
    } catch {
      playErrorBeep();
      setFeedback('Não foi possível enviar. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <LearnerScreenLayout minimalChrome>
      <View style={styles.wrapper}>
        <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => void retake()} disabled={isSending}>
            <CameraIcon />
            <Text style={styles.actionLabel}>FAZER OUTRA{'\n'}FOTO</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => void send()} disabled={isSending}>
            {isSending ? <ActivityIndicator color="#2fa536" /> : <CameraIcon withArrow />}
            <Text style={styles.actionLabel}>ENVIAR{'\n'}FOTO</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 26,
    marginTop: 12,
  },
  photo: {
    width: '92%',
    height: 300,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2fa536',
    textAlign: 'center',
    lineHeight: 16,
  },
  feedback: {
    fontSize: 13,
    color: '#b91c1c',
    textAlign: 'center',
  },
});
