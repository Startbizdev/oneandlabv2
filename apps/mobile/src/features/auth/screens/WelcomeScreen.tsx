import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { LegalLinks } from '@/features/auth/components/LegalLinks';
import { LoginBottomSheet } from '@/features/auth/components/LoginBottomSheet';
import { RegisterBottomSheet } from '@/features/auth/components/RegisterBottomSheet';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useAuthStore } from '@/store/auth-store';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import {
  spacing,
  useLayoutMetrics,
  responsiveValue,
  AppText,
  useStyles,
  type Theme,
} from '@/theme';

const LOGO = require('../../../../assets/logo-cary.png');

type WelcomeSheet = 'login' | 'register';

export function WelcomeScreen() {
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { login } = useLocalSearchParams<{ login?: string }>();
  const [sheet, setSheet] = useState<WelcomeSheet | null>(login === '1' ? 'login' : null);
  const [pendingEmail, setPendingEmail] = useState('');
  /** Suite d'une fermeture demandée : sheet suivante ou navigation, lancée une fois la sheet native retirée. */
  const afterSheetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (login === '1') setSheet('login');
  }, [login]);

  const logoWidth = responsiveValue(layout, { compact: 132, default: 148, wide: 164 });
  const logoHeight = responsiveValue(layout, { compact: 48, default: 54, wide: 60 });
  const illustrationSize = responsiveValue(layout, { compact: 200, default: 240, wide: 280 });
  const contentWidth = { width: '100%' as const, maxWidth: layout.contentMaxWidth };

  function closeSheet() {
    afterSheetRef.current = null;
    setSheet(null);
  }

  function closeSheetThen(next: () => void) {
    afterSheetRef.current = next;
    setSheet(null);
  }

  function runAfterSheet() {
    const next = afterSheetRef.current;
    afterSheetRef.current = null;
    next?.();
  }

  function goHome() {
    const role = useAuthStore.getState().user?.role;
    if (role) router.replace(getRoleHome(role));
  }

  function openRegister(email = '') {
    setPendingEmail(email);
    setSheet('register');
  }

  function onRegisterRole(role: RegisterRole) {
    const params = pendingEmail ? { email: pendingEmail } : {};
    closeSheetThen(() => router.push({ pathname: `/(auth)/register/${role}`, params }));
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={LOGO}
            style={{ width: logoWidth, height: logoHeight }}
            resizeMode="contain"
            accessibilityLabel="Cary"
          />

          <View style={[styles.hero, contentWidth]}>
            <Image
              source={ILLUSTRATIONS.welcome}
              style={{ width: illustrationSize, height: illustrationSize }}
              resizeMode="contain"
              accessible={false}
            />
            <AppText variant="display" style={styles.centered} accessibilityRole="header">
              Le soin vient à vous
            </AppText>
            <AppText variant="secondary" style={styles.centered}>
              Un infirmier ou une prise de sang, chez vous.
            </AppText>
          </View>

          <View style={[styles.footer, contentWidth]}>
            <Button title="Se connecter" size="lg" fullWidth onPress={() => setSheet('login')} />
            <BiometricLoginButton onSuccess={goHome} />
            <Button
              title="Créer un compte"
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => openRegister()}
            />
            <View style={styles.legal}>
              <AppText variant="caption" style={styles.centered}>
                En continuant, vous acceptez :
              </AppText>
              <LegalLinks />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Connexion réussie : `useAuthGuard` ouvre l'accueil du rôle dès que la sheet est retirée. */}
      <LoginBottomSheet
        visible={sheet === 'login'}
        onClose={closeSheet}
        onDismissed={runAfterSheet}
        onSuccess={closeSheet}
        onEmailNotFound={(email) => closeSheetThen(() => openRegister(email))}
        onRegisterPress={() => closeSheetThen(() => openRegister())}
      />

      <RegisterBottomSheet
        visible={sheet === 'register'}
        onClose={closeSheet}
        onDismissed={runAfterSheet}
        pendingEmail={pendingEmail}
        onSelectRole={onRegisterRole}
        onLoginPress={() => closeSheetThen(() => setSheet('login'))}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: { minWidth: 0, flex: 1, backgroundColor: c.background },
    safe: { minWidth: 0, flex: 1 },
    scroll: { minWidth: 0, flex: 1 },
    scrollContent: {
      minWidth: 0,
      flexGrow: 1,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[4],
      gap: spacing[8],
    },
    hero: {
      minWidth: 0,
      alignItems: 'center' as const,
      gap: spacing[3],
    },
    centered: { textAlign: 'center' as const },
    footer: { gap: spacing[3] },
    legal: { gap: spacing[1], paddingTop: spacing[2] },
  };
}
