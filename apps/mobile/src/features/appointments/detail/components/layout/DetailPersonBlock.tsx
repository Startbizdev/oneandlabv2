import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { PatientContactButton } from '@/utils/contact-actions';
import { colors, spacing } from '@/theme';
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
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <Text style={styles.name}>{name}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {buttons && buttons.length > 0 ? (
        <View style={styles.buttonRow}>
          {buttons.map((btn) => {
            const Icon = CONTACT_ICONS[btn.icon];
            return (
              <View key={btn.key} style={styles.buttonCell}>
                <Button
                  title={btn.label}
                  size="sm"
                  variant="primary"
                  leftIcon={<Icon size={14} color={colors.textInverse} strokeWidth={2.5} />}
                  onPress={btn.onPress}
                  style={{ backgroundColor: btn.color, width: '100%' }}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
    marginTop: spacing[1],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
});
