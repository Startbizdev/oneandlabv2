import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { iconSize, radius, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { buildAssistantLink } from '@/features/assistant/utils/assistant-link';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { useAuthStore } from '@/store/auth-store';

/** Raccourci d'en-tête vers l'assistant : soignants seulement (le patient a l'onglet « Assistant »). */
export function headerAssistantHref(role: string | undefined): Href | null {
  return role === 'nurse' || role === 'pro' || role === 'preleveur' ? buildAssistantLink(role) : null;
}

/** Pastille ronde teintée (même encombrement qu'une icône d'en-tête) : se distingue des actions de l'écran. */
export function HeaderAssistantButton() {
  const router = useRouter();
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const href = headerAssistantHref(useAuthStore((s) => s.user?.role));
  if (!href) return null;
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir l'assistant IA"
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Sparkles size={iconSize.md} color={c.primaryDark} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

/** Actions par défaut des écrans racines d'onglet : assistant (soignant) puis notifications. */
export function TabHeaderActions() {
  return (
    <Row align="center">
      <HeaderAssistantButton />
      <HeaderNotificationBell />
    </Row>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    target: {
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badge: {
      width: 36,
      height: 36,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
    },
    pressed: {
      opacity: 0.6,
    },
  };
}
