import type { ReactNode } from 'react';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';

type Props = {
  step: number;
  role: string;
  wizardPageTitle: string;
  onWizardBack: () => void;
  embeddedInTab?: boolean;
  /** Écran de succès : plus d'étape précédente. */
  hideBack?: boolean;
  children: ReactNode;
};

/** Header du wizard booking — tête d'onglet Réserver, ou écran de pile avec retour d'étape. */
export function BookingWizardChrome({
  step,
  role,
  wizardPageTitle,
  onWizardBack,
  embeddedInTab = false,
  hideBack = false,
  children,
}: Props) {
  const title = step === 0 && !hideBack ? bookingCareSelectionTitle(role) : wizardPageTitle;
  const hasStepBack = step > 0 && !hideBack;

  if (embeddedInTab && !hasStepBack) {
    return (
      <TabScreenFrame title={title} headerRight={null}>
        {children}
      </TabScreenFrame>
    );
  }

  return (
    <StackChromeScreen
      title={title}
      headerLeft={hasStepBack ? <HeaderBackButton onPress={onWizardBack} /> : hideBack ? null : undefined}
    >
      {children}
    </StackChromeScreen>
  );
}
