import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Search } from 'lucide-react-native';
import type { NurseCollaborationScope } from '@oneandlab/shared-types';
import {
  NURSE_COLLABORATION_RANGE_MAX_DAYS,
  NURSE_COLLABORATION_SCOPE_LABELS,
  buildNurseCollaborationBody,
  nurseCollaborationScopeOptions,
  nursePickerDisplayName,
  type NursePickerUser,
} from '@oneandlab/shared-utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { SheetModal } from '@/components/ui/SheetModal';
import { SkeletonList } from '@/components/ui/skeletons';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { ICON_STROKE_WIDTH, iconSize, spacing, useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { searchNursePicker } from '../api/nurse-collaborations.service';
import { useCreateNurseCollaboration } from '../hooks/use-nurse-collaborations';

const MIN_SEARCH_LENGTH = 2;

type Props = {
  visible: boolean;
  onClose: () => void;
  appointmentId?: string | null;
  passageSeriesId?: string | null;
  /** `false` depuis une fiche RDV / passage ; la tournée propose seule la période. */
  allowRange?: boolean;
  /** Premier jour proposé pour une période (`YYYY-MM-DD`). */
  defaultDate?: string;
  /** Absents des résultats (moi : le sélecteur inclut l'utilisateur courant). */
  excludeIds?: readonly string[];
};

/** Recherche d'un confrère infirmier puis choix de la portée du partage. */
export function CoNurseAddSheet({
  visible,
  onClose,
  appointmentId,
  passageSeriesId,
  allowRange = true,
  defaultDate,
  excludeIds = [],
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const today = dayjs().format('YYYY-MM-DD');
  const firstDay = defaultDate && defaultDate > today ? defaultDate : today;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<NursePickerUser | null>(null);
  const [scopeChoice, setScopeChoice] = useState<NurseCollaborationScope | null>(null);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(firstDay);
  const debounced = useDebouncedValue(search.trim());
  const createMut = useCreateNurseCollaboration(appointmentId ?? undefined);

  const scopes = nurseCollaborationScopeOptions({ appointmentId, passageSeriesId, allowRange });
  const scope = scopeChoice && scopes.includes(scopeChoice) ? scopeChoice : scopes[0];

  const pickerQ = useQuery({
    queryKey: queryKeys.nurseCollaborations.picker(debounced),
    queryFn: () => searchNursePicker(debounced),
    enabled: visible && !selected && debounced.length >= MIN_SEARCH_LENGTH,
  });
  const results = useMemo(
    () => (pickerQ.data ?? []).filter((u) => !excludeIds.includes(u.id)),
    [excludeIds, pickerQ.data],
  );

  useEffect(() => {
    if (!visible) return;
    setStartDate(firstDay);
    setEndDate(firstDay);
  }, [visible, firstDay]);

  const close = () => {
    setSearch('');
    setSelected(null);
    setScopeChoice(null);
    onClose();
  };

  const submit = () => {
    if (!selected || !scope) return;
    const built = buildNurseCollaborationBody({
      coNurseId: selected.id,
      scope,
      appointmentId,
      passageSeriesId,
      startDate,
      endDate,
    });
    if (!built.ok) {
      toast(built.error, { type: 'error' });
      return;
    }
    createMut.mutate(built.body, { onSuccess: close });
  };

  const maxEnd = dayjs(startDate).add(NURSE_COLLABORATION_RANGE_MAX_DAYS - 1, 'day').toDate();

  const searchBody =
    debounced.length < MIN_SEARCH_LENGTH ? null : pickerQ.isLoading ? (
      <SkeletonList count={3} itemHeight={56} gap={spacing[2]} />
    ) : pickerQ.isError && !pickerQ.data ? (
      <ErrorState title="Recherche indisponible" error={pickerQ.error} onRetry={() => void pickerQ.refetch()} />
    ) : results.length === 0 ? (
      <EmptyState illustration="search" title="Aucun infirmier" description="Modifiez votre recherche." />
    ) : (
      <SettingsSection>
        {results.map((user) => (
          <SettingsRow
            key={user.id}
            leading={<ProfileAvatar seed={user.id} size={iconSize['2xl']} />}
            label={nursePickerDisplayName(user)}
            description={user.email ?? undefined}
            onPress={() => setSelected(user)}
          />
        ))}
      </SettingsSection>
    );

  return (
    <SheetModal
      visible={visible}
      onClose={close}
      title="Ajouter un confrère"
      onBack={selected ? () => setSelected(null) : undefined}
      dismissible={!createMut.isPending}
      snapPoints={['92%']}
      footer={
        selected ? (
          <Button title="Ajouter" fullWidth loading={createMut.isPending} onPress={submit} />
        ) : undefined
      }
    >
      {selected ? (
        <View style={styles.body}>
          <SettingsSection
            items={[
              {
                leading: <ProfileAvatar seed={selected.id} size={iconSize['2xl']} />,
                label: nursePickerDisplayName(selected),
                description: 'Il sera prévenu et pourra gérer les passages.',
              },
            ]}
          />
          <FullWidthSegmentBar
            segments={scopes.map((id) => ({ id, label: NURSE_COLLABORATION_SCOPE_LABELS[id] }))}
            value={scope}
            onChange={setScopeChoice}
            accessibilityRole="radiogroup"
            accessibilityLabel="Portée"
          />
          {scope === 'range' ? (
            <View style={styles.dates}>
              <View style={styles.dateCell}>
                <IsoDatePicker
                  label="Du"
                  value={startDate}
                  minimumDate={dayjs(today).toDate()}
                  onChange={(iso) => {
                    setStartDate(iso);
                    if (endDate < iso) setEndDate(iso);
                  }}
                />
              </View>
              <View style={styles.dateCell}>
                <IsoDatePicker
                  label="Au"
                  value={endDate}
                  minimumDate={dayjs(startDate).toDate()}
                  maximumDate={maxEnd}
                  onChange={setEndDate}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Nom ou e-mail du confrère"
            autoCorrect={false}
            autoCapitalize="none"
            leftIcon={<Search size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          {searchBody}
        </View>
      )}
    </SheetModal>
  );
}

function buildStyles() {
  return {
    body: { gap: spacing[4] },
    dates: { flexDirection: 'row' as const, gap: spacing[3] },
    dateCell: { flex: 1, minWidth: 0 },
  };
}
