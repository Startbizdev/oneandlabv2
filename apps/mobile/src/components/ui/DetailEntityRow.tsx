import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MessageCircle, Phone, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PhoneContactAction } from '@/utils/contact-actions';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type DetailEntityRowProps = {
  /** Petit libellé au-dessus du titre (ex. « Infirmier(e) »). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
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
  leading,
  contactActions = [],
  trailing,
  onProfilePress,
  profileAccessibilityLabel,
  showDivider = false,
}: DetailEntityRowProps) {
  const hasContact = contactActions.length > 0;
  const hasProfile = Boolean(onProfilePress);
  const hasTrailing = hasContact || Boolean(trailing) || hasProfile;

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}

        <View style={styles.text}>
          {eyebrow ? (
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {hasTrailing ? (
          <View style={styles.trailing}>
            {trailing}
            {contactActions.map((action) => {
              const Icon = CONTACT_ICONS[action.icon];
              return (
                <Button
                  key={action.key}
                  title={action.label}
                  variant="muted"
                  size="mini"
                  leftIcon={<Icon size={11} color={colors.textSecondary} strokeWidth={2.25} />}
                  onPress={action.onPress}
                />
              );
            })}
            {hasProfile ? (
              <Button
                title="Profil"
                variant="muted"
                size="mini"
                leftIcon={<User size={11} color={colors.textSecondary} strokeWidth={2.25} />}
                onPress={onProfilePress}
                accessibilityLabel={
                  profileAccessibilityLabel ?? `Voir le profil de ${title}`
                }
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: spacing[2.5],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginTop: spacing[2.5],
  },
});
