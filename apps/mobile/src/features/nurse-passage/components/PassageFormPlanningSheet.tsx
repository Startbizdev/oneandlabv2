import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PassagePlanningSection } from './PassagePlanningSection';
import type { PassagePlanningFormState } from '../utils/passage-planning';
import { previewPassageCount } from '../utils/passage-planning';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';

type Props = {
  visible: boolean;
  state: PassagePlanningFormState;
  nursingItems: NursePassageNursingItem[];
  onClose: () => void;
  onConfirm: (state: PassagePlanningFormState) => void;
};

export function PassageFormPlanningSheet({
  visible,
  state,
  nursingItems,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState(state);

  useEffect(() => {
    if (visible) setDraft(state);
  }, [visible, state]);

  const count = previewPassageCount(draft, nursingItems);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Planification"
      subtitle="Type, période et récurrence des passages"
      snapPoints={['94%']}
      footer={
        <Button
          title="Valider"
          onPress={() => {
            onConfirm(draft);
            onClose();
          }}
        />
      }
    >
      <PassagePlanningSection
        state={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        passageCount={count}
      />
    </BottomSheet>
  );
}
