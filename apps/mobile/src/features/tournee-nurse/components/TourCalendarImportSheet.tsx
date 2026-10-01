import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import { CalendarDays, CalendarRange } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

export type TourCalendarImportScope = 'today' | 'all_upcoming';

type Props = {
  visible: boolean;
  selectedDate: string;
  todayCount: number;
  onClose: () => void;
  onSelect: (scope: TourCalendarImportScope) => void;
};

const OPTIONS: {
  id: TourCalendarImportScope;
  title: string;
  subtitle: (ctx: { dateLabel: string; todayCount: number }) => string;
  Icon: typeof CalendarDays;
}[] = [
  {
    id: 'today',
    title: 'Uniquement aujourd’hui',
    subtitle: ({ dateLabel, todayCount }) =>
      todayCount > 0
        ? `${todayCount} passage${todayCount > 1 ? 's' : ''} — ${dateLabel}`
        : `Aucun passage actif — ${dateLabel}`,
    Icon: CalendarDays,
  },
  {
    id: 'all_upcoming',
    title: 'Tous mes rendez-vous à venir',
    subtitle: () => 'Tous vos soins acceptés planifiés à partir d’aujourd’hui',
    Icon: CalendarRange,
  },
];

export function TourCalendarImportSheet({
  visible,
  selectedDate,
  todayCount,
  onClose,
  onSelect,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const dateLabel = dayjs(selectedDate).format('dddd D MMMM');

  const handleSelect = (scope: TourCalendarImportScope) => {
    onSelect(scope);
    onClose();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Ajouter au calendrier"
      subtitle="Choisissez quels rendez-vous importer dans votre calendrier"
      enableSwipeToDismiss
      dismissOnBackdropPress
    >
      <View style={styles.body}>
        {OPTIONS.map(({ id, title, subtitle, Icon }) => (
          <Pressable
            key={id}
            style={[styles.option, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
            onPress={() => handleSelect(id)}
            accessibilityRole="button"
          >
            <Row gap={spacing[3]} align="center">
              <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
                <Icon size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <View style={styles.copy}>
                <AppText style={[styles.optionTitle, { color: c.textPrimary }]}>{title}</AppText>
                <AppText style={[styles.optionSub, { color: c.textSecondary }]}>
                  {subtitle({ dateLabel, todayCount })}
                </AppText>
              </View>
            </Row>
          </Pressable>
        ))}
      </View>
    </SheetModal>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[2] },
    option: {
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing[3.5],
    },
    iconWrap: {
      width: spacing[10],
      height: spacing[10],
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    copy: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    optionTitle: {
      ...font.semiBold,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
    },
    optionSub: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
    },
  };
}
