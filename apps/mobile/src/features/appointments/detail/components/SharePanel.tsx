import { Share } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ShareForNurseData } from '../api/appointment-detail.service';
import { buildNurseShareMessage } from '../utils/nurse-share-message';

export function SharePanel({ data, loading }: { data?: ShareForNurseData; loading?: boolean }) {
  const message = buildNurseShareMessage(data);
  if (loading || !message) return null;
  return (
    <Card>
      <Button
        title="Partager le RDV"
        variant="outline"
        onPress={() => void Share.share({ message })}
      />
    </Card>
  );
}
