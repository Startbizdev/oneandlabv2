import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactElement } from 'react';
import type { NativeStackHeaderRightProps } from '@react-navigation/native-stack';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarPlus, Plus, UserPlus, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ICON_SIZE = 16;

export type HeaderActionKind = 'add' | 'book' | 'add-person';

const CONFIG: Record<
  HeaderActionKind,
  { Icon: LucideIcon; label: string; accessibilityLabel: string }
> = {
  add: { Icon: Plus, label: 'Nouveau', accessibilityLabel: 'Nouveau rendez-vous' },
  book: {
    Icon: CalendarPlus,
    label: 'Prendre un rendez-vous',
    accessibilityLabel: 'Prendre un rendez-vous',
  },
  'add-person': { Icon: UserPlus, label: 'Ajouter', accessibilityLabel: 'Ajouter un patient' },
};

interface Props {
  kind: HeaderActionKind;
  href?: Href;
  onPress?: () => void;
  /** Conservé pour les appels existants (cloche + action dans le header). */
  embedded?: boolean;
}

/** Marge droite identique sur tous les boutons d’action header (hors cloche). */
export const HEADER_ACTION_MARGIN_RIGHT = spacing[4];

/** Factory pour `navigation.setOptions({ headerRight })`. */
export function headerRightAction(
  kind: HeaderActionKind,
  opts: { href?: Href; onPress?: () => void } = {},
): (props: NativeStackHeaderRightProps) => ReactElement {
  return () => <HeaderActionButton kind={kind} href={opts.href} onPress={opts.onPress} />;
}

/** CTA header — gradient brand (identité Continuer). */
export function HeaderActionButton({ kind, href, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'navigation_HeaderActionButton_tsx_HeaderActionButton_styles');

  const router = useRouter();
  const { Icon, label, accessibilityLabel } = CONFIG[kind];
  const handlePress = onPress ?? (href ? () => router.push(href) : undefined);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[c.gradientStart, c.gradientEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.pill}
      >
        <Row gap={spacing[1.5]} align="center">
          <Icon size={ICON_SIZE} color={c.textInverse} strokeWidth={2.5} />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </Row>
      </LinearGradient>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    ...elevation.sm,
    shadowColor: '#16B6D6',
    shadowOpacity: 0.22,
  },
  pressed: {
    opacity: 0.92,
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    borderRadius: radius.lg,
    maxWidth: 148,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textInverse,
    letterSpacing: 0.1,
  },
};
}
