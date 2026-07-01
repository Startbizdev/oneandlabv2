import { isProIpaEmploi } from '@oneandlab/shared-types';
import { labelFromAppointmentAddressField } from './appointment-address';

export type PrescriptionKind = 'medical' | 'nursing';

export type PrescriptionGapAction = 'edit_patient' | 'edit_prescriber' | 'sign_prescriber';

export interface PrescriptionProfileSnapshot {
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  nir?: string | null;
  address?: unknown;
  rpps?: string | null;
  adeli?: string | null;
  emploi?: string | null;
  prescription_signature_png?: string | null;
}

export interface PrescriptionProfileGap {
  id: string;
  message: string;
  action: PrescriptionGapAction;
  actionLabel: string;
}

function isBlank(value?: string | null): boolean {
  return !value || !String(value).trim();
}

function hasProfileAddress(profile?: PrescriptionProfileSnapshot | null): boolean {
  return Boolean(labelFromAppointmentAddressField(profile?.address));
}

function hasProfessionalId(profile?: PrescriptionProfileSnapshot | null): boolean {
  const rpps = profile?.rpps?.replace(/\s/g, '') ?? '';
  const adeli = profile?.adeli?.replace(/\s/g, '') ?? '';
  return rpps.length > 0 || adeli.length > 0;
}

export function getPrescriptionProfileGaps(options: {
  patient?: PrescriptionProfileSnapshot | null;
  prescriber?: PrescriptionProfileSnapshot | null;
  prescriptionKind: PrescriptionKind;
  prescriberRole?: string;
  includeSignature?: boolean;
}): PrescriptionProfileGap[] {
  const { patient, prescriber, prescriptionKind, prescriberRole, includeSignature } = options;
  const gaps: PrescriptionProfileGap[] = [];
  const editPatient = {
    action: 'edit_patient' as const,
    actionLabel: 'Éditer la fiche',
  };
  const editPrescriber = {
    action: 'edit_prescriber' as const,
    actionLabel: 'Modifier mon profil',
  };

  if (patient) {
    if (isBlank(patient.nir)) {
      gaps.push({ id: 'patient_nir', message: 'NIR manquant', ...editPatient });
    }
    if (isBlank(patient.birth_date)) {
      gaps.push({ id: 'patient_birth_date', message: 'Date de naissance manquante', ...editPatient });
    }
    if (!hasProfileAddress(patient)) {
      gaps.push({ id: 'patient_address', message: 'Adresse patient manquante', ...editPatient });
    }
    if (isBlank(patient.first_name) || isBlank(patient.last_name)) {
      gaps.push({ id: 'patient_name', message: 'Nom ou prénom incomplet', ...editPatient });
    }
  }

  if (prescriber) {
    const isNurse = prescriptionKind === 'nursing' || prescriberRole === 'nurse';
    const isProIpa =
      prescriberRole === 'pro' && isProIpaEmploi(prescriber.emploi);
    const usesAdeliOrRpps = isNurse || isProIpa;
    if (!hasProfessionalId(prescriber)) {
      gaps.push({
        id: 'prescriber_id',
        message: usesAdeliOrRpps ? 'N° ADELI ou RPPS manquant' : 'N° RPPS manquant',
        ...editPrescriber,
      });
    }
    if (!hasProfileAddress(prescriber)) {
      gaps.push({
        id: 'prescriber_address',
        message: 'Adresse professionnelle manquante',
        ...editPrescriber,
      });
    }
    if (includeSignature && isBlank(prescriber.prescription_signature_png)) {
      gaps.push({
        id: 'prescriber_signature',
        message: 'Signature manuscrite non enregistrée',
        action: 'sign_prescriber',
        actionLabel: 'Créer ma signature',
      });
    }
  }

  return gaps;
}
