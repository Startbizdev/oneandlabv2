import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';

export default function PreleveurHome() {
  return (
    <RoleFilteredAppointmentsListScreen
      role="preleveur"
      detailPathPrefix="/(preleveur)/appointment"
    />
  );
}
