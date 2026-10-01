import { Pressable, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import type { AppointmentConversationMessage } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';

export const ATTACHMENT_PLACEHOLDER_BODY = '[Pièce jointe]';

export type ConversationAttachmentLink = {
  documentId: string;
  label: string;
  openFileName?: string;
};

/** Lien d’ouverture de la pièce jointe d’un message (PDF, image, autre). */
export function conversationAttachmentLink(
  msg: AppointmentConversationMessage,
): ConversationAttachmentLink | null {
  const documentId = msg.attachment?.id ?? msg.medical_document_id;
  if (!documentId) return null;
  const fileName = msg.attachment?.file_name?.trim() || null;
  const mimeType = msg.attachment?.mime_type?.toLowerCase() ?? '';
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');
  const fallbackLabel = isPdf
    ? 'Afficher le PDF'
    : isImage
      ? 'Afficher l’image'
      : 'Afficher la pièce jointe';
  const openFileName =
    fileName
    ?? (isPdf
      ? 'piece-jointe.pdf'
      : isImage
        ? `piece-jointe.${mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length)}`
        : undefined);
  return { documentId, label: fileName || fallbackLabel, openFileName };
}

interface Props {
  authorName: string;
  body: string;
  time: string;
  mine: boolean;
  status?: 'sending' | 'failed';
  attachment?: ConversationAttachmentLink | null;
  openingDocumentId?: string | null;
  onOpenAttachment?: (link: ConversationAttachmentLink) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

export function ConversationMessageBubble({
  authorName,
  body,
  time,
  mine,
  status,
  attachment,
  openingDocumentId = null,
  onOpenAttachment,
  onRetry,
  onDiscard,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const showBody = body && body !== ATTACHMENT_PLACEHOLDER_BODY;

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapOther]}>
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleOther,
          status === 'failed' && styles.bubbleFailed,
        ]}
      >
        {!mine ? <AppText style={styles.author}>{authorName}</AppText> : null}
        {showBody ? <AppText style={styles.body}>{body}</AppText> : null}
        {attachment ? (
          <Button
            title={attachment.label}
            variant="outline"
            size="sm"
            loading={openingDocumentId === attachment.documentId}
            disabled={openingDocumentId !== null}
            onPress={() => onOpenAttachment?.(attachment)}
          />
        ) : null}
      </View>
      {status === 'failed' ? (
        <Row gap={spacing[2]} align="center" style={styles.meta}>
          <AlertCircle size={iconSize.xs} color={c.error} strokeWidth={2.25} />
          <AppText style={styles.failedText}>Non envoyé</AppText>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Réessayer l’envoi du message"
            >
              <AppText style={styles.link}>Réessayer</AppText>
            </Pressable>
          ) : null}
          {onDiscard ? (
            <Pressable
              onPress={onDiscard}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Supprimer le message non envoyé"
            >
              <AppText style={styles.linkMuted}>Supprimer</AppText>
            </Pressable>
          ) : null}
        </Row>
      ) : (
        <AppText style={[styles.time, styles.meta]}>
          {status === 'sending' ? 'Envoi…' : time}
        </AppText>
      )}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: { maxWidth: '88%' as const, gap: spacing[1] },
    wrapMine: { alignSelf: 'flex-end' as const, alignItems: 'flex-end' as const },
    wrapOther: { alignSelf: 'flex-start' as const, alignItems: 'flex-start' as const },
    bubble: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing[3],
      gap: spacing[2],
    },
    bubbleMine: { backgroundColor: c.primaryLight },
    bubbleOther: { backgroundColor: c.surface },
    bubbleFailed: { borderColor: c.error },
    author: { ...font.medium, fontSize: fontSize.xs, color: c.textSecondary },
    body: { ...font.regular, fontSize: fontSize.base, color: c.textPrimary },
    meta: { paddingHorizontal: spacing[1] },
    time: { ...font.regular, fontSize: fontSize.xs, color: c.textTertiary },
    failedText: { ...font.medium, fontSize: fontSize.xs, color: c.error },
    link: { ...font.semiBold, fontSize: fontSize.xs, color: c.textLink },
    linkMuted: { ...font.medium, fontSize: fontSize.xs, color: c.textSecondary },
  };
}
