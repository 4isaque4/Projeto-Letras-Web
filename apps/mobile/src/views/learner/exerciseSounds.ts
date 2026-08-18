import { Audio } from 'expo-av';

// Feedback sonoro dos exercícios (RN111: bip de erro; RN112: bip de acerto).
// O alfabetizando ainda não lê — o som é o canal primário de feedback.
// Sons curtos gerados localmente (assets/sounds), tocados em fire-and-forget:
// falha de reprodução nunca pode travar o exercício.

const SUCCESS_ASSET = require('../../../assets/sounds/acerto.wav');
const ERROR_ASSET = require('../../../assets/sounds/erro.wav');

async function playAsset(asset: number) {
  try {
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, volume: 1 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // Sem áudio disponível (permissão/autoplay) — segue sem som.
  }
}

export function playSuccessBeep(): void {
  void playAsset(SUCCESS_ASSET);
}

export function playErrorBeep(): void {
  void playAsset(ERROR_ASSET);
}
