import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Linking, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { queryKeys } from '@/lib/query-keys';
import { fetchUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { personDisplayName } from '../utils/order-display';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { Cluster, Row } from '@/components/layout/primitives';
import { radius, spacing, iconSize, avatarSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function roleLabel(role?: string | null, emploi?: string | null): string {
  if (emploi?.trim()) return emploi.trim();
  if (role === 'nurse') return 'Infirmier·ère';
  if (role === 'pro') return 'Professionnel de santé';
  return 'Professionnel';
}

export function PharmacyPartyContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id ?? '');
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyPartyContactScreen');
  const scrollConfig = useStackScrollConfig(styles.content);

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
  const name = personDisplayName(profile?.first_name, profile?.last_name, 'Professionnel');
  const address = parseProfileAddress(profile?.address);
  const phone = profile?.phone?.trim() || '';
  const email = profile?.email?.trim() || '';
  const phoneActions = buildPhoneContactActions(phone);

  return (
    <StackChromeScreen title={name}>
      <ScrollView
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
      >
        {profileQ.isError ? (
          <EmptyState
            Icon={User}
            title="Fiche indisponible"
            description={profileQ.error instanceof Error ? profileQ.error.message : 'Réessayez plus tard.'}
            actionLabel="Réessayer"
            onAction={() => void profileQ.refetch()}
          />
        ) : profile ? (
          <View style={styles.card}>
            <Cluster
              gap={spacing[3]}
              leading={
                <ProfileAvatar
                  profileImageUrl={profile.profile_image_url}
                  seed={profile.id ?? name}
                  size={avatarSize.md}
                />
              }
            >
              <View style={styles.heroText}>
                <AppText style={styles.name}>{name}</AppText>
                <AppText style={styles.meta}>{roleLabel(profile.role, profile.emploi)}</AppText>
              </View>
            </Cluster>

            {phone ? (
              <AppText style={styles.line}>Téléphone : {phone}</AppText>
            ) : null}
            {email && !email.endsWith('@patients.internal.local') ? (
              <AppText style={styles.line}>E-mail : {email}</AppText>
            ) : null}
            {address?.label ? (
              <AppText style={styles.line}>Adresse : {address.label}</AppText>
            ) : null}

            <Row gap={spacing[2]} wrap>
              {phoneActions.map((action) => (
                <Button
                  key={action.key}
                  title={action.label}
                  size="sm"
                  variant={action.key === 'phone' ? 'primary' : 'outline'}
                  leftIcon={
                    action.icon === 'phone'
                      ? <Phone size={iconSize.xs} color={action.key === 'phone' ? c.textInverse : c.primary} />
                      : <Mail size={iconSize.xs} color={c.primary} />
                  }
                  onPress={action.onPress}
                />
              ))}
              {email && !email.endsWith('@patients.internal.local') ? (
                <Button
                  title="E-mail"
                  size="sm"
                  variant="outline"
                  leftIcon={<Mail size={iconSize.xs} color={c.primary} />}
                  onPress={() => void Linking.openURL(`mailto:${email}`)}
                />
              ) : null}
            </Row>
          </View>
        ) : null}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    content: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[6],
    },
    card: {
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    heroText: { flex: 1, minWidth: 0, gap: spacing[1] },
    name: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    meta: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.primaryDark,
    },
    line: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}
