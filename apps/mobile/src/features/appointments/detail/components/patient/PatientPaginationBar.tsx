import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: spacing[2],
  },
});
