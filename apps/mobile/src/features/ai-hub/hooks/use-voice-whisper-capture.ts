import { useCallback, useRef } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

/**
 * Enregistre l'audio du tour vocal pour transcription Whisper serveur (meilleure qualité que STT natif).
 */
export function useVoiceWhisperCapture() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const uriRef = useRef<string | null>(null);

  const prepare = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      return true;
    } catch {
      return false;
    }
  }, [recorder]);

  const start = useCallback(async (): Promise<boolean> => {
    const ok = await prepare();
    if (!ok) return false;
    try {
      recorder.record();
      return true;
    } catch {
      return false;
    }
  }, [prepare, recorder]);

  const stopAndReadBase64 = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
    } catch {
      return null;
    }
    const uri = recorder.uri ?? uriRef.current;
    if (!uri) return null;
    uriRef.current = uri;
    try {
      return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      return null;
    }
  }, [recorder]);

  const discard = useCallback(async () => {
    uriRef.current = null;
    try {
      await recorder.stop();
    } catch {
      /* noop */
    }
  }, [recorder]);

  return {
    start,
    stopAndReadBase64,
    discard,
  };
}
