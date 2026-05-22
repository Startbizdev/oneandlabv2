import { Share } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ShareForNurseData } from '../api/appointment-detail.service';

export function SharePanel({ data, loading }: { data?: ShareForNurseData; loading?: boolean }) {
  if (loading || !data?.shareText) return null;
  return (
    <Card>
      <Button
        title="Partager le RDV"
        variant="outline"
        onPress={() => void Share.share({ message: data.shareText ?? '' })}
      />
    </Card>
  );
}
