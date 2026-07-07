import { useCallback, useMemo, useRef } from 'react';
import {
  AudioModule,
  setIsAudioActiveAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { voiceLog } from '../utils/voice-debug-log';
import { VOICE_CAPTURE_OPTIONS } from '../utils/voice-capture-options';
import { prepareVoiceListeningAudio } from '../utils/voice-audio-session';
import { delay } from '../utils/voice-session-utils';

async function waitForRecorderActive(
  recorder: ReturnType<typeof useAudioRecorder>,
  timeoutMs: number,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = recorder.getStatus();
    if (status.isRecording) return status;
    await delay(50);
  }
  return recorder.getStatus();
}

/** Enregistrement micro + metering VAD (STT Grok côté serveur). */
export function useVoiceAudioCapture() {
  const recorder = useAudioRecorder(VOICE_CAPTURE_OPTIONS);
  const uriRef = useRef<string | null>(null);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      voiceLog('permission', { granted: status.granted, canAskAgain: status.canAskAgain });
      if (!status.granted) return false;

      await setIsAudioActiveAsync(true);
      await prepareVoiceListeningAudio();

      try {
        await recorder.stop();
      } catch {
        /* noop */
      }

      await recorder.prepareToRecordAsync(VOICE_CAPTURE_OPTIONS);
      recorder.record();

      let recorderStatus = await waitForRecorderActive(recorder, 1200);
      if (!recorderStatus.isRecording) {
        voiceLog('record.start.retry', {
          canRecord: recorderStatus.canRecord,
          isRecording: recorderStatus.isRecording,
        });
        await recorder.prepareToRecordAsync(VOICE_CAPTURE_OPTIONS);
        recorder.record();
        recorderStatus = await waitForRecorderActive(recorder, 1500);
      }

      voiceLog('record.start', {
        meteringEnabled: VOICE_CAPTURE_OPTIONS.isMeteringEnabled,
        extension: VOICE_CAPTURE_OPTIONS.extension,
        uri: recorder.uri ?? recorderStatus.url,
        canRecord: recorderStatus.canRecord,
        isRecording: recorderStatus.isRecording,
        metering: recorderStatus.metering ?? null,
      });

      if (!recorderStatus.isRecording) {
        voiceLog('record.start.failed', {
          canRecord: recorderStatus.canRecord,
          mediaServicesDidReset: recorderStatus.mediaServicesDidReset,
        });
        return false;
      }

      return true;
    } catch (e) {
      voiceLog('record.start.error', { message: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }, [recorder]);

  const stopAndReadBase64 = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
    } catch (e) {
      voiceLog('record.stop.error', { message: e instanceof Error ? e.message : String(e) });
      return null;
    }
    const uri = recorder.uri ?? uriRef.current;
    if (!uri) {
      voiceLog('record.stop.no-uri');
      return null;
    }
    uriRef.current = uri;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      voiceLog('record.stop', { uri, base64Len: base64.length });
      return base64;
    } catch (e) {
      voiceLog('record.read.error', { message: e instanceof Error ? e.message : String(e), uri });
      return null;
    }
  }, [recorder]);

  const discard = useCallback(async () => {
    uriRef.current = null;
    voiceLog('record.discard');
    try {
      await recorder.stop();
    } catch {
      /* noop */
    }
  }, [recorder]);

  return useMemo(
    () => ({
      recorder,
      start,
      stopAndReadBase64,
      discard,
    }),
    [recorder, start, stopAndReadBase64, discard],
  );
}
