import { useCallback, useEffect, useState } from 'react';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PassageCareSection } from './PassageCareSection';

type Props = {
  visible: boolean;
  items: NursePassageNursingItem[];
  onClose: () => void;
  onConfirm: (items: NursePassageNursingItem[]) => void;
};

type CareSheetPhase = 'picker' | 'options' | 'selected';

export function PassageFormCareSheet({ visible, items, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState(items);
  const [phase, setPhase] = useState<CareSheetPhase>('picker');
  const [optionsCategoryName, setOptionsCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setDraft(items);
  }, [visible, items]);

  useEffect(() => {
    if (!visible) {
      setPhase('picker');
      setOptionsCategoryName(null);
    }
  }, [visible]);

  const handleUiPhaseChange = useCallback(
    (next: CareSheetPhase, meta?: { categoryName?: string }) => {
      setPhase(next);
      setOptionsCategoryName(next === 'options' ? meta?.categoryName ?? null : null);
    },
    [],
  );

  const sheetTitle =
    phase === 'options' && optionsCategoryName ? optionsCategoryName : 'Soins';

  const sheetSubtitle =
    phase === 'options'
      ? 'Paramétrez votre soin'
      : phase === 'picker' || draft.length === 0
        ? 'Choisissez un ou plusieurs soins'
        : 'Soins infirmiers à réaliser lors du passage';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      subtitle={sheetSubtitle}
      snapPoints={['85%']}
      footer={
        phase === 'selected' ? (
          <Button
            title="Valider"
            disabled={draft.length === 0}
            onPress={() => {
              onConfirm(draft);
              onClose();
            }}
          />
        ) : undefined
      }
    >
      <PassageCareSection
        items={draft}
        onChange={setDraft}
        embedded
        sheetOpen={visible}
        onUiPhaseChange={handleUiPhaseChange}
      />
    </BottomSheet>
  );
}
