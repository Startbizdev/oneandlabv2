/**
 * Copie un texte ; faux si le presse-papiers refuse ou échoue. Module natif chargé à la demande :
 * un build antérieur à `expo-clipboard` fait seulement échouer la copie, pas l'écran.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = await import('expo-clipboard');
    return await Clipboard.setStringAsync(text);
  } catch (e) {
    console.warn('[cary-ai] copie impossible', e);
    return false;
  }
}
