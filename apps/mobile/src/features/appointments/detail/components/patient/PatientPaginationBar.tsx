import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

export function PatientPaginationBar({ page, pages, total, onPrev, onNext }: Props) {
  if (pages <= 1 && total <= 0) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPrev}
        disabled={page <= 1}
        style={[styles.btn, page <= 1 && styles.btnDisabled]}
        accessibilityLabel="Page précédente"
      >
        <ChevronLeft size={18} color={page <= 1 ? colors.textTertiary : colors.primary} />
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
        <ChevronRight size={18} color={page >= pages ? colors.textTertiary : colors.primary} />
      </Pressable>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: spacing[2],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_patient_PatientPaginationBar_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
