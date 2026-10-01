import { RoleTabsLayout } from '@/components/navigation/RoleTabsLayout';
import { SHOW_PRESCRIPTIONS_TAB_NAV, prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import { useAuthStore } from '@/store/auth-store';

export default function ProTabsLayout() {
  const user = useAuthStore((s) => s.user);
  const showPrescriptions = SHOW_PRESCRIPTIONS_TAB_NAV && prescriptionGenerationEnabled(user);

  return <RoleTabsLayout role="pro" visible={{ prescriptions: showPrescriptions }} />;
}
