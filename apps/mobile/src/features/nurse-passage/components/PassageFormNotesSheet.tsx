import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { spacing } from '@/theme';

type Props = {
  visible: boolean;
  notes: string;
  onClose: () => void;
  onConfirm: (notes: string) => void;
};

export function PassageFormNotesSheet({ visible, notes, onClose, onConfirm }: Props) {
  const styles = useThemedStyles(buildStyles);
  const [draft, setDraft] = useState(notes);

  useEffect(() => {
    if (visible) setDraft(notes);
  }, [visible, notes]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Note"
      subtitle="Consignes, accès, matériel… (optionnel)"
      snapPoints={['45%']}
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
      <View style={styles.body}>
        <Textarea
          value={draft}
          onChangeText={setDraft}
          placeholder="Ex. Sonner 2 fois, chien au gardien…"
          numberOfLines={5}
        />
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    body: { paddingBottom: spacing[4] },
  };
}
