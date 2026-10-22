import type { SpeechOptions } from 'expo-speech';
import { createVoiceController, type VoiceRecognition, type VoiceState } from '../utils/voice-controller';

type Handler = (event: { results: { transcript: string }[]; isFinal: boolean; error: string }) => void;

/** Reconnaissance factice : compte les écouteurs branchés et permet d'émettre des événements. */
function fakeRecognition({ granted = true, available = true } = {}) {
  const handlers = new Map<string, Set<Handler>>();
  return {
    isRecognitionAvailable: jest.fn(() => available),
    requestPermissionsAsync: jest.fn(async () => ({ granted })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addListener: jest.fn((name: string, handler: Handler) => {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)?.add(handler);
      return { remove: () => handlers.get(name)?.delete(handler) };
    }),
    emit(name: string, event: Partial<Parameters<Handler>[0]> = {}) {
      handlers.get(name)?.forEach((h) => h({ results: [], isFinal: false, error: '', ...event }));
    },
    count: () => [...handlers.values()].reduce((n, set) => n + set.size, 0),
  };
}

function fakeTts() {
  const spoken: { text: string; options: SpeechOptions }[] = [];
  return {
    spoken,
    speak: jest.fn((text: string, options: SpeechOptions) => spoken.push({ text, options })),
    stop: jest.fn(async () => undefined),
    finishCurrent() {
      spoken[spoken.length - 1]?.options.onDone?.();
    },
  };
}

function setup(options?: { granted?: boolean; available?: boolean }) {
  jest.useFakeTimers();
  const recognition = fakeRecognition(options);
  const tts = fakeTts();
  const states: VoiceState[] = [];
  const onUtterance = jest.fn();
  const controller = createVoiceController({
    getRecognition: () => recognition as unknown as VoiceRecognition,
    tts,
    onUtterance,
    onChange: (s) => states.push(s),
  });
  return { recognition, tts, states, onUtterance, controller };
}

afterEach(() => {
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

describe('createVoiceController', () => {
  it('écoute, transmet la phrase finale puis débranche les écouteurs', async () => {
    const { recognition, controller, onUtterance } = setup();
    await controller.listen();
    expect(controller.getState().phase).toBe('listening');
    expect(recognition.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'fr-FR', interimResults: true }));
    recognition.emit('result', { results: [{ transcript: 'Quand est mon' }], isFinal: false });
    expect(controller.getState().partial).toBe('Quand est mon');
    recognition.emit('result', { results: [{ transcript: 'Quand est mon RDV' }], isFinal: true });
    recognition.emit('end');
    expect(onUtterance).toHaveBeenCalledWith('Quand est mon RDV');
    expect(controller.getState().phase).toBe('thinking');
    expect(recognition.count()).toBe(0);
  });

  it('lit la réponse phrase par phrase, dans l’ordre, puis revient au repos', async () => {
    const { tts, controller } = setup();
    const stream = controller.speakStream();
    stream.onDelta('Bonjour. Votre RDV');
    expect(tts.spoken.map((s) => s.text)).toEqual(['Bonjour.']);
    expect(controller.getState().phase).toBe('speaking');
    stream.onDelta(' est demain. Merci');
    stream.onEnd(true);
    tts.finishCurrent();
    tts.finishCurrent();
    tts.finishCurrent();
    expect(tts.spoken.map((s) => s.text)).toEqual(['Bonjour.', 'Votre RDV est demain.', 'Merci']);
    expect(tts.spoken.every((s) => s.options.language === 'fr-FR')).toBe(true);
    expect(controller.getState().phase).toBe('idle');
  });

  it('interrompre coupe la lecture, l’écoute et ignore les morceaux tardifs', async () => {
    const { recognition, tts, controller } = setup();
    const stream = controller.speakStream();
    stream.onDelta('Première phrase. ');
    await controller.listen();
    expect(tts.stop).toHaveBeenCalled();
    controller.interrupt();
    expect(recognition.abort).toHaveBeenCalled();
    expect(recognition.count()).toBe(0);
    stream.onDelta('Phrase tardive. ');
    tts.finishCurrent();
    expect(tts.spoken.map((s) => s.text)).toEqual(['Première phrase.']);
    expect(controller.getState().phase).toBe('idle');
  });

  it('flux en échec : lecture arrêtée, retour au repos', () => {
    const { tts, controller } = setup();
    const stream = controller.speakStream();
    stream.onDelta('Une phrase. ');
    stream.onEnd(false);
    expect(tts.stop).toHaveBeenCalled();
    expect(controller.getState().phase).toBe('idle');
  });

  it('micro refusé ou reconnaissance absente : message, aucun écouteur', async () => {
    const denied = setup({ granted: false });
    await denied.controller.listen();
    expect(denied.controller.getState().error).toMatch(/Autorisez le micro/);
    expect(denied.recognition.count()).toBe(0);
    expect(denied.recognition.start).not.toHaveBeenCalled();
    jest.useRealTimers();

    const unavailable = setup({ available: false });
    await unavailable.controller.listen();
    expect(unavailable.controller.getState().error).toMatch(/indisponible/);
    expect(unavailable.recognition.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('silence : écouteurs retirés, invitation à réessayer', async () => {
    const { recognition, controller, onUtterance } = setup();
    await controller.listen();
    recognition.emit('error', { error: 'no-speech' });
    expect(recognition.count()).toBe(0);
    expect(controller.getState()).toMatchObject({ phase: 'idle', error: expect.stringMatching(/rien entendu/) });
    expect(onUtterance).not.toHaveBeenCalled();
  });

  it('interruption (envoi, nouvelle conversation) : l’ancien message d’échec disparaît', async () => {
    const { recognition, controller } = setup();
    await controller.listen();
    recognition.emit('error', { error: 'no-speech' });
    controller.interrupt();
    expect(controller.getState()).toEqual({ phase: 'idle', partial: '', error: null });
  });
});
