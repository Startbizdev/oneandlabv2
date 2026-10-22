import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadSpeechRecognition, type SpeechRecognitionModule } from '@/lib/speech/speech-recognition';
import { createVoiceController, IDLE_VOICE, type VoiceController, type VoiceState } from '../utils/voice-controller';

/**
 * Mode vocal « appuyer pour parler ». Tout s'arrête quand l'écran perd le focus, que l'app passe
 * en arrière-plan ou au démontage (aucun écouteur ni lecture orphelins).
 */
export function useVoiceMode(onUtterance: (text: string, controller: VoiceController) => void) {
  const [state, setState] = useState<VoiceState>(IDLE_VOICE);
  const recognitionRef = useRef<SpeechRecognitionModule | null>(null);
  const onUtteranceRef = useRef(onUtterance);
  onUtteranceRef.current = onUtterance;
  const [controller] = useState(() => {
    const created: VoiceController = createVoiceController({
      getRecognition: () => recognitionRef.current,
      tts: Speech,
      onUtterance: (text) => onUtteranceRef.current(text, created),
      onChange: setState,
    });
    return created;
  });

  useEffect(() => {
    let cancelled = false;
    void loadSpeechRecognition().then((mod) => {
      if (!cancelled) recognitionRef.current = mod;
    });
    const appState = AppState.addEventListener('change', (next) => {
      // L'écran d'autorisation (Android : arrière-plan ; iOS : « inactive ») ne doit pas couper l'écoute.
      if (next === 'background' && !controller.isAskingPermission()) controller.interrupt();
    });
    return () => {
      cancelled = true;
      appState.remove();
      controller.interrupt();
    };
  }, [controller]);


  useFocusEffect(useCallback(() => () => controller.interrupt(), [controller]));

  return { state, controller };
}
