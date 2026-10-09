export type ConversationRowActionKey = 'rename' | 'pin' | 'unpin' | 'archive' | 'restore' | 'export' | 'delete';

export type ConversationRowAction = {
  key: ConversationRowActionKey;
  label: string;
  destructive?: boolean;
};

const LABELS: Record<ConversationRowActionKey, string> = {
  rename: 'Renommer',
  pin: 'Épingler',
  unpin: 'Désépingler',
  archive: 'Archiver',
  restore: 'Restaurer',
  export: 'Exporter',
  delete: 'Supprimer',
};

function action(key: ConversationRowActionKey): ConversationRowAction {
  return key === 'delete' ? { key, label: LABELS[key], destructive: true } : { key, label: LABELS[key] };
}

/**
 * Actions d'une conversation de l'historique. Conversation système (Mes rendez-vous…) : export seul,
 * elle ne peut être ni renommée, ni épinglée, ni archivée, ni supprimée.
 */
export function buildConversationRowActions(conv: {
  isSystem?: boolean;
  isPinned?: boolean;
  archived: boolean;
}): ConversationRowAction[] {
  if (conv.isSystem) return [action('export')];
  if (conv.archived) return [action('restore'), action('export'), action('delete')];
  return [action('rename'), action(conv.isPinned ? 'unpin' : 'pin'), action('archive'), action('export'), action('delete')];
}
