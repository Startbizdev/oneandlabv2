import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import type { PatientOption } from './FormPatientSection';
import { colors, spacing } from '@/theme';
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
  return <View style={styles.separator} />;
}

export function PatientSelectSheet({
  visible,
  patients,
  selectedId,
  onClose,
  onSelect,
}: Props) {
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
        <View style={[styles.row, selected && styles.rowSelected]}>
          <Text
            style={[styles.name, selected && styles.nameSelected]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <View style={styles.trailing}>
            {selected ? (
              <Check size={18} color={colors.primary} strokeWidth={2.5} />
            ) : null}
          </View>
        </View>
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
          leftIcon={<Search size={16} color={colors.textTertiary} />}
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

const styles = StyleSheet.create({
  sheetBody: {
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
    alignSelf: 'stretch',
    width: '100%',
    maxHeight: 360,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 50,
    paddingVertical: spacing[3],
    paddingHorizontal: H_PAD,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    backgroundColor: colors.primaryLight,
  },
  name: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing[2],
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  nameSelected: {
    color: colors.primary,
  },
  trailing: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: {
    paddingHorizontal: H_PAD,
    paddingVertical: spacing[6],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
