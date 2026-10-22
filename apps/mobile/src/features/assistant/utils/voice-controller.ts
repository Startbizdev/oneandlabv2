import type { SpeechOptions } from 'expo-speech';
import { SPEECH_UNAVAILABLE_MESSAGE, speechErrorMessage, type SpeechRecognitionModule } from '@/lib/speech/speech-recognition';
import { createSentenceSplitter } from './sentence-splitter';

export type VoiceRecognition = Pick<
  SpeechRecognitionModule,
  'isRecognitionAvailable' | 'requestPermissionsAsync' | 'start' | 'stop' | 'abort' | 'addListener'
>;
type Tts = { speak: (text: string, options: SpeechOptions) => void; stop: () => unknown };

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';
export type VoiceState = { phase: VoicePhase; partial: string; error: string | null };
export const IDLE_VOICE: VoiceState = { phase: 'idle', partial: '', error: null };
const NOTHING_HEARD = 'Je n’ai rien entendu. Touchez le micro pour réessayer.';

type Deps = {
  getRecognition: () => VoiceRecognition | null;
  tts: Tts;
  /** Phrase dictée terminée : à envoyer à Cary. */
  onUtterance: (text: string) => void;
  onChange: (state: VoiceState) => void;
};

/**
 * Mode vocal sans minuterie : écoute (reconnaissance de l'appareil) → envoi → lecture phrase par phrase.
 * Chaque session porte un numéro : un rappel d'une session interrompue est ignoré.
 */
export function createVoiceController({ getRecognition, tts, onUtterance, onChange }: Deps) {
  let state = IDLE_VOICE;
  let session = 0;
  let listeners: { remove: () => void }[] = [];
  let queue: string[] = [];
  let speaking = false;
  let streamDone = true;
  let askingPermission = false;

  const set = (patch: Partial<VoiceState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };
  const removeListeners = () => {
    listeners.forEach((l) => l.remove());
    listeners = [];
  };

  const interrupt = () => {
    session += 1;
    queue = [];
    speaking = false;
    streamDone = true;
    if (listeners.length > 0) {
      removeListeners();
      getRecognition()?.abort();
    }
    void Promise.resolve(tts.stop()).catch(() => undefined);
    // Envoi, nouvelle conversation, sortie d'écran : un ancien message d'échec du micro n'a plus de sens.
    set({ phase: 'idle', partial: '', error: null });
  };

  const speakNext = (token: number) => {
    if (token !== session) return;
    const sentence = queue.shift();
    if (!sentence) {
      speaking = false;
      if (streamDone) set({ phase: 'idle' });
      return;
    }
    speaking = true;
    set({ phase: 'speaking' });
    const next = () => speakNext(token);
    tts.speak(sentence, { language: 'fr-FR', onDone: next, onError: next });
  };

  const enqueue = (token: number, sentences: string[]) => {
    if (token !== session || sentences.length === 0) return;
    queue.push(...sentences);
    if (!speaking) speakNext(token);
  };

  return {
    getState: () => state,

    async listen(): Promise<void> {
      interrupt();
      const token = session;
      const recognition = getRecognition();
      if (!recognition || !recognition.isRecognitionAvailable()) {
        set({ error: SPEECH_UNAVAILABLE_MESSAGE });
        return;
      }
      set({ error: null });
      askingPermission = true;
      const permission = await recognition.requestPermissionsAsync().catch((err: unknown) => {
        console.warn('[assistant] autorisation micro indisponible', err);
        return { granted: false };
      });
      askingPermission = false;
      if (token !== session) return;
      if (!permission.granted) {
        set({ error: speechErrorMessage('not-allowed') });
        return;
      }
      let finalText = '';
      listeners = [
        recognition.addListener('result', (event) => {
          const text = (event.results[0]?.transcript ?? '').trim();
          if (event.isFinal) finalText = text;
          set({ partial: text });
        }),
        recognition.addListener('error', (event) => {
          removeListeners();
          const silent = event.error === 'no-speech' || event.error === 'speech-timeout';
          set({ phase: 'idle', partial: '', error: silent ? NOTHING_HEARD : speechErrorMessage(event.error) });
        }),
        recognition.addListener('end', () => {
          if (token !== session) return;
          removeListeners();
          const text = finalText || state.partial;
          if (!text) {
            set({ phase: 'idle', partial: '', error: NOTHING_HEARD });
            return;
          }
          set({ phase: 'thinking', partial: text });
          onUtterance(text);
        }),
      ];
      set({ phase: 'listening', partial: '' });
      try {
        recognition.start({ lang: 'fr-FR', interimResults: true, continuous: false, addsPunctuation: true });
      } catch (err) {
        console.warn('[assistant] écoute impossible', err);
        removeListeners();
        set({ phase: 'idle', error: SPEECH_UNAVAILABLE_MESSAGE });
      }
    },

    /** Fin de la prise de parole : la reconnaissance rend le texte final puis `end`. */
    stopListening() {
      if (state.phase === 'listening') getRecognition()?.stop();
    },

    /** Branchements du flux de réponse : les phrases complètes sont lues dès leur arrivée. */
    speakStream() {
      const token = session;
      const splitter = createSentenceSplitter();
      streamDone = false;
      return {
        onDelta: (text: string) => enqueue(token, splitter.push(text)),
        onEnd: (completed: boolean) => {
          if (token !== session) return;
          if (!completed) {
            interrupt();
            return;
          }
          const rest = splitter.flush();
          streamDone = true;
          if (rest) enqueue(token, [rest]);
          else if (!speaking) set({ phase: 'idle', partial: '' });
        },
      };
    },

    interrupt,

    /** Dialogue d'autorisation affiché : l'app passe brièvement en arrière-plan sur Android. */
    isAskingPermission: () => askingPermission,

    /** Écouteurs de reconnaissance encore branchés (contrôle de fuite). */
    listenerCount: () => listeners.length,
  };
}

export type VoiceController = ReturnType<typeof createVoiceController>;
