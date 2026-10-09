import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CalendarPlus, List } from 'lucide-react-native';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import { ScreenFab } from '@/components/ui/ScreenFab';
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
  const router = useRouter();
  const [view, setView] = useState<AgendaView>('list');

  return (
    <View style={styles.root}>
      <View style={styles.segmentHost}>
        <FullWidthSegmentBar segments={AGENDA_SEGMENTS} value={view} onChange={setView} />
      </View>
      <View style={styles.body}>
        {view === 'list' ? (
          <NurseAppointmentsListScreen />
        ) : (
          <CalendarScreen
            title="Calendrier"
            baseFilters={{ limit: 200 }}
            rolePrefix="/(nurse)"
            nurseCalendar
          />
        )}
      </View>
      <ScreenFab
        Icon={CalendarPlus}
        onPress={() => router.push('/(nurse)/appointments/new')}
        accessibilityLabel="Nouveau rendez-vous"
      />
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
      paddingTop: spacing[2],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[2],
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
  };
}
