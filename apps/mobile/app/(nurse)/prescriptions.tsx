import { Redirect } from 'expo-router';

/** Prescriptions réservées au pro — redirection liste RDV infirmier. */
export default function NursePrescriptions() {
  return <Redirect href="/(nurse)/(tabs)/appointments" />;
}
