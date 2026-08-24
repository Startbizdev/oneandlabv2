import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { LoginBottomSheet } from '@/features/auth/components/LoginBottomSheet';
import { RegisterBottomSheet } from '@/features/auth/components/RegisterBottomSheet';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useAuthStore } from '@/store/auth-store';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { elevation, radius, spacing, useLayoutMetrics, responsiveValue, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const LOGO = require('../../../../assets/logo-cary.png');

export function WelcomeScreen() {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles, 'features_auth_screens_WelcomeScreen_tsx_styles');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const logoWidth = responsiveValue(layout, { compact: 190, default: 220, wide: 240 });
  const logoHeight = responsiveValue(layout, { compact: 68, default: 80, wide: 88 });
  const textMaxWidth = layout.contentMaxWidth;
  const logoAndroidMaxWidth = responsiveValue(layout, { compact: 220, default: 260, wide: 280 });

  function onLoginSuccess() {
    setLoginOpen(false);
    const role = useAuthStore.getState().user?.role;
    if (role) router.replace(getRoleHome(role));
  }

  function onEmailNotFound(email: string) {
    setLoginOpen(false);
    setPendingEmail(email);
    setRegisterOpen(true);
  }

  function onRegisterRole(role: RegisterRole) {
    setRegisterOpen(false);
    router.push({
      pathname: `/(auth)/register/${role}`,
      params: pendingEmail ? { email: pendingEmail } : {},
    });
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[c.primaryLight, c.background, c.background]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image
              source={LOGO}
              style={[
                styles.logo,
                Platform.OS === 'android' && { width: '88%', maxWidth: logoAndroidMaxWidth },
                { width: logoWidth, height: logoHeight },
              ]}
              resizeMode="contain"
              accessibilityLabel="Cary"
            />

            <AppText style={[styles.audienceKicker, { maxWidth: textMaxWidth }]}>
              Le soin vient à vous
            </AppText>

            <AppText style={[styles.tagline, { maxWidth: textMaxWidth }]}>
              Un infirmier ou une prise de sang{'\n'}
              <AppText style={styles.taglineAccent}>chez vous</AppText>
            </AppText>

            <View style={styles.taglineRule} />
          </View>

          <View style={styles.footer}>
            <View style={[styles.actionsCard, elevation.sm]}>
              <BiometricLoginButton onSuccess={onLoginSuccess} />
              <Button title="Se connecter" size="lg" fullWidth onPress={() => setLoginOpen(true)} />
              <Button
                title="Créer un compte"
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => {
                  setPendingEmail('');
                  setRegisterOpen(true);
                }}
              />
            </View>

            <AppText style={styles.legal}>
              En continuant, vous acceptez nos conditions d&apos;utilisation.
            </AppText>
            {user ? (
              <AppText style={styles.legal}>Session active sur cet appareil.</AppText>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      <LoginBottomSheet
        visible={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={onLoginSuccess}
        onEmailNotFound={onEmailNotFound}
        onRegisterPress={() => {
          setLoginOpen(false);
          setPendingEmail('');
          setRegisterOpen(true);
        }}
      />

      <RegisterBottomSheet
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        pendingEmail={pendingEmail}
        onSelectRole={onRegisterRole}
        onLoginPress={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  glowTop: {
    position: 'absolute' as const,
    top: -80,
    alignSelf: 'center' as const,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(28, 199, 181, 0.14)',
  },
  glowBottom: {
    position: 'absolute' as const,
    bottom: 120,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(22, 182, 214, 0.08)',
  },
  safe: { minWidth: 0, flex: 1 },
  scroll: { minWidth: 0, flex: 1 },
  scrollContent: {
    minWidth: 0,
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    justifyContent: 'space-between' as const,
    gap: spacing[6],
  },
  hero: {
    minWidth: 0,
    flexGrow: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: spacing[4],
    gap: spacing[5],
  },
  logo: {
    maxWidth: '100%' as const,
  },
  audienceKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    textAlign: 'center' as const,
    lineHeight: fontSize['2xl'] * 1.3,
    letterSpacing: -0.4,
  },
  taglineAccent: {
    fontFamily: fontFamily.extraBold,
    color: c.primary,
  },
  taglineRule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.primary,
    opacity: 0.35,
  },
  footer: {
    gap: spacing[4],
  },
  actionsCard: {
    backgroundColor: c.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  legal: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
    lineHeight: fontSize.xs * 1.55,
    paddingHorizontal: spacing[4],
  },
};
}
