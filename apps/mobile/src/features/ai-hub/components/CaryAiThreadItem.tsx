import type { AiAppointmentDraft, AiMessageSource } from '@oneandlab/shared-types';
import { memo } from 'react';
import { Button } from '@/components/ui/Button';
import type { AiBookingConsent } from '../hooks/use-ai-booking-draft';
import type { AiMessageRating } from '../hooks/use-cary-ai-hub';
import {
  isLocalAiMessageId,
  type PatientAiChatAttachment,
  type PatientAiChatMessage,
} from '../types/patient-ai-conversation';
import type { AiPromptSuggestion } from '../utils/ai-starter-suggestions';
import { resolveMessageRecap } from '../utils/resolve-message-recap';
import { CaryAiBookingRecapCard } from './CaryAiBookingRecapCard';
import { CaryAiMessageActions } from './CaryAiMessageActions';
import { CaryAiMessageBubble } from './CaryAiMessageBubble';
import { CaryAiSuggestionList } from './CaryAiSuggestionList';

export interface CaryAiThreadItemProps {
  message: PatientAiChatMessage;
  /** Premier message de Cary, avant toute question : questions de départ. */
  welcome: boolean;
  /** Dernier message du fil : relances et « Régénérer ». */
  last: boolean;
  busy: boolean;
  disclaimer?: string;
  bookingEnabled: boolean;
  confirmingDraft: boolean;
  bookingConsent: AiBookingConsent | null;
  starterSuggestions: AiPromptSuggestion[];
  followUpSuggestions: AiPromptSuggestion[];
  rating?: AiMessageRating;
  openingSourceKey: string | null;
  onPickSuggestion: (suggestion: AiPromptSuggestion) => void;
  onCopy: (message: PatientAiChatMessage) => void;
  /** Absent : le serveur a refusé de régénérer cette réponse (409), action masquée. */
  onRegenerate?: (messageId: string) => void;
  onRate: (messageId: string, rating: AiMessageRating) => void;
  onOpenSource: (source: AiMessageSource) => void;
  onAttachmentPress: (attachment: PatientAiChatAttachment) => void;
  onConfirmDraft: (draft: AiAppointmentDraft) => void;
  onEditRecapRow: (label: string) => void;
  /** Préleveur : pas de réservation par Cary, accès direct au formulaire. */
  onBook: () => void;
}

function slotFor(props: CaryAiThreadItemProps) {
  const { message, welcome, busy, bookingEnabled, confirmingDraft } = props;
  if (!bookingEnabled) {
    return welcome ? <Button title="Demander un prélèvement" variant="secondary" onPress={props.onBook} /> : null;
  }
  const recap = busy ? null : resolveMessageRecap(message);
  if (!recap) return null;
  return (
    <CaryAiBookingRecapCard
      draft={recap.draft}
      canConfirm={recap.canConfirm}
      confirming={recap.canConfirm && confirmingDraft}
      consent={props.bookingConsent}
      onConfirm={props.onConfirmDraft}
      onEditRow={props.onEditRecapRow}
    />
  );
}

/** Un message du fil Cary avec, selon sa place, récapitulatif, questions proposées et actions. */
export const CaryAiThreadItem = memo(function CaryAiThreadItem(props: CaryAiThreadItemProps) {
  const { message, welcome, last, busy } = props;
  if (message.role === 'user') {
    return <CaryAiMessageBubble message={message} onAttachmentPress={props.onAttachmentPress} />;
  }

  const suggestions = welcome ? props.starterSuggestions : last && !busy ? props.followUpSuggestions : [];
  const serverMessage = !isLocalAiMessageId(message.id);
  const onRegenerate = props.onRegenerate;
  const regenerable = last && !busy && (serverMessage || Boolean(message.clientMessageId));
  const actions = welcome ? null : (
    <CaryAiMessageActions
      onCopy={() => props.onCopy(message)}
      onRegenerate={regenerable && onRegenerate ? () => onRegenerate(message.id) : undefined}
      rating={props.rating}
      onRate={serverMessage ? (rating) => props.onRate(message.id, rating) : undefined}
    />
  );

  return (
    <CaryAiMessageBubble
      message={message}
      disclaimer={props.disclaimer}
      onOpenSource={props.onOpenSource}
      openingSourceKey={props.openingSourceKey}
      slot={slotFor(props)}
      actions={actions}
      footer={
        suggestions.length ? (
          <CaryAiSuggestionList suggestions={suggestions} onPick={props.onPickSuggestion} disabled={busy} />
        ) : null
      }
    />
  );
});
