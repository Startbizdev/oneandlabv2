import { useAppColors } from '@/theme/use-app-colors';
import { Row } from '@/components/layout/primitives';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { PatientContactButton } from '@/utils/contact-actions';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const CONTACT_ICONS = {
  phone: Phone,
  message: MessageCircle,
  email: Mail,
} as const;

interface Props {
  title?: string;
  name: string;
  subtitle?: string;
  detail?: string;
  buttons?: PatientContactButton[];
}

export function DetailPersonBlock({ title, name, subtitle, detail, buttons }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      {title ? <AppText style={styles.sectionTitle}>{title}</AppText> : null}
      <AppText style={styles.name}>{name}</AppText>
      {subtitle ? <AppText style={styles.sub}>{subtitle}</AppText> : null}
      {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      {buttons && buttons.length > 0 ? (
        <Row gap={spacing[1.5]} style={styles.buttonRow}>
          {buttons.map((btn) => {
            const Icon = CONTACT_ICONS[btn.icon];
            return (
              <View key={btn.key} style={styles.buttonCell}>
                <Button
                  title={btn.label}
                  size="sm"
                  variant="primary"
                  leftIcon={<Icon size={iconSize.xs} color={c.textInverse} strokeWidth={2.5} />}
                  onPress={btn.onPress}
                  style={{ backgroundColor: btn.color, width: '100%' as const }}
                />
              </View>
            );
          })}
        </Row>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  sectionTitle: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  name: {
    ...font.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  sub: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  detail: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  buttonRow: {
    marginTop: spacing[1],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
};
}
