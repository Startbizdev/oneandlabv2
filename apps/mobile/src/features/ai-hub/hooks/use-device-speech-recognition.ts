import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

const EXPO_GO_HINT =
  'La voix nécessite l’app Cary installée (build de développement). Expo Go ne supporte pas le micro IA.';

export function useDeviceSpeechRecognition(locale = 'fr-FR') {
  const [available, setAvailable] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<SpeechModule | null>(null);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('expo-speech-recognition');
        const m = mod.ExpoSpeechRecognitionModule;
        if (cancelled) return;
        moduleRef.current = m;
        const ok = typeof m.isRecognitionAvailable === 'function' ? m.isRecognitionAvailable() : true;
        setAvailable(ok);
      } catch {
        if (!cancelled) {
          setAvailable(false);
          setError(EXPO_GO_HINT);
        }
      }
    })();
    return () => {
      cancelled = true;
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
      try {
        moduleRef.current?.abort?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    const m = moduleRef.current;
    if (!m || !available) {
      setError(EXPO_GO_HINT);
      return false;
    }
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const perms = await m.requestPermissionsAsync();
    if (!perms.granted) {
      setError('Autorisez le micro dans les réglages pour parler à Cary.');
      return false;
    }

    cleanupListeners();
    listenersRef.current = [
      m.addListener('start', () => setRecognizing(true)),
      m.addListener('end', () => setRecognizing(false)),
      m.addListener('result', (event) => {
        const text = (event.results?.[0]?.transcript ?? '').trim();
        if (!text) return;
        if (event.isFinal) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text).trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(text);
        }
      }),
      m.addListener('error', (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        setError(event.message ?? 'Écoute interrompue');
        setRecognizing(false);
      }),
    ];

    m.start({
      lang: locale,
      interimResults: true,
      continuous: false,
      iosVoiceProcessingEnabled: true,
      addsPunctuation: true,
    });
    return true;
  }, [available, cleanupListeners, locale]);

  const stop = useCallback(() => {
    moduleRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    try {
      moduleRef.current?.abort();
    } catch {
      /* noop */
    }
    cleanupListeners();
    setRecognizing(false);
    setInterimTranscript('');
  }, [cleanupListeners]);

  const displayTranscript = (transcript || interimTranscript).trim();

  return {
    available,
    recognizing,
    transcript,
    interimTranscript,
    displayTranscript,
    error,
    start,
    stop,
    abort,
  };
}
