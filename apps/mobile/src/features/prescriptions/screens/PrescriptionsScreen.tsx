import { PrescriptionWorkspaceScreen } from './PrescriptionWorkspaceScreen';

interface Props {
  roleBase?: 'pro' | 'nurse';
  rolePrefix?: '/(pro)' | '/(nurse)';
}

export function PrescriptionsScreen({
  roleBase = 'pro',
  rolePrefix = '/(pro)',
}: Props) {
  return <PrescriptionWorkspaceScreen roleBase={roleBase} rolePrefix={rolePrefix} />;
}
