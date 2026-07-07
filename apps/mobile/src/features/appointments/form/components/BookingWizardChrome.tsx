import type { ReactNode } from 'react';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { StackHeaderBackButton } from '@/navigation/StackHeaderBackButton';
import { BookingCareSelectionHeaderTitle } from '@/features/appointments/form/components/BookingCareSelectionHeaderTitle';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

type Props = {
  step: number;
  role: string;
  wizardPageTitle: string;
  onWizardBack: () => void;
  embeddedInTab?: boolean;
  children: ReactNode;
};

/** Header glass wizard booking — onglet Réserver ou stack modal. */
export function BookingWizardChrome({
  step,
  role,
  wizardPageTitle,
  onWizardBack,
  embeddedInTab = false,
  children,
}: Props) {
  const title =
    step === 0 ? (
      <BookingCareSelectionHeaderTitle role={role} embedded />
    ) : (
      <HeaderTitleText title={wizardPageTitle} />
    );

  const headerLeft: ReactNode | null | undefined =
    step > 0 ? (
      <StackHeaderBackButton onPress={onWizardBack} />
    ) : embeddedInTab ? (
      null
    ) : undefined;

  if (embeddedInTab) {
    return (
      <TabScreenFrame
        title={title}
        headerLeft={headerLeft}
        headerRight={null}
        headerVisual="inline"
        shellStyle={{
    minWidth: 0, flex: 1 }}
      >
        {children}
      </TabScreenFrame>
    );
  }

  return (
    <StackChromeScreen title={title} headerLeft={headerLeft}>
      {children}
    </StackChromeScreen>
  );
}
