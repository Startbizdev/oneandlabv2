import { HeaderAction } from '@/components/navigation/HeaderAction';

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function NotificationsReadAllAction({ onPress, loading }: Props) {
  return (
    <HeaderAction
      label="Tout lu"
      accessibilityLabel="Tout marquer comme lu"
      onPress={onPress}
      loading={loading}
    />
  );
}
