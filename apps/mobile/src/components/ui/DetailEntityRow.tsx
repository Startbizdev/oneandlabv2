import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Cluster, Row } from '@/components/layout/primitives';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MessageCircle, Phone, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PhoneContactAction } from '@/utils/contact-actions';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type DetailEntityRowProps = {
  /** Petit libellé au-dessus du titre (ex. « Infirmier(e) »). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Contenu compact sous le titre (ex. note + avis). */
  belowTitle?: ReactNode;
  leading?: ReactNode;
  contactActions?: PhoneContactAction[];
  /** Contenu additionnel à droite (avant les boutons contact / profil). */
  trailing?: ReactNode;
  /** Bouton « Profil » (même style que Appeler / Message). */
  onProfilePress?: () => void;
  profileAccessibilityLabel?: string;
  showDivider?: boolean;
};

const CONTACT_ICONS = {
  phone: Phone,
  message: MessageCircle,
} as const;

/**
 * Ligne compacte réutilisable : [leading] · [texte] · [actions inline contact + profil].
 */
export function DetailEntityRow({
  eyebrow,
  title,
  subtitle,
  belowTitle,
  leading,
  contactActions = [],
  trailing,
  onProfilePress,
  profileAccessibilityLabel,
  showDivider = false,
}: DetailEntityRowProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_ui_DetailEntityRow_tsx_DetailEntityRow_styles');

  const hasContact = contactActions.length > 0;
  const hasProfile = Boolean(onProfilePress);
  const hasTrailing = hasContact || Boolean(trailing) || hasProfile;

  return (
    <View style={styles.item}>
      <Cluster
        gap={spacing[2]}
        style={styles.row}
        leading={leading ? <View style={styles.leading}>{leading}</View> : undefined}
        actions={
          hasTrailing ? (
            <Row gap={4} style={styles.trailing}>
              {trailing}
              {contactActions.map((action) => {
                const Icon = CONTACT_ICONS[action.icon];
                return (
                  <Button
                    key={action.key}
                    title={action.label}
                    variant="muted"
                    size="sm"
                    leftIcon={<Icon size={11} color={c.textSecondary} strokeWidth={2.25} />}
                    onPress={action.onPress}
                  />
                );
              })}
              {hasProfile ? (
                <Button
                  title="Profil"
                  variant="muted"
                  size="sm"
                  leftIcon={<User size={11} color={c.textSecondary} strokeWidth={2.25} />}
                  onPress={onProfilePress}
                  accessibilityLabel={
                    profileAccessibilityLabel ?? `Voir le profil de ${title}`
                  }
                />
              ) : null}
            </Row>
          ) : undefined
        }
      >
        <View style={styles.text}>
          {eyebrow ? (
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {belowTitle}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Cluster>

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  item: {
    paddingVertical: spacing[2.5],
  },
  row: {
    minWidth: 0,
  },
  leading: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  trailing: {
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginTop: spacing[2.5],
  },
};
}
