import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

/** Pause après TTS avant d’ouvrir le micro (session audio iOS). */
export const VOICE_POST_TTS_DELAY_MS = Platform.select({
  ios: 750,
  android: 450,
  default: 550,
}) as number;

export async function prepareVoiceListeningAudio(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  } catch {
    /* mode audio optionnel */
  }
}

export async function prepareVoiceSpeakingAudio(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
  } catch {
    /* mode audio optionnel */
  }
}
