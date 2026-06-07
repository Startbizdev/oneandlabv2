import { useLayoutEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { bookingCareSelectionHeaderTitle } from '../components/BookingCareSelectionHeaderTitle';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';

interface Options {
  step: number;
  mode: 'patient' | 'dashboard';
  role: string;
  wizardPageTitle: string;
  onWizardBack: () => void;
}

/** Titre navigation sticky — pas de bouton header à l’étape 0, retour ensuite. */
export function useBookingWizardHeader({
  step,
  role,
  wizardPageTitle,
  onWizardBack,
}: Options) {
  const navigation = useNavigation();
  const onWizardBackRef = useRef(onWizardBack);
  onWizardBackRef.current = onWizardBack;

  useLayoutEffect(() => {
    const title = step === 0 ? bookingCareSelectionTitle(role) : wizardPageTitle;

    const options: NativeStackNavigationOptions = {
      headerShown: true,
      title,
      headerTitle: step === 0 ? bookingCareSelectionHeaderTitle(role) : title,
      headerBackTitle: '',
      headerBackVisible: false,
      headerRight: undefined,
      headerLeft:
        step === 0
          ? undefined
          : () => (
              <HeaderBackButton onPress={() => onWizardBackRef.current()} />
            ),
    };

    navigation.setOptions(options);
  }, [navigation, role, step, wizardPageTitle]);
}
