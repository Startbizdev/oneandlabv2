import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { PatientRelativesScreen } from '@/features/patient/screens/PatientRelativesScreen';
import { HeaderActionButton } from '@/navigation/HeaderActionButton';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStyles } from '@/theme';

export default function PatientRelativesRoute() {
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = () => setCreateOpen(true);

  return (
    <StackChromeScreen headerRight={<HeaderActionButton kind="add-relative" onPress={openCreate} />}>
      <PatientRelativesScreen createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
      {/* Hors onglets : le FAB doit dégager la zone du geste d'accueil. */}
      <View style={[styles.fabZone, { bottom: insets.bottom }]} pointerEvents="box-none">
        <ScreenFab onPress={openCreate} accessibilityLabel="Ajouter un proche" />
      </View>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    fabZone: {
      ...StyleSheet.absoluteFillObject,
    },
  };
}
