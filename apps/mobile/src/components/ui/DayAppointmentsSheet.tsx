import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

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
  const styles = useStyles(buildStyles);
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      snapPoints={['85%']}
      stackBehavior="push"
      presentKey={title}
    >
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
        <AppText style={styles.closeBtnText}>Fermer</AppText>
      </Pressable>
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textSecondary,
    },
  };
}
