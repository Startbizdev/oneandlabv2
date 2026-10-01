import { View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
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
      <Row align="center" gap={spacing[1.5]} style={styles.titleRow}>
        <AlertCircle size={iconSize.sm} color={c.error} strokeWidth={2} />
        <AppText style={styles.title}>Message non envoyé</AppText>
      </Row>
      <AppText style={styles.text}>
        {getErrorMessage(error, 'Cary est momentanément indisponible. Vérifiez votre connexion puis réessayez.')}
      </AppText>
      <Row gap={spacing[2]} justify="end">
        <Button title="Modifier" variant="ghost" size="sm" onPress={onEdit} />
        <Button title="Réessayer" variant="outline" size="sm" onPress={onRetry} />
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      alignSelf: 'flex-end' as const,
      maxWidth: '88%' as const,
      gap: spacing[1.5],
      marginTop: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: c.errorLight,
    },
    titleRow: { minWidth: 0 },
    title: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.error,
    },
    text: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
  };
}
