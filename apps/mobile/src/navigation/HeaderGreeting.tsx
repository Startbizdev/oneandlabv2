import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { APP_HEADER_INNER_H_PADDING } from '@/components/navigation/header-layout';
import { useAuthStore } from '@/store/auth-store';

import { fontFamily, fontSize } from '@/theme/typography';

function formatFirstName(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return 'vous';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Salutation à gauche du header (remplace le logo Cary sur l’onglet RDV). */
export function HeaderGreeting() {
  const styles = useThemedStyles(buildStyles, 'navigation_HeaderGreeting_tsx_HeaderGreeting_styles');

  const firstName = useAuthStore((s) => s.user?.first_name);

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>
        Bonjour {formatFirstName(firstName)} !
      </Text>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    paddingLeft: APP_HEADER_INNER_H_PADDING,
  },
  text: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
};
}
