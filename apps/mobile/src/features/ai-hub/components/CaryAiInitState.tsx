import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { aiChatErrorMessage } from '../utils/ai-chat-errors';

interface Props {
  /** `null` : ouverture en cours. */
  error: unknown;
  onRetry: () => void;
  /** Conversation d'objet en échec : proposer la conversation générale. */
  onOpenGeneral?: () => void;
}

/** Ouverture de la conversation : chargement, ou erreur explicite avec « Réessayer ». */
export function CaryAiInitState({ error, onRetry, onOpenGeneral }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  if (!error) {
    return (
      <View style={[styles.fill, styles.centered]}>
        <ActivityIndicator color={c.primary} accessibilityLabel="Chargement de Cary" />
      </View>
    );
  }
  return (
    <View style={styles.fill}>
      <EmptyState
        illustration="error"
        title="Cary est indisponible"
        description={aiChatErrorMessage(error)}
        actionLabel="Réessayer"
        onAction={onRetry}
      />
      {onOpenGeneral ? (
        <View style={styles.centered}>
          <Button title="Ouvrir la conversation générale" variant="ghost" onPress={onOpenGeneral} />
        </View>
      ) : null}
    </View>
  );
}

/** EmptyState dimensionne son bouton en pourcentage : il lui faut une largeur définie, pas un parent centré. */
function buildStyles() {
  return {
    fill: { flex: 1, justifyContent: 'center' as const, gap: spacing[2] },
    centered: { alignItems: 'center' as const },
  };
}
