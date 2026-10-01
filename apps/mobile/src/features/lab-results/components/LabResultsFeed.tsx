import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import { LabResultListCard } from './LabResultListCard';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

type RoleMode = 'patient' | 'nurse' | 'pro';

interface Props {
  items: LabResultListItem[];
  total: number;
  role: RoleMode;
  openingId: string | null;
  refreshing: boolean;
  loadingMore: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onOpenDocument: (item: LabResultListItem) => void;
  onOpenAppointment: (appointmentId: string) => void;
  onAskCary?: (item: LabResultListItem) => void;
  contentContainerStyle: StyleProp<ViewStyle>;
}

export function LabResultsFeed({
  items,
  total,
  role,
  openingId,
  refreshing,
  loadingMore,
  onRefresh,
  onEndReached,
  onOpenDocument,
  onOpenAppointment,
  onAskCary,
  contentContainerStyle,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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
          onAskCary={onAskCary ? () => onAskCary(item) : undefined}
        />
      );
    },
    [role, openingId, onOpenDocument, onOpenAppointment, onAskCary],
  );

  const keyExtractor = useCallback(
    (item: LabResultListItem) => item.medical_document_id ?? item.id,
    [],
  );

  const ListHeader = useCallback(
    () =>
      total > 0 ? (
        <AppText style={styles.sectionTitle}>
          {total} résultat{total > 1 ? 's' : ''}
        </AppText>
      ) : null,
    [total, styles.sectionTitle],
  );

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.primary}
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={c.primary} accessibilityLabel="Chargement de résultats supplémentaires" />
          </View>
        ) : null
      }
    />
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
  sectionTitle: {
    ...text.caption,
    ...font.semiBold,
    color: c.textSecondary,
    paddingHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  separator: {
    height: spacing[3],
  },
  footerLoader: {
    paddingVertical: spacing[3],
    alignItems: 'center' as const,
  },
};
}
