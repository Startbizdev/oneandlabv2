import * as FileSystem from 'expo-file-system/legacy';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { assistantMessageDisplayText } from './ai-message-display';

const EXPORT_NOTICE = "Cary est une intelligence artificielle : ses réponses ne remplacent pas l'avis d'un professionnel de santé.";

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Nom de fichier d'export : `cary-<titre>-<AAAA-MM-JJ>.<ext>`, sans caractère interdit. */
export function aiExportFileName(title: string, extension: 'txt' | 'json', date: Date): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `cary-${slug || 'conversation'}-${isoDay(date)}.${extension}`;
}

/** Conversation lisible en texte brut : auteur puis message, sans annotation technique. */
export function formatConversationExport(title: string, messages: PatientAiChatMessage[], date: Date): string {
  const lines = [`Cary — ${title}`, `Exporté le ${isoDay(date)}`, ''];
  for (const message of messages) {
    const text = message.role === 'user' ? message.text : assistantMessageDisplayText(message.text);
    const attachment = message.metadata?.attachment?.fileName;
    if (!text && !attachment) continue;
    lines.push(message.role === 'user' ? 'Vous :' : 'Cary :');
    if (attachment) lines.push(`[Pièce jointe : ${attachment}]`);
    if (text) lines.push(text);
    lines.push('');
  }
  lines.push(EXPORT_NOTICE);
  return lines.join('\n');
}

/** Écrit le contenu dans un fichier temporaire puis ouvre la feuille de partage (Fichiers, Drive, e-mail…). */
export async function shareAiExportFile(fileName: string, content: string): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error("L'export n'est pas disponible sur cet appareil.");
  const path = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
  const shared = await exportLocalFile(path, fileName);
  if (!shared.ok) throw new Error(shared.error ?? "Impossible d'exporter la conversation.");
}
