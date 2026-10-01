import type { TutorialIllustrationKey } from '@oneandlab/onboarding';
import { IllustrationCanvas } from './illustration/tutorial-illustration-parts';
import {
  AiScene,
  AppointmentsScene,
  BookScene,
  NotificationsScene,
  RelativesScene,
  WelcomeScene,
} from './illustration/tutorial-illustration-patient-scenes';
import {
  CalendarScene,
  DemandesScene,
  PatientsScene,
  PrescriptionsScene,
  QrScene,
  TourneeScene,
} from './illustration/tutorial-illustration-staff-scenes';

type Props = {
  illustration: TutorialIllustrationKey;
};

function IllustrationBody({ illustration }: Props) {
  switch (illustration) {
    case 'welcome':
      return <WelcomeScene />;
    case 'appointments':
      return <AppointmentsScene />;
    case 'book':
      return <BookScene />;
    case 'relatives':
      return <RelativesScene />;
    case 'ai':
      return <AiScene />;
    case 'notifications':
      return <NotificationsScene />;
    case 'demandes':
      return <DemandesScene />;
    case 'calendar':
      return <CalendarScene />;
    case 'patients':
      return <PatientsScene />;
    case 'qr':
      return <QrScene />;
    case 'prescriptions':
      return <PrescriptionsScene />;
    case 'tournee':
      return <TourneeScene />;
    default:
      return null;
  }
}

export function TutorialIllustration({ illustration }: Props) {
  return (
    <IllustrationCanvas>
      <IllustrationBody illustration={illustration} />
    </IllustrationCanvas>
  );
}
