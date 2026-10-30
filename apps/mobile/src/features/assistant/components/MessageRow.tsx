import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantMessage } from '@oneandlab/shared-types';
import { memo } from 'react';
import { View } from 'react-native';
import { Copy, FileText } from 'lucide-react-native';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { AppText, ICON_STROKE_WIDTH, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { AssistantActionTarget } from '../utils/assistant-actions';
import { ActionCards } from './ActionCards';
import { AssistantMarkdown } from './AssistantMarkdown';
import { EmergencyCard, emergencyNumbers } from './EmergencyCard';

/** Question de l'utilisateur ; le fichier joint s'affiche juste dessous, comme une pièce jointe de courriel. */
export function UserBubble({ text, attachment }: { text: string; attachment?: string }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.userTurn}>
      <View style={styles.userBubble}>
        <AppText variant="body" style={styles.userText} selectable>
          {text}
        </AppText>
      </View>
      {attachment ? (
        <View style={styles.attachment} accessibilityLabel={`Pièce jointe : ${attachment}`}>
          <FileText size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          <AppText variant="caption" style={styles.attachmentName} numberOfLines={1}>
            {attachment}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** Nom du fichier joint à un message de l'utilisateur. */
export function attachmentName(message: Pick<AssistantMessage, 'actions'>): string | undefined {
  return message.actions.find((a) => a.type === 'attachment')?.label || undefined;
}

type Props = {
  message: AssistantMessage;
  role: MobileRole;
  patientId?: string;
  onAction: (target: AssistantActionTarget) => void;
  onCopy: (text: string) => void;
};

/** Message enregistré : ne se re-rend ni pendant la saisie ni pendant la réponse en direct. */
export const MessageRow = memo(function MessageRow({ message, role, patientId, onAction, onCopy }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (message.role === 'user') return <UserBubble text={message.text} attachment={attachmentName(message)} />;
  const emergency = message.actions.some((a) => a.type === 'call_emergency');
  if (emergency) return <EmergencyCard message={message.text} numbers={emergencyNumbers(message.actions)} />;
  return (
    <View style={styles.assistant}>
      {message.text ? <AssistantMarkdown text={message.text} /> : null}
      <ActionCards actions={message.actions} role={role} patientId={patientId} onAction={onAction} />
      {message.text ? (
        <View style={styles.tools}>
          <IconActionButton label="Copier la réponse" onPress={() => onCopy(message.text)}>
            <Copy size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
          </IconActionButton>
        </View>
      ) : null}
    </View>
  );
});

function buildStyles({ colors: c }: Theme) {
  return {
    userTurn: { alignSelf: 'flex-end' as const, alignItems: 'flex-end' as const, gap: spacing[1.5], maxWidth: '80%' as const },
    attachment: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      maxWidth: '100%' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1.5],
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
    },
    attachmentName: { color: c.textSecondary, flexShrink: 1 },
    userBubble: {
      alignSelf: 'flex-end' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      borderRadius: radius.xl,
      backgroundColor: c.surfaceAlt,
    },
    userText: { flexShrink: 1 },
    assistant: { gap: spacing[3] },
    tools: { flexDirection: 'row' as const, marginLeft: -spacing[2], marginTop: -spacing[2] },
  };
}
