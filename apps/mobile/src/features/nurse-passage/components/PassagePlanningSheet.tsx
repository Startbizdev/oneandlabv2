import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import { SheetModal } from '@/components/ui/SheetModal';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';

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
  const styles = useStyles(buildStyles);
  const dateLabel = dayjs(selectedDate).format('dddd D MMMM');
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Quelle planification ?"
      subtitle="Choisissez comment planifier ce passage"
    >
      <View style={styles.body}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[
              styles.option,
              { borderColor: c.border, backgroundColor: c.surfaceAlt },
            ]}
            onPress={() => closeThen(() => onSelect(opt.id))}
            accessibilityRole="button"
          >
            <AppText style={[styles.optionTitle, { color: c.textPrimary }]}>{opt.title}</AppText>
            <AppText style={[styles.optionSub, { color: c.textSecondary }]}>
              {opt.subtitle(dateLabel)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </SheetModal>
  );
}

function buildStyles({ fontSize }: Theme) {
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
    optionTitle: { ...font.semiBold, fontSize: fontSize.md },
    optionSub: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.4),
    },
  };
}
