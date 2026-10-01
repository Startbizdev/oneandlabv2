import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, BellRing, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { LegalLinks } from '@/features/auth/components/LegalLinks';
import { LoginBottomSheet } from '@/features/auth/components/LoginBottomSheet';
import { RegisterBottomSheet } from '@/features/auth/components/RegisterBottomSheet';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useAuthStore } from '@/store/auth-store';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import {
  elevation,
  hexToRgba,
  iconSize,
  radius,
  spacing,
  useLayoutMetrics,
  responsiveValue,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

const LOGO = require('../../../../assets/logo-cary.png');

/** Affirmations déjà publiées par Cary (mentions légales, politique de confidentialité, page patients). */
const TRUST_SIGNALS: { Icon: LucideIcon; text: string }[] = [
  { Icon: ShieldCheck, text: 'Données de santé hébergées en France, chez un hébergeur certifié HDS' },
  { Icon: BadgeCheck, text: 'Infirmiers et laboratoires vérifiés par Cary' },
  { Icon: BellRing, text: 'Confirmation et rappel à chaque étape' },
];

export function WelcomeScreen() {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { login } = useLocalSearchParams<{ login?: string }>();
  const [loginOpen, setLoginOpen] = useState(login === '1');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (login === '1') setLoginOpen(true);
  }, [login]);

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

            <View style={[styles.trustList, { maxWidth: textMaxWidth }]}>
              {TRUST_SIGNALS.map(({ Icon, text }) => (
                <Row key={text} align="start" gap={spacing[3]}>
                  <Icon size={iconSize.md} color={c.primary} strokeWidth={2} />
                  <AppText style={styles.trustText}>{text}</AppText>
                </Row>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <View style={[styles.actionsCard, elevation.sm]}>
              <Button title="Se connecter" size="lg" fullWidth onPress={() => setLoginOpen(true)} />
              <BiometricLoginButton onSuccess={onLoginSuccess} />
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

            <View>
              <AppText style={styles.legal}>
                En continuant, vous acceptez nos conditions d&apos;utilisation et notre politique de
                confidentialité.
              </AppText>
              <LegalLinks />
            </View>
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

function buildStyles({ colors: c, fontSize }: Theme) {
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
    backgroundColor: hexToRgba(c.primary, 0.14),
  },
  glowBottom: {
    position: 'absolute' as const,
    bottom: 120,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: hexToRgba(c.gradientEnd, 0.08),
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
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
  tagline: {
    ...font.headingSemiBold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    textAlign: 'center' as const,
    lineHeight: fontSize['2xl'] * 1.3,
    letterSpacing: -0.4,
  },
  taglineAccent: {
    ...font.headingExtraBold,
    color: c.primary,
  },
  taglineRule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.primary,
    opacity: 0.35,
  },
  trustList: {
    width: '100%' as const,
    gap: spacing[3],
    paddingTop: spacing[1],
  },
  trustText: {
    flex: 1,
    minWidth: 0,
    ...font.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
    color: c.textSecondary,
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
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
    lineHeight: fontSize.xs * 1.55,
    paddingHorizontal: spacing[4],
  },
};
}
