import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { appointmentDayFrance } from '@oneandlab/shared-utils';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';

dayjs.locale('fr');

export type MiniDateCalendarParts = {
  /** Ex. « LUN » */
  weekdayLabel: string;
  /** Ex. « 12 » */
  dayNumber: string;
  /** Ex. « JUIN » */
  monthLabel: string;
  /** Ex. « Lundi 12 juin » — accessibilité */
  accessibilityLabel: string;
  relative: 'today' | 'tomorrow' | null;
};

export function formatMiniDateCalendarParts(
  value?: string | Date | null,
): MiniDateCalendarParts | null {
  if (!value) return null;

  // Chaîne API (DATETIME Paris ou ISO à décalage) : jour civil France, comme le détail du RDV.
  const fromApi = typeof value === 'string';
  const d = fromApi ? dayjs(appointmentDayFrance(value) || null) : dayjs(value);
  if (!d.isValid()) return null;

  const today = (fromApi ? dayjs(appointmentDayFrance(new Date())) : dayjs()).startOf('day');
  const target = d.startOf('day');
  const diff = target.diff(today, 'day');

  let relative: MiniDateCalendarParts['relative'] = null;
  if (diff === 0) relative = 'today';
  else if (diff === 1) relative = 'tomorrow';

  return {
    weekdayLabel: capitalizeFrench(d.format('ddd')).replace(/\./g, '').toUpperCase(),
    monthLabel: capitalizeFrench(d.format('MMM')).replace(/\./g, '').toUpperCase(),
    dayNumber: d.format('D'),
    accessibilityLabel: capitalizeFrench(d.format('dddd D MMMM')),
    relative,
  };
}
