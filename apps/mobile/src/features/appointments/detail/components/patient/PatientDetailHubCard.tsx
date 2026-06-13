import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster } from '@/components/layout/primitives';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  documentsCount: number;
  onDocuments: () => void;
}

export function PatientDetailHubCard({
  documentsCount, onDocuments }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_patient_PatientDetailHubCard_tsx_styles');
  return (
    <Pressable onPress={onDocuments} style={styles.card}>
      <Cluster
        gap={spacing[3]}
        align="center"
        leading={
          <View style={styles.iconWrap}>
            <FileText size={18} color={c.primary} strokeWidth={2} />
          </View>
        }
        actions={
          <>
            {documentsCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{documentsCount}</Text>
              </View>
            ) : null}
            <ChevronRight size={16} color={c.textTertiary} strokeWidth={2} />
          </>
        }
      >
        <View style={styles.body}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Pièces jointes et ordonnances</Text>
        </View>
      </Cluster>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  body: {},
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textInverse,
  },
};
}

