import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { Check, Search } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import type { PatientOption } from './FormPatientSection';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const H_PAD = spacing[4];

interface Props {
  visible: boolean;
  patients: PatientOption[];
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

function ListSeparator() {
  const styles = useThemedStyles(buildStyles, 'PatientSelectSheet.ListSeparator');
  return <View style={styles.separator} />;
}

export function PatientSelectSheet({
  visible,
  patients,
  selectedId,
  onClose,
  onSelect,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_PatientSelectSheet_tsx_styles');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter(
      (p) =>
        p.label.toLowerCase().includes(s) ||
        (p.searchText?.toLowerCase().includes(s) ?? false),
    );
  }, [patients, q]);

  const handleClose = () => {
    setQ('');
    onClose();
  };

  const handlePick = (id: string) => {
    onSelect(id);
    setQ('');
    onClose();
  };

  const renderItem: ListRenderItem<PatientOption> = ({ item }) => {
    const selected = selectedId === item.id;
    return (
      <Pressable
        onPress={() => handlePick(item.id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <Cluster
          style={[styles.row, selected && styles.rowSelected]}
          actions={
            <View style={styles.trailing}>
              {selected ? (
                <Check size={20} color={c.primary} strokeWidth={2.5} />
              ) : null}
            </View>
          }
        >
          <Text
            style={[styles.name, selected && styles.nameSelected]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </Cluster>
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Choisir un patient"
      contentStyle={styles.sheetBody}
      disableScroll
    >
      <View style={styles.searchWrap}>
        <Input
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un patient…"
          leftIcon={<Search size={16} color={c.textTertiary} />}
        />
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>Aucun patient trouvé</Text>
      ) : (
        <View style={styles.listPanel}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={ListSeparator}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
          />
        </View>
      )}
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  sheetBody: {
    minWidth: 0,
    padding: 0,
    gap: 0,
    paddingBottom: spacing[2],
    flexGrow: 1,
  },
  searchWrap: {
    paddingHorizontal: H_PAD,
    paddingBottom: spacing[2],
  },
  listPanel: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    maxHeight: 360,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden' as const,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    flexGrow: 0,
  },
  row: {
    width: '100%' as const,
    minHeight: 52,
    paddingVertical: spacing[3],
    paddingHorizontal: H_PAD,
    backgroundColor: c.surface,
  },
  rowSelected: {
    backgroundColor: c.primaryLight,
  },
  name: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing[2],
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  nameSelected: {
    color: c.primary,
  },
  trailing: {
    width: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  empty: {
    paddingHorizontal: H_PAD,
    paddingVertical: spacing[6],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
};
}

