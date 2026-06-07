import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  documentsCount: number;
  onDocuments: () => void;
}

export function PatientDetailHubCard({ documentsCount, onDocuments }: Props) {
  return (
    <Pressable onPress={onDocuments} style={styles.card}>
      <View style={styles.iconWrap}>
        <FileText size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>Pièces jointes et ordonnances</Text>
      </View>
      {documentsCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{documentsCount}</Text>
        </View>
      ) : null}
      <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textInverse,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_patient_PatientDetailHubCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
