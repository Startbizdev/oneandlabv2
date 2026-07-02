import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

let cachedVoice: string | undefined | null;

function scoreVoice(name: string, identifier: string, quality?: string): number {
  const blob = `${name} ${identifier} ${quality ?? ''}`.toLowerCase();
  let score = 0;
  if (/fr/i.test(blob)) score += 2;
  if (/premium|enhanced|siri|neural|wavenet|natural/i.test(blob)) score += 8;
  if (/audrey|marie|thomas|amelie|virginie|daniel/i.test(blob)) score += 4;
  if (quality === 'Enhanced') score += 6;
  if (/compact|low/i.test(blob)) score -= 4;
  return score;
}

async function resolveFrenchVoice(): Promise<string | undefined> {
  if (cachedVoice !== null) return cachedVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const french = voices.filter((v) => (v.language ?? '').toLowerCase().startsWith('fr'));
    if (french.length === 0) {
      cachedVoice = undefined;
      return undefined;
    }
    french.sort((a, b) => {
      const sa = scoreVoice(a.name ?? '', a.identifier ?? '', (a as { quality?: string }).quality);
      const sb = scoreVoice(b.name ?? '', b.identifier ?? '', (b as { quality?: string }).quality);
      return sb - sa;
    });
    cachedVoice = french[0]?.identifier;
    return cachedVoice;
  } catch {
    cachedVoice = undefined;
    return undefined;
  }
}

export function stopCaryVoice(): void {
  Speech.stop();
}

export async function speakCaryVoice(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  const voice = await resolveFrenchVoice();
  Speech.stop();

  return new Promise<void>((resolve) => {
    Speech.speak(trimmed, {
      language: 'fr-FR',
      voice,
      rate: Platform.select({ ios: 0.94, android: 0.92, default: 0.93 }),
      pitch: Platform.select({ ios: 1.02, android: 1.0, default: 1.0 }),
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}
