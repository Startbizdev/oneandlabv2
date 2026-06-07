import type { ReactNode } from 'react';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, Text, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface DayAppointmentsSheetProps<T> {
  visible: boolean;
  title: string;
  subtitle: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onClose: () => void;
  empty?: ReactNode;
}

export function DayAppointmentsSheet<T>({
  visible,
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  onClose,
  empty,
}: DayAppointmentsSheetProps<T>) {
  const styles = useThemedStyles(buildStyles);
  return (
    <SheetModal visible={visible} onClose={onClose} title={title} subtitle={subtitle} keyboardAware={false}>
      {data.length === 0 ? (
        <View style={styles.emptyWrap}>{empty}</View>
      ) : (
        <View style={styles.list}>
          {data.map((item, index) => (
            <View key={keyExtractor(item)} style={styles.itemWrap}>
              {renderItem(item, index)}
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>Fermer</Text>
      </Pressable>
    </SheetModal>
  );
}

function buildStyles(c: AppColors) {
  return {
    emptyWrap: {
      paddingVertical: spacing[8],
    },
    list: {
      gap: spacing[2],
    },
    itemWrap: {},
    closeBtn: {
      paddingVertical: spacing[3],
      borderRadius: radius.xl,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
    },
    closeBtnText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textSecondary,
    },
  };
}
