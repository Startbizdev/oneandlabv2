export type SpeechRecognitionModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

export const SPEECH_UNAVAILABLE_MESSAGE = 'Reconnaissance vocale indisponible sur cet appareil. Saisissez le texte.';

/** Module natif chargé à la demande : un build sans le module ne plante pas, la saisie reste possible. */
export async function loadSpeechRecognition(): Promise<SpeechRecognitionModule | null> {
  try {
    const mod = await import('expo-speech-recognition');
    return mod.ExpoSpeechRecognitionModule;
  } catch (err) {
    console.warn('[speech] module de reconnaissance vocale indisponible', err);
    return null;
  }
}

/** Message affichable pour un code d'erreur de la reconnaissance ; `null` quand rien n'est à signaler. */
export function speechErrorMessage(code: string): string | null {
  switch (code) {
    case 'aborted':
    case 'no-speech':
    case 'speech-timeout':
      return null;
    case 'not-allowed':
      return 'Autorisez le micro et la reconnaissance vocale dans les réglages.';
    case 'network':
      return 'Connexion requise pour la reconnaissance vocale.';
    case 'language-not-supported':
      return 'Reconnaissance vocale en français indisponible sur cet appareil.';
    default:
      return 'Écoute interrompue. Réessayez.';
  }
}
