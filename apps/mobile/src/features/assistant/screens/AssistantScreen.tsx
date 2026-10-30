import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantConversationSummary } from '@oneandlab/shared-types';
import type { TransmissionPrefill } from '@oneandlab/shared-utils';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, View } from 'react-native';
import { History, SquarePen } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { ScreenFrame } from '@/components/navigation/ScreenFrame';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { TransmissionEntrySheet } from '@/features/patients/components/TransmissionEntrySheet';
import { queryKeys } from '@/lib/query-keys';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { AppText, useStyles, type Theme } from '@/theme';
import { deleteConversation } from '../api/assistant.service';
import { AssistantComposer } from '../components/AssistantComposer';
import { DictationSheet } from '../components/DictationSheet';
import { HistorySheet } from '../components/HistorySheet';
import { MessageList } from '../components/MessageList';
import { PatientPickerSheet } from '../components/PatientPickerSheet';
import { ResultsConsentSheet } from '../components/ResultsConsentSheet';
import { ScopeBar } from '../components/ScopeBar';
import { Suggestions } from '../components/Suggestions';
import { useAssistantChat } from '../hooks/use-assistant-chat';
import { useAttachment } from '../hooks/use-attachment';
import { useSheetSequence } from '../hooks/use-sheet-sequence';
import { useVoiceMode } from '../hooks/use-voice-mode';
import { resolveAssistantAction, type AssistantActionTarget } from '../utils/assistant-actions';
import { parseContextType, type AssistantLinkParams } from '../utils/assistant-link';
import { starterSuggestions } from '../utils/assistant-suggestions';
import { voiceBookingConfirmation } from '../utils/voice-confirm';

type Sheet =
  | { kind: 'history' }
  /** `thenAttach` : le soignant voulait joindre un document sans patient choisi. */
  | { kind: 'picker'; thenAttach?: boolean }
  | { kind: 'dictation'; patientId: string }
  | { kind: 'delete'; conversation: AssistantConversationSummary }
  | { kind: 'consent' }
  | { kind: 'transmission'; patientId: string; prefill: TransmissionPrefill };

const ATTACHMENT_ONLY_MESSAGE = 'Voici un document. Explique-moi ce qui est important.';
const CLEARED_SCOPE = { context_type: undefined, context_id: undefined, patient_id: undefined, initial_message: undefined };

/** Assistant Cary : réponses en direct, cartes d'action, voix, pièce jointe, dictée soignant. */
export function AssistantScreen({ role, showBackButton = false }: { role: MobileRole; showBackButton?: boolean }) {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const params = useLocalSearchParams<AssistantLinkParams>();
  const staff = role !== 'patient';
  const contextType = parseContextType(params.context_type);
  const contextId = params.context_id || undefined;
  const patientId = staff ? params.patient_id || (contextType === 'patient' ? contextId : undefined) : undefined;
  const appointmentId = contextType === 'appointment' ? contextId : undefined;

  const scope = useMemo(
    () => ({ context: contextType ? { type: contextType, id: contextId } : undefined, patientId }),
    [contextId, contextType, patientId],
  );
  const chat = useAssistantChat(scope);
  const { send, stop, retry, openConversation } = chat;
  const attachmentScope = useMemo(() => ({ appointmentId, patientId }), [appointmentId, patientId]);
  const attachment = useAttachment(role, attachmentScope);
  const sheets = useSheetSequence<Sheet>();
  const openSheet = sheets.open;
  const firstName = useAuthStore((s) => s.user?.first_name);
  const streaming = chat.phase === 'streaming';

  // Lu par la voix au moment où la phrase arrive (la liste change entre deux rendus).
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;
  const voice = useVoiceMode((text, controller) => {
    const booking = voiceBookingConfirmation(text, messagesRef.current);
    const target = booking ? resolveAssistantAction(role, booking, patientId) : null;
    if (target?.kind === 'navigate') {
      controller.interrupt();
      router.push(target.href);
      return;
    }
    if (!send(text, controller.speakStream())) controller.interrupt();
  });
  const { controller } = voice;

  // Nouveau sujet (lien profond, patient choisi) : nouvelle conversation.
  const scopeKey = `${contextType ?? ''}:${contextId ?? ''}:${patientId ?? ''}`;
  const scopeKeyRef = useRef(scopeKey);
  useEffect(() => {
    if (scopeKeyRef.current === scopeKey) return;
    scopeKeyRef.current = scopeKey;
    controller.interrupt();
    openConversation(null);
  }, [controller, openConversation, scopeKey]);

  // Message d'ouverture (lien profond) : envoyé une seule fois.
  const initialMessage = params.initial_message;
  const sentInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialMessage) {
      sentInitialRef.current = null;
      return;
    }
    if (sentInitialRef.current === initialMessage) return;
    sentInitialRef.current = initialMessage;
    router.setParams({ initial_message: undefined });
    openConversation(null);
    send(initialMessage);
  }, [initialMessage, openConversation, router, send]);

  const sendFromComposer = useCallback(
    (text: string) => {
      const pending = attachment.attachment;
      if (pending?.uploading) return false;
      controller.interrupt();
      const sent = send(text.trim() || (pending?.documentId ? ATTACHMENT_ONLY_MESSAGE : ''), {
        documentId: pending?.documentId,
      });
      if (sent && pending) attachment.clear();
      return sent;
    },
    [attachment, controller, send],
  );

  const pressMic = useCallback(() => {
    if (controller.getState().phase === 'listening') {
      controller.stopListening();
      return;
    }
    stop();
    void controller.listen();
  }, [controller, stop]);

  const onAction = useCallback(
    (target: AssistantActionTarget) => {
      controller.interrupt();
      if (target.kind === 'navigate') router.push(target.href);
      else if (target.kind === 'transmission') openSheet(target);
      else if (target.kind === 'consent') openSheet({ kind: 'consent' });
      else Linking.openURL(target.url).catch((e: unknown) => console.warn('[assistant] appel impossible', e));
    },
    [controller, openSheet, router],
  );

  // Soignant sans patient ni rendez-vous : le document doit être rangé dans un dossier, on choisit d'abord le patient.
  const attach = useCallback(() => {
    if (staff && role !== 'preleveur' && !appointmentId && !patientId) openSheet({ kind: 'picker', thenAttach: true });
    else void attachment.attach();
  }, [appointmentId, attachment, openSheet, patientId, role, staff]);

  const pickSuggestion = useCallback((message: string) => void send(message), [send]);

  const copy = useCallback(
    (text: string) => {
      Clipboard.setStringAsync(text)
        .then(() => toast('Réponse copiée', { type: 'success' }))
        .catch(() => toast('Copie impossible.', { type: 'error' }));
    },
    [toast],
  );

  const messages = chat.messages;

  const newConversation = () => {
    controller.interrupt();
    openConversation(null);
  };

  const confirmDelete = (conversation: AssistantConversationSummary) => {
    sheets.closeThen(null);
    deleteConversation(conversation.id)
      .then(() => {
        if (conversation.id === chat.conversationId) openConversation(null);
        qc.removeQueries({ queryKey: queryKeys.assistant.conversation(conversation.id) });
        void qc.invalidateQueries({ queryKey: queryKeys.assistant.conversations });
        toast('Conversation supprimée', { type: 'success' });
      })
      .catch((e: unknown) => {
        console.warn('[assistant] suppression impossible', e);
        toast('Suppression impossible. Réessayez.', { type: 'error' });
      });
  };

  // Accord donné : la question sur les résultats est reposée, cette fois avec le compte rendu.
  const resendLastQuestion = () => {
    const question = [...chat.messages].reverse().find((m) => m.role === 'user')?.text;
    if (question) send(question);
  };

  const sheet = sheets.sheet;
  const body =
    chat.conversationId && chat.detail.isError && !chat.detail.data ? (
      <ErrorState title="Conversation indisponible" error={chat.detail.error} onRetry={() => void chat.detail.refetch()} />
    ) : messages.length === 0 && chat.phase === 'idle' && !chat.detail.isLoading ? (
      <Suggestions
        firstName={firstName}
        suggestions={starterSuggestions(role, contextType, Boolean(patientId))}
        onPick={pickSuggestion}
      />
    ) : (
      <MessageList
        messages={messages}
        showLive={chat.phase !== 'idle'}
        live={chat.live}
        role={role}
        patientId={patientId}
        onAction={onAction}
        onRetry={retry}
        onCopy={copy}
      />
    );

  const content = (
    <View style={styles.screen}>
      <ScopeBar
        role={role}
        contextType={contextType}
        appointmentId={appointmentId}
        patientId={patientId}
        onClearContext={() => router.setParams({ context_type: undefined, context_id: undefined })}
        onPickPatient={() => openSheet({ kind: 'picker' })}
        onClearPatient={() => router.setParams(CLEARED_SCOPE)}
        onDictation={patientId && role !== 'preleveur' ? () => openSheet({ kind: 'dictation', patientId }) : undefined}
      />
      <View style={styles.thread}>{body}</View>
      <AssistantComposer
        onSend={sendFromComposer}
        onStop={stop}
        streaming={streaming}
        voice={voice.state}
        onMicPress={pressMic}
        onExitVoice={controller.interrupt}
        onAttach={attach}
        attachment={attachment.attachment}
        onClearAttachment={attachment.clear}
      />

      <HistorySheet
        visible={sheets.isOpen && sheet?.kind === 'history'}
        onClose={() => sheets.closeThen(null)}
        onDismissed={sheets.onDismissed}
        activeId={chat.conversationId}
        onOpen={(id) => {
          controller.interrupt();
          openConversation(id);
          sheets.closeThen(null);
        }}
        onDelete={(conversation) => sheets.closeThen({ kind: 'delete', conversation })}
      />
      <ConfirmSheet
        visible={sheets.isOpen && sheet?.kind === 'delete'}
        title="Supprimer la conversation ?"
        message="Elle sera définitivement effacée."
        confirmLabel="Supprimer"
        tone="destructive"
        onConfirm={() => sheet?.kind === 'delete' && confirmDelete(sheet.conversation)}
        onClose={() => sheets.closeThen(null)}
        onDismissed={sheets.onDismissed}
      />
      {role === 'patient' ? (
        <ResultsConsentSheet
          visible={sheets.isOpen && sheet?.kind === 'consent'}
          onClose={() => sheets.closeThen(null)}
          onDismissed={sheets.onDismissed}
          onGranted={resendLastQuestion}
        />
      ) : null}
      {staff ? (
        <PatientPickerSheet
          visible={sheets.isOpen && sheet?.kind === 'picker'}
          onClose={() => sheets.closeThen(null)}
          onDismissed={sheets.onDismissed}
          onPick={(id) => {
            const thenAttach = sheet?.kind === 'picker' && sheet.thenAttach;
            sheets.closeThen(thenAttach ? () => void attachment.attach(id) : null);
            router.setParams({ ...CLEARED_SCOPE, patient_id: id });
          }}
        />
      ) : null}
      {sheet?.kind === 'dictation' ? (
        <DictationSheet
          visible={sheets.isOpen}
          onClose={() => sheets.closeThen(null)}
          onDismissed={sheets.onDismissed}
          patientId={sheet.patientId}
          appointmentId={appointmentId}
          onCreateTransmission={(prefill) => sheets.closeThen({ kind: 'transmission', patientId: sheet.patientId, prefill })}
        />
      ) : null}
      {sheet?.kind === 'transmission' ? (
        <TransmissionEntrySheet
          visible={sheets.isOpen}
          onClose={() => sheets.closeThen(null)}
          patientId={sheet.patientId}
          prefill={sheet.prefill}
        />
      ) : null}
    </View>
  );

  // En-tête minimal : historique, titre de la conversation, nouvelle conversation.
  // Écran poussé (soignant) : le retour reste seul à gauche, les deux actions passent à droite.
  const historyAction = (
    <HeaderAction icon={History} accessibilityLabel="Historique des conversations" onPress={() => openSheet({ kind: 'history' })} />
  );
  const newAction = <HeaderAction icon={SquarePen} accessibilityLabel="Nouvelle conversation" onPress={newConversation} />;
  const title = (
    <AppText variant="headline" numberOfLines={1} accessibilityRole="header">
      {chat.title || 'Assistant Cary'}
    </AppText>
  );

  return (
    <ScreenFrame
      variant="compact"
      left={showBackButton ? <HeaderBackButton /> : historyAction}
      title={title}
      right={
        showBackButton ? (
          <View style={styles.headerActions}>
            {historyAction}
            {newAction}
          </View>
        ) : (
          newAction
        )
      }
    >
      {content}
    </ScreenFrame>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: { flex: 1, minHeight: 0, backgroundColor: c.background },
    thread: { flex: 1, minHeight: 0 },
    headerActions: { flexDirection: 'row' as const, alignItems: 'center' as const },
  };
}
