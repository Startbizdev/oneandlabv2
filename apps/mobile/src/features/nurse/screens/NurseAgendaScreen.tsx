import { useState } from 'react';
import { View } from 'react-native';
import { CalendarDays, List } from 'lucide-react-native';
import {
  TabSceneInsetTopOverride,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { NurseAppointmentsListScreen } from '@/features/nurse/screens/NurseAppointmentsListScreen';
import { spacing, useStyles, type Theme } from '@/theme';

type AgendaView = 'list' | 'calendar';

const AGENDA_SEGMENTS: FullWidthSegment<AgendaView>[] = [
  { id: 'list', label: 'Liste', Icon: List },
  { id: 'calendar', label: 'Calendrier', Icon: CalendarDays },
];

/** Onglet Agenda infirmier : liste des rendez-vous ou calendrier mensuel. */
export function NurseAgendaScreen() {
  const styles = useStyles(buildStyles);
  const { insetTop } = useTabSceneInsets();
  const [view, setView] = useState<AgendaView>('list');

  return (
    <View style={styles.root}>
      <View style={[styles.segmentHost, { paddingTop: insetTop + spacing[2] }]}>
        <FullWidthSegmentBar segments={AGENDA_SEGMENTS} value={view} onChange={setView} />
      </View>
      <TabSceneInsetTopOverride insetTop={0}>
        <View style={styles.body}>
          {view === 'list' ? (
            <NurseAppointmentsListScreen />
          ) : (
            <CalendarScreen
              title="Calendrier"
              baseFilters={{ limit: 200 }}
              detailPathPrefix="/(nurse)/appointment"
              nurseCalendar
            />
          )}
        </View>
      </TabSceneInsetTopOverride>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.background,
    },
    segmentHost: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[2],
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
  };
}
