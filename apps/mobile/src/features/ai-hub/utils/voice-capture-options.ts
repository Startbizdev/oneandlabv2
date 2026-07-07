import { RecordingPresets, type RecordingOptions } from 'expo-audio';

/**
 * Options d'enregistrement vocal (VAD mains libres).
 * expo-audio exige les MÊMES options sur useAudioRecorder ET prepareToRecordAsync
 * pour que metering fonctionne (expo/expo#37241).
 */
export const VOICE_CAPTURE_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  isMeteringEnabled: true,
};
