import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { Camera, FileUp, ImageIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

interface Props {
  label?: string;
  attaching?: boolean;
  onPick: (source: CarePhotoPickSource) => void;
}

const OPTIONS: { source: CarePhotoPickSource; label: string; Icon: typeof Camera }[] = [
  { source: 'camera', label: 'Photo', Icon: Camera },
  { source: 'library', label: 'Galerie', Icon: ImageIcon },
  { source: 'file', label: 'Fichier', Icon: FileUp },
];

/** Boutons photo / galerie / fichier — étape ordonnance en mode vocal. */
export function CaryAiVoiceDocumentUpload({
  label = 'Joignez votre ordonnance',
  attaching,
  onPick,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={[styles.block, { backgroundColor: c.surfaceAlt, borderColor: hexToRgba(c.primary, 0.2) }]}>
      <AppText style={[styles.title, { color: c.textPrimary }]}>{label}</AppText>
      <AppText style={[styles.sub, { color: c.textSecondary }]}>
        {attaching ? 'Envoi en cours…' : 'Choisissez une source ci-dessous.'}
      </AppText>
      <Row gap={spacing[2]} style={styles.row}>
        {OPTIONS.map(({ source, label: optLabel, Icon }) => (
          <Pressable
            key={source}
            onPress={() => onPick(source)}
            disabled={attaching}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: pressed ? hexToRgba(c.primary, 0.14) : hexToRgba(c.primary, 0.08),
                opacity: attaching ? 0.55 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={optLabel}
          >
            <Icon size={iconSize.mdLg} color={c.primary} strokeWidth={2.1} />
            <AppText style={[styles.btnLabel, { color: c.primary }]}>{optLabel}</AppText>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    block: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing[3],
      gap: spacing[1.5],
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.3),
    },
    sub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.4),
    },
    row: {
      marginTop: spacing[0.5],
    },
    btn: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1],
      paddingVertical: spacing[2.5],
      borderRadius: radius.lg,
      minHeight: 72,
    },
    btnLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
    },
  };
}
