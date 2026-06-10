import { useAuthStore } from '@/store/auth-store';
import { ForcePasswordChangeModal } from '@/features/auth/components/ForcePasswordChangeModal';

/** Bloque l’app tant qu’un mot de passe temporaire doit être remplacé. */
export function MustChangePasswordGate() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  return (
    <ForcePasswordChangeModal
      visible={Boolean(token && user?.must_change_password)}
      onDone={() => void fetchMe()}
    />
  );
}
