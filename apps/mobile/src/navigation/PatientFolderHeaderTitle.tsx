import type { ReactElement } from 'react';
import { FolderOpen } from 'lucide-react-native';
import { RegisterHeaderTitle } from '@/navigation/RegisterHeaderTitle';

/** Header stack : icône dossier + « Dossier patient » + nom du patient en petit. */
export function patientFolderHeaderTitle(patientFullName?: string): () => ReactElement {
  const subtitle = patientFullName?.trim() || undefined;
  return () => (
    <RegisterHeaderTitle
      title="Dossier patient"
      subtitle={subtitle}
      Icon={FolderOpen}
    />
  );
}
