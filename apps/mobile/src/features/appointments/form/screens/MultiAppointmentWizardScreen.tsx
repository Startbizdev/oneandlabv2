import { BookingWizardScreen } from './BookingWizardScreen';

interface Props {
  role: string;
  basePath: string;
}

/** @deprecated Utiliser BookingWizardScreen */
export function MultiAppointmentWizardScreen({ role, basePath }: Props) {
  return <BookingWizardScreen mode="dashboard" role={role} basePath={basePath} />;
}
