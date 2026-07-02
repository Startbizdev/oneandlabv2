import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

export type PassagePlanningChoice = 'single_day' | 'recurring';

type Props = {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelect: (choice: PassagePlanningChoice) => void;
};

const OPTIONS: {
  id: PassagePlanningChoice;
  title: string;
  subtitle: (dateLabel: string) => string;
}[] = [
  {
    id: 'single_day',
    title: 'Passage uniquement ce jour',
    subtitle: (dateLabel) => dateLabel,
  },
  {
    id: 'recurring',
    title: 'Passage chronique ou un autre jour',
    subtitle: () => 'Intervalle, jours de la semaine ou dates au choix',
  },
];

export function PassagePlanningSheet({ visible, selectedDate, onClose, onSelect }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const dateLabel = dayjs(selectedDate).format('dddd D MMMM');

  const handleSelect = (choice: PassagePlanningChoice) => {
    onSelect(choice);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Quelle planification ?"
      subtitle="Choisissez comment planifier ce passage"
      enableSwipeToDismiss
      dismissOnBackdropPress
    >
      <View style={styles.body}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[
              styles.option,
              { borderColor: c.border, backgroundColor: c.surfaceAlt },
            ]}
            onPress={() => handleSelect(opt.id)}
            accessibilityRole="button"
          >
            <Text style={[styles.optionTitle, { color: c.textPrimary }]}>{opt.title}</Text>
            <Text style={[styles.optionSub, { color: c.textSecondary }]}>
              {opt.subtitle(dateLabel)}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    body: {
      gap: spacing[3],
      paddingBottom: spacing[2],
    },
    option: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing[4],
      gap: spacing[1],
    },
    optionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md },
    optionSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.4),
    },
  };
}
