import { useEffect, useRef } from 'react';
import { ProfileDraft } from '@/features/profile/utils/profile-draft';

export function useProfileDraft<T extends object, Source>(
  subject: string | undefined,
  data: Source | undefined,
  current: T,
  fromServer: (data: Source) => T,
  apply: (draft: T) => void,
) {
  const draft = useRef(new ProfileDraft<T>());
  const lastResponse = useRef<{ subject: string; data: Source } | null>(null);
  const latest = useRef({ current, fromServer, apply });
  latest.current = { current, fromServer, apply };
  useEffect(() => {
    if (!subject || !data) return;
    if (lastResponse.current?.subject === subject && lastResponse.current.data === data) return;
    const state = latest.current;
    state.apply(draft.current.merge(subject, state.fromServer(data), state.current));
    lastResponse.current = { subject, data };
  }, [subject, data]);
}
