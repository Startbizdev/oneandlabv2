import type { ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { Camera, ExternalLink, Globe, MessageCircle, Phone, Share2, type LucideIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { normalizeExternalUrl } from '@/features/profile/utils/professional-profile-sheet';
import {
  parseProfileSocialLinks,
  type ProfileSocialLinks,
} from '@/features/profile/utils/profile-social-links';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, ICON_STROKE_WIDTH, iconSize, spacing, useStyles, type Theme } from '@/theme';

/** Appeler / SMS — le numéro vient du RDV, jamais de l'API publique. */
export function PublicProfileContactActions({ phone }: { phone?: string | null }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const dial = (phone ?? '').replace(/\s/g, '');
  if (!dial) return null;

  return (
    <Row gap={spacing[3]}>
      <View style={styles.action}>
        <Button
          title="Appeler"
          variant="outline"
          fullWidth
          leftIcon={<Phone size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={() => void Linking.openURL(`tel:${dial}`)}
        />
      </View>
      <View style={styles.action}>
        <Button
          title="SMS"
          variant="outline"
          fullWidth
          leftIcon={<MessageCircle size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={() => void Linking.openURL(`sms:${dial}`)}
        />
      </View>
    </Row>
  );
}

/** Bloc éditorial : titre de section + contenu libre. */
export function PublicProfileSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.section}>
      <AppText variant="headline" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export type PublicProfileInfoRow = { key: string; label: string; value?: string };

/** Liste groupée en lecture seule (horaires, diplômes, identifiants). */
export function PublicProfileInfoCard({ title, rows }: { title: string; rows: PublicProfileInfoRow[] }) {
  const styles = useStyles(buildStyles);
  if (rows.length === 0) return null;
  return (
    <SettingsSection title={title} iconless>
      {rows.map((row) => (
        <View key={row.key} style={styles.infoRow}>
          <AppText variant="body" style={styles.infoLabel}>
            {row.label}
          </AppText>
          {row.value ? (
            <AppText variant="secondary" style={styles.infoValue}>
              {row.value}
            </AppText>
          ) : null}
        </View>
      ))}
    </SettingsSection>
  );
}

type LinkRow = { key: string; label: string; url: string; Icon: LucideIcon };

function linkRows(website: string | null | undefined, social: ProfileSocialLinks | null | undefined): LinkRow[] {
  const links = parseProfileSocialLinks(social);
  const rows: LinkRow[] = [];
  if (website?.trim()) {
    rows.push({ key: 'website', label: 'Site internet', url: normalizeExternalUrl(website), Icon: Globe });
  }
  if (links.facebook) {
    rows.push({ key: 'facebook', label: 'Facebook', url: normalizeExternalUrl(links.facebook), Icon: Share2 });
  }
  if (links.linkedin) {
    rows.push({ key: 'linkedin', label: 'LinkedIn', url: normalizeExternalUrl(links.linkedin), Icon: ExternalLink });
  }
  if (links.instagram) {
    rows.push({ key: 'instagram', label: 'Instagram', url: normalizeExternalUrl(links.instagram), Icon: Camera });
  }
  return rows;
}

export function PublicProfileLinks({
  website,
  social,
}: {
  website?: string | null;
  social?: ProfileSocialLinks | null;
}) {
  const rows = linkRows(website, social);
  if (rows.length === 0) return null;
  return (
    <SettingsSection
      title="Site web et réseaux"
      items={rows.map((row) => ({
        icon: row.Icon,
        label: row.label,
        description: row.url.replace(/^https?:\/\//i, ''),
        onPress: () => void Linking.openURL(row.url),
      }))}
    />
  );
}

function buildStyles({ scale }: Theme) {
  return {
    action: { flex: 1, minWidth: 0 },
    section: { gap: spacing[2] },
    infoRow: {
      minHeight: scale(52),
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      columnGap: spacing[3],
      rowGap: spacing[0.5],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    infoLabel: { flexShrink: 1 },
    infoValue: { flexShrink: 1, textAlign: 'right' as const },
  };
}
