import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceSession } from './use-voice-session';

interface Params {
  activeId: string;
  reloadConversation: (conversationId: string) => Promise<void>;
  syncVoiceDraft: (draft: AiAppointmentDraft | null) => void;
  openCreatedAppointment: (appointmentId: string) => void;
}

/** Mode vocal plein écran : ouverture, fermeture (session close, fil rechargé) et RDV créé à la voix. */
export function useCaryAiVoiceMode({ activeId, reloadConversation, syncVoiceDraft, openCreatedAppointment }: Params) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const closeRef = useRef<(reload: boolean) => Promise<void>>(() => Promise.resolve());

  const voice = useVoiceSession({
    conversationId: activeId,
    onConversationSync: reloadConversation,
    onDraftSync: syncVoiceDraft,
    onAppointmentCreated: async (appointmentId) => {
      await closeRef.current(false);
      openCreatedAppointment(appointmentId);
    },
  });
  const { reset, lastConversationId } = voice;

  const closeVoiceMode = useCallback(
    async (reload = true) => {
      reset({ keepConversationId: true });
      setVoiceOpen(false);
      const conversationId = lastConversationId ?? activeId;
      if (reload && conversationId) await reloadConversation(conversationId);
    },
    [activeId, lastConversationId, reloadConversation, reset],
  );

  useEffect(() => {
    closeRef.current = closeVoiceMode;
  }, [closeVoiceMode]);

  const openVoiceMode = useCallback(() => setVoiceOpen(true), []);

  /** Props de session de `PatientAiVoiceOverlay` ; l'écran ajoute fermeture et brouillon. */
  const overlayProps = {
    visible: voiceOpen,
    phase: voice.phase,
    recognizing: voice.recognizing,
    available: voice.available,
    voiceEnergy: voice.voiceEnergy,
    turns: voice.turns,
    speechError: voice.speechError,
    emergency: voice.emergency,
    onStart: () => void voice.startConversation(),
    onStop: voice.stopConversation,
    onInterrupt: () => void voice.interruptAssistant(),
  };

  return { overlayProps, voiceOpen, openVoiceMode, closeVoiceMode };
}
