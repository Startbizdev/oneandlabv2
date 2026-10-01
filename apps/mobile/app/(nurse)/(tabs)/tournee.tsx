import { NurseTourneeScreen } from '@/features/tournee-nurse/screens/NurseTourneeScreen';
import { StackChromeTabRoot } from '@/navigation/stack-chrome-tab-root';

export default function NurseTourneeTab() {
  return (
    <StackChromeTabRoot title="Ma tournée">
      <NurseTourneeScreen />
    </StackChromeTabRoot>
  );
}
