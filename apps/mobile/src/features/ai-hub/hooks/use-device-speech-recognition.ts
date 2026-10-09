import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareVoiceListeningAudio } from '../utils/voice-audio-session';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

const UNAVAILABLE_MESSAGE = 'Dictée indisponible sur cet appareil. Saisissez le texte.';

export function speechErrorMessage(code: string): string | null {
  switch (code) {
    case 'aborted':
    case 'no-speech':
      return null;
    case 'not-allowed':
      return 'Autorisez le micro et la reconnaissance vocale dans les réglages.';
    case 'network':
      return 'Connexion requise pour la dictée.';
    case 'language-not-supported':
      return 'Dictée en français indisponible sur cet appareil.';
    default:
      return 'Dictée interrompue. Réessayez.';
  }
}

/** Dictée locale (reconnaissance vocale de l’appareil) : chaque phrase finale est transmise à `onFinal`. */
export function useDeviceSpeechRecognition(locale = 'fr-FR') {
  const [available, setAvailable] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<SpeechModule | null>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);

  const removeListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => listener.remove());
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('expo-speech-recognition')
      .then((mod) => {
        if (cancelled) return;
        moduleRef.current = mod.ExpoSpeechRecognitionModule;
        setAvailable(mod.ExpoSpeechRecognitionModule.isRecognitionAvailable());
      })
      .catch((err: unknown) => {
        console.warn('[dictation] module de reconnaissance vocale indisponible', err);
      });
    return () => {
      cancelled = true;
      removeListeners();
      moduleRef.current?.abort();
    };
  }, [removeListeners]);

  const start = useCallback(
    async (onFinal: (text: string) => void): Promise<void> => {
      const speech = moduleRef.current;
      if (!speech || !available) {
        setError(UNAVAILABLE_MESSAGE);
        return;
      }
      setError(null);
      const permissions = await speech.requestPermissionsAsync();
      if (!permissions.granted) {
        setError(speechErrorMessage('not-allowed'));
        return;
      }
      await prepareVoiceListeningAudio();
      removeListeners();
      listenersRef.current = [
        speech.addListener('start', () => setRecognizing(true)),
        speech.addListener('end', () => {
          setRecognizing(false);
          setInterimTranscript('');
        }),
        speech.addListener('result', (event) => {
          const text = (event.results[0]?.transcript ?? '').trim();
          if (!text) return;
          if (event.isFinal) {
            setInterimTranscript('');
            onFinal(text);
          } else {
            setInterimTranscript(text);
          }
        }),
        speech.addListener('error', (event) => {
          setRecognizing(false);
          const message = speechErrorMessage(event.error);
          if (message) setError(message);
        }),
      ];
      try {
        speech.start({
          lang: locale,
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
          iosTaskHint: 'dictation',
        });
      } catch (err) {
        console.warn('[dictation] démarrage impossible', err);
        removeListeners();
        setError(UNAVAILABLE_MESSAGE);
      }
    },
    [available, locale, removeListeners],
  );

  const stop = useCallback(() => {
    moduleRef.current?.stop();
  }, []);

  return { available, recognizing, interimTranscript, error, start, stop };
}
