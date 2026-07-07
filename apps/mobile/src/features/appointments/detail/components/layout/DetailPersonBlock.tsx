import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Row } from '@/components/layout/primitives';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { PatientContactButton } from '@/utils/contact-actions';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailPersonBlock_tsx_DetailPersonBlock_styles');

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

function buildStyles(c: AppColors) {
  return {
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  detail: {
    fontFamily: fontFamily.regular,
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
