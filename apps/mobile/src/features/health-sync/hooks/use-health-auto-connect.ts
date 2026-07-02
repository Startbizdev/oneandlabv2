import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'prompting' | 'done';

/**
 * Ouvre la feuille Apple Santé / Health Connect à l’arrivée sur l’écran si pas encore connecté.
 */
export function useHealthAutoConnect(options: {
  enabled: boolean;
  connected: boolean;
  sourcesReady: boolean;
  syncing: boolean;
  onConnect: () => Promise<unknown>;
}) {
  const { enabled, connected, sourcesReady, syncing, onConnect } = options;
  const promptedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (!enabled || !sourcesReady || connected || syncing || promptedRef.current) return;

    promptedRef.current = true;
    setPhase('prompting');

    const timer = setTimeout(() => {
      void onConnect()
        .catch(() => undefined)
        .finally(() => setPhase('done'));
    }, 450);

    return () => clearTimeout(timer);
  }, [connected, enabled, onConnect, sourcesReady, syncing]);

  return { phase, hasAutoPrompted: promptedRef.current };
}
