import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ICON_STROKE_WIDTH, iconSize, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { AiMessageRating } from '../hooks/use-cary-ai-hub';

interface Props {
  onCopy: () => void;
  onRegenerate?: () => void;
  rating?: AiMessageRating;
  onRate?: (rating: AiMessageRating) => void;
}

/** Sous une réponse : copier, régénérer (dernière réponse), avis pouce levé / baissé. */
export function CaryAiMessageActions({ onCopy, onRegenerate, rating, onRate }: Props) {
  const c = useAppColors();
  const iconColor = (active: boolean) => (active ? c.primary : c.textTertiary);
  return (
    <Row gap={spacing[2]} align="center">
      <IconActionButton label="Copier la réponse" onPress={onCopy}>
        <Copy size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
      </IconActionButton>
      {onRegenerate ? (
        <IconActionButton label="Régénérer la réponse" onPress={onRegenerate}>
          <RefreshCw size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        </IconActionButton>
      ) : null}
      {onRate ? (
        <>
          <IconActionButton
            label={rating === 'up' ? 'Réponse jugée utile' : 'Réponse utile'}
            onPress={() => onRate('up')}
            disabled={Boolean(rating)}
          >
            <ThumbsUp size={iconSize.sm} color={iconColor(rating === 'up')} strokeWidth={ICON_STROKE_WIDTH} />
          </IconActionButton>
          <IconActionButton
            label={rating === 'down' ? 'Réponse jugée peu utile' : 'Réponse peu utile'}
            onPress={() => onRate('down')}
            disabled={Boolean(rating)}
          >
            <ThumbsDown size={iconSize.sm} color={iconColor(rating === 'down')} strokeWidth={ICON_STROKE_WIDTH} />
          </IconActionButton>
        </>
      ) : null}
    </Row>
  );
}
