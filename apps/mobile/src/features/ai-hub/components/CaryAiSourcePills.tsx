import type { AiMessageSource, AiMessageSourceType } from '@oneandlab/shared-types';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, FileText, FlaskConical, Pill, type LucideIcon } from 'lucide-react-native';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const SOURCE_ICONS: Record<AiMessageSourceType, LucideIcon> = {
  document: FileText,
  appointment: CalendarDays,
  result: FlaskConical,
  prescription: Pill,
};

const PILL_HEIGHT = spacing[8];

interface Props {
  sources: AiMessageSource[];
  openingKey?: string | null;
  onOpen: (source: AiMessageSource) => void;
}

export function sourceKey(source: AiMessageSource): string {
  return `${source.type}:${source.id}`;
}

/** Données du dossier sur lesquelles s'appuie la réponse : une pastille ouvre le document ou le rendez-vous. */
export function CaryAiSourcePills({ sources, openingKey, onOpen }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (sources.length === 0) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Sources">
      {sources.map((source) => {
        const Icon = SOURCE_ICONS[source.type];
        const opening = openingKey === sourceKey(source);
        return (
          <Pressable
            key={sourceKey(source)}
            onPress={() => onOpen(source)}
            disabled={opening}
            hitSlop={(MIN_TOUCH_TARGET - PILL_HEIGHT) / 2}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir ${source.label}`}
            accessibilityState={{ busy: opening }}
          >
            {opening ? (
              <ActivityIndicator size="small" color={c.textSecondary} />
            ) : (
              <Icon size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            )}
            <AppText variant="caption" style={styles.label}>
              {source.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing[2] },
    pill: {
      maxWidth: '100%' as const,
      minHeight: PILL_HEIGHT,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    label: { ...font.medium, color: c.textPrimary, flexShrink: 1 },
  };
}
