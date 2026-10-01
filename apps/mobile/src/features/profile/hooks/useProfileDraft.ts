import { useEffect, useRef, useState } from 'react';
import { ProfileDraft, isDraftDirty } from '@/features/profile/utils/profile-draft';

/**
 * Synchronise le brouillon avec la réponse serveur et indique s'il reste des modifications non enregistrées.
 * `ignoreForDirty` : champs enregistrés immédiatement (photos) qui ne doivent pas bloquer la sortie.
 */
export function useProfileDraft<T extends object, Source>(
  subject: string | undefined,
  data: Source | undefined,
  current: T,
  fromServer: (data: Source) => T,
  apply: (draft: T) => void,
  ignoreForDirty: readonly (keyof T)[] = [],
): { dirty: boolean } {
  const draft = useRef(new ProfileDraft<T>());
  const lastResponse = useRef<{ subject: string; data: Source } | null>(null);
  const latest = useRef({ current, fromServer, apply });
  latest.current = { current, fromServer, apply };
  const [syncedData, setSyncedData] = useState<Source | undefined>(undefined);
  useEffect(() => {
    if (!subject || !data) return;
    if (lastResponse.current?.subject === subject && lastResponse.current.data === data) return;
    const state = latest.current;
    state.apply(draft.current.merge(subject, state.fromServer(data), state.current));
    lastResponse.current = { subject, data };
    setSyncedData(data);
  }, [subject, data]);

  const dirty = data !== undefined && syncedData === data && isDraftDirty(current, fromServer(data), ignoreForDirty);
  return { dirty };
}
