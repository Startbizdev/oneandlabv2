import { Pressable } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { getLegalPage, openLegalPage, type AuthLegalSlug } from '@/features/auth/utils/open-legal-page';
import { AppText, font, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  slugs: readonly AuthLegalSlug[];
}

/** Liens vers les pages légales publiques (CGU, confidentialité) depuis la réservation. */
export function BookingLegalLinks({ slugs }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <Row wrap gap={spacing[3]}>
      {slugs.map((slug) => {
        const label = getLegalPage(slug)?.label ?? slug;
        return (
          <Pressable
            key={slug}
            onPress={() => void openLegalPage(slug)}
            accessibilityRole="link"
            accessibilityLabel={`Lire : ${label}`}
            style={styles.link}
          >
            <AppText style={styles.text}>{label}</AppText>
          </Pressable>
        );
      })}
    </Row>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    link: {
      minHeight: 44,
      justifyContent: 'center' as const,
    },
    text: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
      textDecorationLine: 'underline' as const,
    },
  };
}
