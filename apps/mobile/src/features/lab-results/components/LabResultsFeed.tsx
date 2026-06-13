import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import { LabResultListCard } from './LabResultListCard';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type RoleMode = 'patient' | 'nurse' | 'pro';

interface Props {
  items: LabResultListItem[];
  role: RoleMode;
  openingId: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenDocument: (item: LabResultListItem) => void;
  onOpenAppointment: (appointmentId: string) => void;
}

export function LabResultsFeed({
  items,
  role,
  openingId,
  refreshing,
  onRefresh,
  onOpenDocument,
  onOpenAppointment,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_lab_results_components_LabResultsFeed_tsx_LabResultsFeed_styles');

  const renderItem: ListRenderItem<LabResultListItem> = useCallback(
    ({ item }) => {
      const medicalId = item.medical_document_id ?? item.id;
      return (
        <LabResultListCard
          item={item}
          role={role}
          opening={openingId === medicalId}
          onOpenDocument={() => onOpenDocument(item)}
          onOpenAppointment={() => onOpenAppointment(item.appointment_id)}
        />
      );
    },
    [role, openingId, onOpenDocument, onOpenAppointment],
  );

  const keyExtractor = useCallback(
    (item: LabResultListItem) => item.medical_document_id ?? item.id,
    [],
  );

  const ListHeader = useCallback(
    () =>
      items.length > 0 ? (
        <Text style={styles.sectionTitle}>
          {items.length} résultat{items.length > 1 ? 's' : ''}
        </Text>
      ) : null,
    [items.length],
  );

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
      ListFooterComponent={
        openingId ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : null
      }
    />
  );
}

function buildStyles(c: AppColors) {
  return {
  listContent: {
    minWidth: 0,
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  separator: {
    height: spacing[2],
  },
  footerLoader: {
    paddingVertical: spacing[3],
    alignItems: 'center' as const,
  },
};
}
