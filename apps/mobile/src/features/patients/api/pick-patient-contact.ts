import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { patientDraftFromContact, type PatientContactDraft } from '@/lib/contacts/patient-draft-from-contact';

/**
 * Sélecteur natif du répertoire. iOS n'exige aucune autorisation pour ce sélecteur ;
 * Android demande la lecture des contacts au moment du choix.
 */
export async function pickPatientContact(): Promise<PatientContactDraft | null> {
  if (Platform.OS === 'android') {
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) throw new Error('PERMISSION_CONTACTS');
  }
  const contact = await Contacts.presentContactPickerAsync();
  return contact ? patientDraftFromContact(contact) : null;
}

export function pickPatientContactErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'PERMISSION_CONTACTS') {
    return 'Autorisez l’accès aux contacts dans les réglages.';
  }
  return 'Impossible d’ouvrir vos contacts.';
}
