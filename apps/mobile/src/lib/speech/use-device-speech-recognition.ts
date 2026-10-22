import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadSpeechRecognition,
  SPEECH_UNAVAILABLE_MESSAGE,
  speechErrorMessage,
  type SpeechRecognitionModule,
} from './speech-recognition';

/** Dictée locale (reconnaissance vocale de l'appareil) : chaque phrase finale est transmise à `onFinal`. */
export function useDeviceSpeechRecognition(locale = 'fr-FR') {
  const [available, setAvailable] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<SpeechRecognitionModule | null>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);

  const removeListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => listener.remove());
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadSpeechRecognition().then((speech) => {
      if (cancelled || !speech) return;
      moduleRef.current = speech;
      setAvailable(speech.isRecognitionAvailable());
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
        setError(SPEECH_UNAVAILABLE_MESSAGE);
        return;
      }
      setError(null);
      const permissions = await speech.requestPermissionsAsync();
      if (!permissions.granted) {
        setError(speechErrorMessage('not-allowed'));
        return;
      }
      removeListeners();
      listenersRef.current = [
        speech.addListener('start', () => setRecognizing(true)),
        speech.addListener('end', () => {
          setRecognizing(false);
          setInterimTranscript('');
          removeListeners();
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
        console.warn('[speech] démarrage impossible', err);
        removeListeners();
        setError(SPEECH_UNAVAILABLE_MESSAGE);
      }
    },
    [available, locale, removeListeners],
  );

  const stop = useCallback(() => {
    moduleRef.current?.stop();
  }, []);

  return { available, recognizing, interimTranscript, error, start, stop };
}
