import { useLocalSearchParams } from 'expo-router';
import { AppWebViewScreen } from '@/components/web/AppWebViewScreen';

export default function PatientWeb() {
  const { path, title, auth } = useLocalSearchParams<{
    path?: string;
    title?: string;
    auth?: string;
  }>();
  const webPath = path ? decodeURIComponent(path) : '/';
  return (
    <AppWebViewScreen
      path={webPath}
      title={title ? decodeURIComponent(title) : 'Cary'}
      requireAuth={auth === '1'}
    />
  );
}
