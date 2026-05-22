import { useLayoutEffect } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import { BookingWizardHeaderBack } from '../components/BookingWizardHeaderBack';
import { BookingWizardHeaderClose } from '../components/BookingWizardHeaderClose';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';

interface Options {
  step: number;
  mode: 'patient' | 'dashboard';
  role: string;
  wizardPageTitle: string;
  onWizardBack: () => void;
}

/** Titre navigation = question d'étape ; fermer (×) à l’étape 1, retour ensuite. */
export function useBookingWizardHeader({
  step,
  role,
  wizardPageTitle,
  onWizardBack,
}: Options) {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    const title = step === 0 ? bookingCareSelectionTitle() : wizardPageTitle;

    const exitWizard = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(getRoleHome(role));
      }
    };

    const handleBack = () => {
      if (step === 0) {
        exitWizard();
        return;
      }
      onWizardBack();
    };

    const options: NativeStackNavigationOptions = {
      title,
      headerTitle: title,
      headerBackTitle: '',
      headerBackVisible: false,
      headerRight: undefined,
      headerLeft: () =>
        step === 0 ? (
          <BookingWizardHeaderClose onPress={exitWizard} />
        ) : (
          <BookingWizardHeaderBack onPress={handleBack} />
        ),
    };

    navigation.setOptions(options);
  }, [navigation, router, role, step, wizardPageTitle, onWizardBack]);
}
