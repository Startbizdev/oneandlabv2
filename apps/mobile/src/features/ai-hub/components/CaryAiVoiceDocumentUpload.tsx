import { Pressable, StyleSheet, View } from 'react-native';
import { Camera, FileUp, ImageIcon, type LucideIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { useAppColors } from '@/theme/use-app-colors';
import { MIN_TOUCH_TARGET, radius, spacing, iconSize, AppText, useStyles, type Theme, ICON_STROKE_WIDTH } from '@/theme';

interface Props {
  label?: string;
  attaching?: boolean;
  onPick: (source: CarePhotoPickSource) => void;
}

const OPTIONS: { source: CarePhotoPickSource; label: string; Icon: LucideIcon }[] = [
  { source: 'camera', label: 'Photo', Icon: Camera },
  { source: 'library', label: 'Galerie', Icon: ImageIcon },
  { source: 'file', label: 'Fichier', Icon: FileUp },
];

/** Étape ordonnance du mode vocal : trois sources, une seule intention. */
export function CaryAiVoiceDocumentUpload({ label = 'Joignez votre ordonnance', attaching, onPick }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.block}>
      <AppText variant="headline">{label}</AppText>
      {attaching ? (
        <AppText variant="secondary" accessibilityLiveRegion="polite">
          Envoi en cours…
        </AppText>
      ) : null}
      <Row gap={spacing[2]}>
        {OPTIONS.map(({ source, label: optLabel, Icon }) => (
          <Pressable
            key={source}
            onPress={() => onPick(source)}
            disabled={attaching}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed, attaching && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={optLabel}
          >
            <Icon size={iconSize.lg} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
            <AppText variant="caption" style={styles.optionLabel}>
              {optLabel}
            </AppText>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    block: { gap: spacing[2] },
    option: {
      flex: 1,
      minWidth: 0,
      minHeight: MIN_TOUCH_TARGET + spacing[6],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1],
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    optionPressed: { backgroundColor: c.surfaceAlt },
    optionLabel: { color: c.textPrimary },
    disabled: { opacity: 0.5 },
  };
}
