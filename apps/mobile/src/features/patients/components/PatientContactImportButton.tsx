import { useState } from 'react';
import { BookUser } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PatientContactDraft } from '@/lib/contacts/patient-draft-from-contact';
import { useToast } from '@/providers/ToastProvider';
import { ICON_STROKE_WIDTH, iconSize, useAppColors } from '@/theme';
import { pickPatientContact, pickPatientContactErrorMessage } from '../api/pick-patient-contact';

/** Sélecteur de contact du téléphone (permission demandée au toucher) pour préremplir un nouveau patient. */
export function PatientContactImportButton({ onImported }: { onImported: (draft: PatientContactDraft) => void }) {
  const c = useAppColors();
  const { show: toast } = useToast();
  const [importing, setImporting] = useState(false);

  const importContact = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const draft = await pickPatientContact();
      if (draft) onImported(draft);
    } catch (e) {
      console.warn('[patients] contact import failed', e);
      toast(pickPatientContactErrorMessage(e), { type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Button
      title="Importer un contact"
      variant="secondary"
      leftIcon={<BookUser size={iconSize.sm} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />}
      loading={importing}
      onPress={() => void importContact()}
      fullWidth
      accessibilityHint="Préremplit le patient depuis votre répertoire"
    />
  );
}
