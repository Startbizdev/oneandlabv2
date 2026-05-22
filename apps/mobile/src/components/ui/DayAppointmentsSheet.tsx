import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface DayAppointmentsSheetProps<T> {
  visible: boolean;
  title: string;
  subtitle: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View
          style={[
            styles.sheet,
            elevation.sheetTop,
            { paddingBottom: Math.max(insets.bottom, spacing[4]) },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.divider} />

          {data.length === 0 ? (
            <View style={styles.emptyWrap}>{empty}</View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={keyExtractor}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <View style={styles.itemWrap}>{renderItem(item)}</View>}
            />
          )}

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    maxHeight: '88%',
    overflow: 'visible',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing[5],
  },
  emptyWrap: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
  },
  list: {
    maxHeight: 480,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  itemWrap: {},
  closeBtn: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
});
