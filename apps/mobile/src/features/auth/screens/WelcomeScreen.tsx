import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const LOGO = require('../../../../assets/logo-cary.png');

export function WelcomeScreen() {
  const c = useAppColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

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
        <View style={styles.main}>
          <View style={styles.hero}>
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Cary"
            />

            <Text style={styles.tagline}>
              le soin, chez vous{' '}
              <Text style={styles.taglineAccent}>rapidement</Text>
            </Text>

            <View style={styles.taglineRule} />
          </View>

          <View style={styles.footer}>
            <View style={[styles.actionsCard, elevation.sm]}>
              <BiometricLoginButton onSuccess={onLoginSuccess} />
              <Button title="Connexion par email" size="lg" fullWidth onPress={() => setLoginOpen(true)} />
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

            <Text style={styles.legal}>
              En continuant, vous acceptez nos conditions d&apos;utilisation.
            </Text>
            {user ? (
              <Text style={styles.legal}>Session active sur cet appareil.</Text>
            ) : null}
          </View>
        </View>
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
    flex: 1,
    backgroundColor: c.background,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(28, 199, 181, 0.14)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 120,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(22, 182, 214, 0.08)',
  },
  safe: { flex: 1 },
  main: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing[8],
    gap: spacing[5],
  },
  logo: {
    width: 220,
    height: 80,
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    textAlign: 'center',
    lineHeight: fontSize['2xl'] * 1.3,
    letterSpacing: -0.4,
    maxWidth: 300,
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
    paddingBottom: spacing[2],
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
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.55,
    paddingHorizontal: spacing[4],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_auth_screens_WelcomeScreen_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
