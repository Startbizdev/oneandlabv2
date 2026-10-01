import { Image } from 'react-native';
import type { TutorialIllustrationKey, TutorialRole } from '@oneandlab/onboarding';
import { ILLUSTRATIONS, type IllustrationKey } from '@/constants/illustrations';
import { useStyles } from '@/theme';

const TUTORIAL_ILLUSTRATION: Record<TutorialIllustrationKey, IllustrationKey> = {
  welcome: 'welcome',
  appointments: 'appointments',
  book: 'booking',
  relatives: 'relatives',
  ai: 'messages',
  notifications: 'notifications',
  demandes: 'requests',
  calendar: 'calendar',
  patients: 'patients',
  qr: 'patients',
  prescriptions: 'prescriptions',
  tournee: 'tour',
};

/** Côté soignant, la slide « visites » parle de la fiche du passage, pas d'un patient qui attend chez lui. */
const PROFESSIONAL_OVERRIDES: Partial<Record<TutorialIllustrationKey, IllustrationKey>> = {
  appointments: 'health-record',
};

export function TutorialIllustration({
  illustration,
  role,
}: {
  illustration: TutorialIllustrationKey;
  role: TutorialRole;
}) {
  const styles = useStyles(buildStyles);
  const key =
    (role !== 'patient' ? PROFESSIONAL_OVERRIDES[illustration] : undefined) ?? TUTORIAL_ILLUSTRATION[illustration];
  return (
    <Image
      source={ILLUSTRATIONS[key]}
      style={styles.image}
      resizeMode="contain"
      accessible={false}
    />
  );
}

function buildStyles() {
  return {
    image: { width: '100%' as const, height: '100%' as const, alignSelf: 'center' as const },
  };
}
