import { View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { aiChatErrorMessage } from '../utils/ai-chat-errors';
import { spacing, iconSize, AppText, useStyles, font, type Theme, ICON_STROKE_WIDTH } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  error: unknown;
  onRetry: () => void;
  onEdit: () => void;
}

/** Sous le message utilisateur non envoyé : cause + « Réessayer » / « Modifier ». */
export function CaryAiSendFailureNotice({ error, onRetry, onEdit }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Row align="center" gap={spacing[1.5]} justify="end">
        <AlertCircle size={iconSize.sm} color={c.error} strokeWidth={ICON_STROKE_WIDTH} />
        <AppText variant="caption" style={styles.title}>
          Message non envoyé
        </AppText>
      </Row>
      <AppText variant="secondary" style={styles.text}>
        {aiChatErrorMessage(error)}
      </AppText>
      <Row gap={spacing[2]} justify="end">
        <Button title="Modifier" variant="ghost" size="sm" onPress={onEdit} />
        <Button title="Réessayer" variant="outline" size="sm" onPress={onRetry} />
      </Row>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      alignSelf: 'flex-end' as const,
      maxWidth: '88%' as const,
      gap: spacing[1],
      marginTop: spacing[2],
    },
    title: { ...font.semiBold, color: c.error },
    text: { textAlign: 'right' as const },
  };
}
