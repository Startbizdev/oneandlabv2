import { useCallback, useEffect, useRef, useState } from 'react';
import { delay } from '../utils/voice-session-utils';
import { prepareVoiceListeningAudio } from '../utils/voice-audio-session';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
type SpeechErrorEvent = {
  error: string;
  message: string;
};

const EXPO_GO_HINT =
  'La voix nécessite l’app Cary installée (build natif). Expo Go ne supporte pas le micro IA.';

const RECOVERABLE_ERRORS = new Set(['audio-capture', 'busy', 'interrupted']);

function mapSpeechError(event: SpeechErrorEvent): string | null {
  if (event.error === 'aborted' || event.error === 'no-speech') return null;
  switch (event.error) {
    case 'not-allowed':
      return 'Autorisez le micro et la reconnaissance vocale dans les Réglages iPhone.';
    case 'audio-capture':
      return 'Micro temporairement indisponible — nouvel essai…';
    case 'busy':
      return 'Reconnaissance vocale occupée — nouvel essai…';
    case 'interrupted':
      return 'Écoute interrompue — reprise…';
    case 'network':
      return 'Connexion requise pour la reconnaissance vocale.';
    case 'language-not-supported':
      return 'Français non disponible pour la reconnaissance vocale sur cet appareil.';
    default:
      return event.message?.trim() || 'Impossible d’écouter pour le moment — réessayez.';
  }
}

type Options = {
  locale?: string;
  continuous?: boolean;
};

export function useDeviceSpeechRecognition(options: Options = {}) {
  const locale = options.locale ?? 'fr-FR';
  const continuous = options.continuous ?? true;

  const [available, setAvailable] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResultAt, setLastResultAt] = useState(0);
  const moduleRef = useRef<SpeechModule | null>(null);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const startingRef = useRef(false);
  const activeRef = useRef(false);

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
      activeRef.current = false;
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

  const attachListeners = useCallback(
    (m: SpeechModule) => {
      cleanupListeners();
      listenersRef.current = [
        m.addListener('start', () => {
          setRecognizing(true);
          setError(null);
        }),
        m.addListener('end', () => setRecognizing(false)),
        m.addListener('result', (event) => {
          const text = (event.results?.[0]?.transcript ?? '').trim();
          if (!text) return;
          setLastResultAt(Date.now());
          if (event.isFinal) {
            setTranscript((prev) => (prev ? `${prev} ${text}` : text).trim());
            setInterimTranscript('');
          } else {
            setInterimTranscript(text);
          }
        }),
        m.addListener('error', (event) => {
          const mapped = mapSpeechError(event);
          if (!mapped) return;
          setError(mapped);
          setRecognizing(false);
          if (RECOVERABLE_ERRORS.has(event.error) && activeRef.current && !startingRef.current) {
            void (async () => {
              await delay(500);
              if (!activeRef.current) return;
              try {
                m.abort();
              } catch {
                /* noop */
              }
              await delay(300);
              await prepareVoiceListeningAudio();
              try {
                m.start({
                  lang: locale,
                  interimResults: true,
                  continuous,
                  iosVoiceProcessingEnabled: false,
                  iosTaskHint: 'dictation',
                  addsPunctuation: true,
                  iosCategory: {
                    category: 'playAndRecord',
                    categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
                    mode: 'spokenAudio',
                  },
                });
              } catch {
                /* retry échoué */
              }
            })();
          }
        }),
      ];
    },
    [cleanupListeners, continuous, locale],
  );

  const start = useCallback(async (): Promise<boolean> => {
    const m = moduleRef.current;
    if (!m || !available) {
      setError(EXPO_GO_HINT);
      return false;
    }

    if (startingRef.current) return false;
    startingRef.current = true;
    activeRef.current = true;
    setError(null);

    try {
      const perms = await m.requestPermissionsAsync();
      if (!perms.granted) {
        setError('Autorisez le micro dans les réglages pour parler à Cary.');
        return false;
      }

      try {
        m.abort();
      } catch {
        /* noop */
      }
      await delay(200);
      await prepareVoiceListeningAudio();
      attachListeners(m);

      m.start({
        lang: locale,
        interimResults: true,
        continuous,
        iosVoiceProcessingEnabled: false,
        iosTaskHint: 'dictation',
        addsPunctuation: true,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'spokenAudio',
        },
      });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Impossible de démarrer l’écoute';
      setError(message);
      return false;
    } finally {
      startingRef.current = false;
    }
  }, [attachListeners, available, continuous, locale]);

  const stop = useCallback(() => {
    moduleRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    activeRef.current = false;
    try {
      moduleRef.current?.abort();
    } catch {
      /* noop */
    }
    cleanupListeners();
    setRecognizing(false);
    setInterimTranscript('');
  }, [cleanupListeners]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setLastResultAt(0);
  }, []);

  const displayTranscript = (transcript || interimTranscript).trim();

  return {
    available,
    recognizing,
    transcript,
    interimTranscript,
    displayTranscript,
    lastResultAt,
    error,
    start,
    stop,
    abort,
    clearTranscript,
  };
}
