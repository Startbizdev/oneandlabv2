import type { ReactElement } from 'react';
import type { NativeStackHeaderRightProps } from '@react-navigation/native-stack';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarPlus, Plus, UserPlus, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ICON_SIZE = 14;

export type HeaderActionKind = 'add' | 'book' | 'add-person';

const CONFIG: Record<
  HeaderActionKind,
  { Icon: LucideIcon; label: string; accessibilityLabel: string }
> = {
  add: { Icon: Plus, label: 'Nouveau', accessibilityLabel: 'Nouveau rendez-vous' },
  book: { Icon: CalendarPlus, label: 'Réserver', accessibilityLabel: 'Réserver un rendez-vous' },
  'add-person': { Icon: UserPlus, label: 'Ajouter', accessibilityLabel: 'Ajouter un patient' },
};

interface Props {
  kind: HeaderActionKind;
  href?: Href;
  onPress?: () => void;
  /** Dans HeaderBarActions : pas de marge droite (gérée par le conteneur). */
  embedded?: boolean;
}

/** Marge droite identique sur tous les boutons d’action header (hors cloche). */
export const HEADER_ACTION_MARGIN_RIGHT = spacing[4];

/** Factory pour `navigation.setOptions({ headerRight })`. */
export function headerRightAction(
  kind: HeaderActionKind,
  opts: { href?: Href; onPress?: () => void } = {},
): (props: NativeStackHeaderRightProps) => ReactElement {
  return () => (
    <View style={styles.headerRightWrap}>
      <HeaderActionButton kind={kind} href={opts.href} onPress={opts.onPress} />
    </View>
  );
}

/** CTA header — gradient brand (identité Continuer). */
export function HeaderActionButton({ kind, href, onPress, embedded }: Props) {
  const router = useRouter();
  const { Icon, label, accessibilityLabel } = CONFIG[kind];
  const handlePress = onPress ?? (href ? () => router.push(href) : undefined);

  return (
    <View style={[styles.outer, embedded && styles.outerEmbedded]}>
      <Pressable
        onPress={handlePress}
        disabled={!handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.pill}
        >
          <Icon size={ICON_SIZE} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRightWrap: {
    paddingRight: HEADER_ACTION_MARGIN_RIGHT,
    paddingLeft: spacing[1],
  },
  outer: {
    paddingLeft: spacing[1],
  },
  outerEmbedded: {
    paddingLeft: 0,
  },
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...elevation.sm,
    shadowColor: '#16B6D6',
    shadowOpacity: 0.22,
  },
  pressed: {
    opacity: 0.92,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 7,
    borderRadius: radius.lg,
    maxWidth: 124,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textInverse,
    letterSpacing: 0.1,
  },
});
