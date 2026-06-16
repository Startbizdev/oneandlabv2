import { useLayoutEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { stackCustomBackOptions } from '@/navigation/stack-header-items';
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

/** @deprecated Header géré par `BookingWizardChrome` (glass flottant). */
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
      headerBackVisible: step === 0 ? false : undefined,
      headerRight: undefined,
      ...(step === 0
        ? { headerLeft: () => null }
        : stackCustomBackOptions(() => onWizardBackRef.current())),
    };

    navigation.setOptions(options);
  }, [navigation, role, step, wizardPageTitle]);
}
