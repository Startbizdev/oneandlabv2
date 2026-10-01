import { RoleTabsLayout } from '@/components/navigation/RoleTabsLayout';
import { useNurseDemandesBadgeCount } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useAuthStore } from '@/store/auth-store';

export default function NurseTabsLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { count: demandesCount } = useNurseDemandesBadgeCount(isHydrated);

  return <RoleTabsLayout role="nurse" badges={{ demandes: demandesCount }} />;
}
