import { Redirect, useLocalSearchParams } from 'expo-router';

/** Ancienne route — redirige vers l’onglet Documents du détail RDV. */
export default function PatientAppointmentDocumentsRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const aptId = Array.isArray(id) ? id[0] : id;

  if (!aptId) {
    return <Redirect href="/(patient)/(tabs)/appointments" />;
  }

  return (
    <Redirect
      href={{
        pathname: '/(patient)/appointment/[id]',
        params: { id: aptId, segment: 'documents' },
      }}
    />
  );
}
