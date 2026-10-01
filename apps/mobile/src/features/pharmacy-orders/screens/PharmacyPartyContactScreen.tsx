import { useAppColors } from '@/theme/use-app-colors';
import { Fragment } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { fetchUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { personDisplayName } from '../utils/order-display';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { Cluster, Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, spacing, iconSize, avatarSize, AppText, useStyles, type Theme } from '@/theme';

const INTERNAL_EMAIL_SUFFIX = '@patients.internal.local';

function roleLabel(role?: string | null, emploi?: string | null): string {
  if (emploi?.trim()) return emploi.trim();
  if (role === 'nurse') return 'Infirmier·ère';
  if (role === 'pro') return 'Professionnel de santé';
  return 'Professionnel';
}

/** Fiche contact du professionnel demandeur, vue par l'officine. */
export function PharmacyPartyContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id ?? '');
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const sectionStyles = useStyles(buildSettingsStyles);
  const { show: toast } = useToast();

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(userId),
    queryFn: async () => {
      const res = await fetchUser(userId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Profil introuvable');
      return res.data;
    },
    enabled: !!userId,
  });

  const profile = profileQ.data;

  if (profileQ.isLoading) {
    return (
      <StackChromeScreen>
        <ActivityIndicator style={styles.loader} color={c.primary} />
      </StackChromeScreen>
    );
  }

  if (!profile) {
    return (
      <StackChromeScreen>
        <View style={styles.errorWrap}>
          <ErrorState title="Fiche indisponible" error={profileQ.error} onRetry={() => void profileQ.refetch()} />
        </View>
      </StackChromeScreen>
    );
  }

  const name = personDisplayName(profile.first_name, profile.last_name, 'Professionnel');
  const address = parseProfileAddress(profile.address);
  const phone = profile.phone?.trim() || '';
  const rawEmail = profile.email?.trim() || '';
  const email = rawEmail && !rawEmail.endsWith(INTERNAL_EMAIL_SUFFIX) ? rawEmail : '';
  const phoneActions = buildPhoneContactActions(phone);

  const lines: Array<{ label: string; value: string }> = [];
  if (phone) lines.push({ label: 'Téléphone', value: phone });
  if (email) lines.push({ label: 'E-mail', value: email });
  if (address?.label) lines.push({ label: 'Adresse', value: address.label });

  const openEmail = () => {
    Linking.openURL(`mailto:${email}`).catch((error: unknown) => {
      if (__DEV__) console.warn('[pharmacy-contact] ouverture e-mail impossible', error);
      toast('Action indisponible sur cet appareil', { type: 'error' });
    });
  };

  return (
    <StackChromeScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <Cluster
          gap={spacing[3]}
          leading={<ProfileAvatar profileImageUrl={profile.profile_image_url} seed={profile.id ?? name} size={avatarSize.md} />}
        >
          <View style={styles.heroText}>
            <AppText variant="title" accessibilityRole="header">
              {name}
            </AppText>
            <AppText variant="secondary">{roleLabel(profile.role, profile.emploi)}</AppText>
          </View>
        </Cluster>

        {phoneActions.length > 0 || email ? (
          <Row gap={spacing[2]} wrap>
            {phoneActions.map((action) => (
              <View key={action.key} style={styles.flexCell}>
                <Button
                  title={action.label}
                  size="sm"
                  variant="secondary"
                  leftIcon={
                    action.icon === 'phone' ? (
                      <Phone size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    ) : (
                      <MessageCircle size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    )
                  }
                  onPress={action.onPress}
                />
              </View>
            ))}
            {email ? (
              <View style={styles.flexCell}>
                <Button
                  title="E-mail"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Mail size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={openEmail}
                />
              </View>
            ) : null}
          </Row>
        ) : null}

        {lines.length > 0 ? (
          <View style={sectionStyles.section}>
            <AppText style={sectionStyles.sectionTitle} accessibilityRole="header">
              Coordonnées
            </AppText>
            <Card>
              {lines.map((line, index) => (
                <Fragment key={line.label}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.lineRow}>
                    <AppText variant="caption">{line.label}</AppText>
                    <AppText variant="body">{line.value}</AppText>
                  </View>
                </Fragment>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    content: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[6],
      gap: spacing[6],
    },
    loader: { marginTop: spacing[10] },
    errorWrap: { flex: 1, paddingTop: spacing[3] },
    heroText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    flexCell: { flexGrow: 1 },
    lineRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[0.5],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4],
    },
  };
}
