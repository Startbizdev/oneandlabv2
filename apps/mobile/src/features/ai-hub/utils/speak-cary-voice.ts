import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { prepareVoiceSpeakingAudio } from './voice-audio-session';

let activePlayer: AudioPlayer | null = null;
let activeUri: string | null = null;

export function stopCaryVoice(): void {
  try {
    activePlayer?.pause();
  } catch {
    /* noop */
  }
  activePlayer = null;
  if (activeUri) {
    void FileSystem.deleteAsync(activeUri, { idempotent: true }).catch(() => undefined);
    activeUri = null;
  }
}

/** Lecture voix Cary via MP3 Grok (base64). */
export async function playCaryVoiceBase64(audioBase64: string): Promise<void> {
  const trimmed = audioBase64.trim();
  if (!trimmed) return;

  stopCaryVoice();
  await prepareVoiceSpeakingAudio();
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const uri = `${FileSystem.cacheDirectory}cary-voice-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(uri, trimmed, { encoding: FileSystem.EncodingType.Base64 });
  activeUri = uri;

  const player = createAudioPlayer(uri);
  activePlayer = player;

  await new Promise<void>((resolve) => {
    const finish = () => {
      sub.remove();
      stopCaryVoice();
      resolve();
    };
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.didJustFinish) {
        finish();
      }
    });
    player.play();
    setTimeout(finish, 120_000);
  });
}
