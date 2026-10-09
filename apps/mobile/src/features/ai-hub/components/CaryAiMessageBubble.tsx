import type { AiMessageSource } from '@oneandlab/shared-types';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { AppText, radius, spacing, useStyles, type Theme } from '@/theme';
import type { PatientAiChatAttachment, PatientAiChatMessage } from '../types/patient-ai-conversation';
import { assistantMessageDisplayText } from '../utils/ai-message-display';
import { CaryAiEmergencyCard } from './CaryAiEmergency';
import { CaryAiSourcePills } from './CaryAiSourcePills';
import { CaryMarkdown } from './CaryMarkdown';
import { PatientAiAttachmentThumbnail } from './PatientAiAttachmentThumbnail';

interface Props {
  message: PatientAiChatMessage;
  disclaimer?: string;
  onAttachmentPress?: (attachment: PatientAiChatAttachment) => void;
  onOpenSource?: (source: AiMessageSource) => void;
  openingSourceKey?: string | null;
  /** Récapitulatif de demande ou action propre au rôle. */
  slot?: ReactNode;
  /** Questions de relance, sous la dernière réponse uniquement. */
  footer?: ReactNode;
  actions?: ReactNode;
}

/**
 * Texte assistant affiché, ou message de repli si la réponse est vide.
 * Une réponse d'urgence est portée par sa carte : son contenu (titre et consignes) n'est pas répété.
 */
export function assistantBubbleText(message: PatientAiChatMessage, disclaimer: string | undefined, hasSlot: boolean): string {
  if (message.metadata?.emergency) return '';
  const text = assistantMessageDisplayText(message.text, disclaimer);
  if (text) return text;
  if (hasSlot) return 'Voici le récapitulatif de votre demande.';
  if (message.interrupted) return '';
  return "Je n'ai pas bien compris. Pouvez-vous reformuler ?";
}

export function CaryAiMessageBubble({
  message,
  disclaimer,
  onAttachmentPress,
  onOpenSource,
  openingSourceKey,
  slot,
  footer,
  actions,
}: Props) {
  const styles = useStyles(buildStyles);
  const attachment = message.metadata?.attachment;

  if (message.role === 'user') {
    const mediaOnly = Boolean(attachment) && !message.text;
    return (
      <Row justify="end" style={styles.userRow}>
        <View style={[styles.bubbleUser, mediaOnly && styles.bubbleUserMediaOnly]}>
          {attachment ? (
            <PatientAiAttachmentThumbnail
              attachment={attachment}
              variant="message"
              compact={mediaOnly}
              onPress={onAttachmentPress ? () => onAttachmentPress(attachment) : undefined}
            />
          ) : null}
          {message.text ? <CaryMarkdown text={message.text} /> : null}
        </View>
      </Row>
    );
  }

  const emergency = message.metadata?.emergency;
  const sources = message.metadata?.sources ?? [];
  const text = assistantBubbleText(message, disclaimer, Boolean(slot));
  return (
    <View style={styles.assistant}>
      {emergency ? <CaryAiEmergencyCard emergency={emergency} /> : null}
      {text ? <CaryMarkdown text={text} /> : null}
      {message.interrupted ? (
        <AppText variant="caption" style={styles.interrupted}>
          Réponse interrompue
        </AppText>
      ) : null}
      {sources.length && onOpenSource ? (
        <CaryAiSourcePills sources={sources} onOpen={onOpenSource} openingKey={openingSourceKey} />
      ) : null}
      {slot ? <View style={styles.slot}>{slot}</View> : null}
      {actions}
      {footer}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    userRow: { minWidth: 0 },
    bubbleUser: {
      maxWidth: '85%' as const,
      borderRadius: radius.xl,
      borderBottomRightRadius: radius.sm,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      backgroundColor: c.surfaceAlt,
      gap: spacing[2],
    },
    bubbleUserMediaOnly: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      maxWidth: '72%' as const,
      backgroundColor: 'transparent',
    },
    assistant: { minWidth: 0, gap: spacing[3], paddingVertical: spacing[1] },
    interrupted: { fontStyle: 'italic' as const },
    slot: { minWidth: 0 },
  };
}
