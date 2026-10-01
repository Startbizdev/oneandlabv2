import { Pressable } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useToast } from '@/providers/ToastProvider';
import { getLegalPage, openLegalPage, type AuthLegalSlug } from '@/features/auth/utils/open-legal-page';
import { AppText, font, spacing, useStyles, type Theme } from '@/theme';

const LINK_SLUGS: AuthLegalSlug[] = ['cgv', 'confidentialite'];

/** Conditions d'utilisation et politique de confidentialité, ouvertes depuis l'accueil ou l'inscription. */
export function LegalLinks() {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();

  function open(slug: AuthLegalSlug) {
    openLegalPage(slug).catch(() => {
      toast('Page indisponible', { message: 'Réessayez dans un instant.', type: 'error' });
    });
  }

  return (
    <Row wrap justify="center" gap={spacing[4]}>
      {LINK_SLUGS.map((slug) => {
        const page = getLegalPage(slug);
        if (!page) return null;
        return (
          <Pressable
            key={slug}
            onPress={() => open(slug)}
            accessibilityRole="link"
            accessibilityHint="Ouvre la page dans le navigateur"
            style={styles.link}
          >
            <AppText style={styles.linkText}>{page.label}</AppText>
          </Pressable>
        );
      })}
    </Row>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    link: { minHeight: 44, justifyContent: 'center' as const },
    linkText: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textLink,
      textDecorationLine: 'underline' as const,
    },
  };
}
