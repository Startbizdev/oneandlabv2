import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  page: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PatientPaginationBar({
  page, pages, total, onPrev, onNext }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_patient_PatientPaginationBar_tsx_styles');
  if (pages <= 1 && total <= 0) return null;

  return (
    <Row justify="between" align="center" style={styles.wrap}>
      <Pressable
        onPress={onPrev}
        disabled={page <= 1}
        style={[styles.btn, page <= 1 && styles.btnDisabled]}
        accessibilityLabel="Page précédente"
      >
        <ChevronLeft size={18} color={page <= 1 ? c.textTertiary : c.primary} />
      </Pressable>
      <Text style={styles.label}>
        Page {page} / {Math.max(1, pages)}
        {total > 0 ? ` · ${total} élément${total > 1 ? 's' : ''}` : ''}
      </Text>
      <Pressable
        onPress={onNext}
        disabled={page >= pages}
        style={[styles.btn, page >= pages && styles.btnDisabled]}
        accessibilityLabel="Page suivante"
      >
        <ChevronRight size={18} color={page >= pages ? c.textTertiary : c.primary} />
      </Pressable>
    </Row>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: { opacity: 0.45 },
  label: {
    minWidth: 0,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textAlign: 'center' as const,
    flex: 1,
    paddingHorizontal: spacing[2],
  },
};
}

