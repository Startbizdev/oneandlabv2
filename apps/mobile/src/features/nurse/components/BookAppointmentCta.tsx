import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalendarPlus } from 'lucide-react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function BookAppointmentCta() {
  const router = useRouter();

  const onPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(nurse)/appointments/new' as never);
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Prendre un rendez-vous"
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        >
          <CalendarPlus size={18} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.label}>Prendre un rendez-vous</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  pressable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...elevation.sm,
    shadowColor: '#16B6D6',
    shadowOpacity: 0.28,
  },
  pressed: { opacity: 0.94 },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xl,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
});
