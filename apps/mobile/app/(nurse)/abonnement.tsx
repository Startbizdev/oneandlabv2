import { AppWebViewScreen } from '@/components/web/AppWebViewScreen';

export default function NurseAbonnementWeb() {
  return (
    <AppWebViewScreen
      path="/nurse/abonnement"
      title="Abonnement"
      requireAuth
    />
  );
}
