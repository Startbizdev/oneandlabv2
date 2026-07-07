import {
  createAudioPlayer,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { prepareVoiceSpeakingAudio } from './voice-audio-session';
import { voiceLog } from './voice-debug-log';

let activePlayer: AudioPlayer | null = null;
let activeUri: string | null = null;

export function stopCaryVoice(): void {
  try {
    activePlayer?.pause();
  } catch {
    /* noop */
  }
  try {
    activePlayer?.release();
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

  voiceLog('tts.play.start', { audioBase64Len: trimmed.length });
  const uri = `${FileSystem.cacheDirectory}cary-voice-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(uri, trimmed, { encoding: FileSystem.EncodingType.Base64 });
  activeUri = uri;

  const player = createAudioPlayer(uri, { keepAudioSessionActive: true });
  activePlayer = player;
  player.volume = 1;

  await new Promise<void>((resolve) => {
    const finish = () => {
      sub.remove();
      voiceLog('tts.play.done');
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
