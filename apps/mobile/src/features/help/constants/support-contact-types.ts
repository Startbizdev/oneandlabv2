import type { SelectOption } from '@/components/ui/SelectField';

export const SUPPORT_CONTACT_TYPES: SelectOption[] = [
  { value: 'app_mobile', label: 'Assistance application Cary' },
  { value: 'rdv', label: 'Problème avec un rendez-vous' },
  { value: 'question', label: 'Question générale' },
  { value: 'reclamation', label: 'Réclamation' },
  { value: 'autre', label: 'Autre' },
];
