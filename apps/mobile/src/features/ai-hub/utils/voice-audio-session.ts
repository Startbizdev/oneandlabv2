import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { Platform } from 'react-native';

/** Pause après TTS avant d’ouvrir le micro (bascule playAndRecord → playback iOS). */
export const VOICE_POST_TTS_DELAY_MS = Platform.select({
  ios: 400,
  android: 300,
  default: 350,
}) as number;

/** TTS Cary — playback classique → haut-parleur (évite l’écouteur iOS en playAndRecord). */
export async function prepareVoiceSpeakingAudio(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    /* mode audio optionnel */
  }
}

/** Micro — playAndRecord, son via haut-parleur si besoin (shouldRouteThroughEarpiece: false). */
export async function prepareVoiceListeningAudio(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    /* mode audio optionnel */
  }
}

/** Ouverture session vocale — TTS de bienvenue en premier. */
export async function prepareVoiceConversationAudio(): Promise<void> {
  await prepareVoiceSpeakingAudio();
}
