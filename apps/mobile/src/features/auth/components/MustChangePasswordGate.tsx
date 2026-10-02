import { useAuthStore } from '@/store/auth-store';
import { useHasOpenSheet } from '@/components/ui/sheet/sheet-store';
import { ForcePasswordChangeModal } from '@/features/auth/components/ForcePasswordChangeModal';

/** Bloque l’app tant qu’un mot de passe temporaire doit être remplacé. */
export function MustChangePasswordGate() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  /** iOS ne présente pas un `Modal` par-dessus une sheet native (connexion) : il s’ouvre après elle. */
  const sheetOpen = useHasOpenSheet();

  return (
    <ForcePasswordChangeModal
      visible={Boolean(token && user?.must_change_password) && !sheetOpen}
      onDone={() => void fetchMe()}
    />
  );
}
