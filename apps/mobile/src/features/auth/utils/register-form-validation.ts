import { isProIpaEmploi, validateProfessionalId } from '@oneandlab/shared-types';
import type { RegisterRole } from '@/features/auth/api/registration.service';

export interface RegisterFormValues {
  role: RegisterRole;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  professionalId: string;
  proRpps: string;
  emploi: string;
  acceptTerms: boolean;
  acceptHealthData: boolean;
}

const RPPS_LENGTH = 11;

function isProOther(emploi: string): boolean {
  return emploi.trim() === 'Autre';
}

/** Erreur à afficher sous le champ RPPS / Adeli (rien tant que le champ est vide : il est listé dans les manques). */
export function getProfessionalIdFieldError(values: RegisterFormValues): string | null {
  if (values.role === 'nurse') {
    return values.professionalId.trim() ? validateProfessionalId(values.professionalId) : null;
  }
  if (values.role !== 'pro' || isProOther(values.emploi) || !values.proRpps.trim()) return null;
  if (isProIpaEmploi(values.emploi)) return validateProfessionalId(values.proRpps);
  const digits = values.proRpps.replace(/\s/g, '');
  return /^\d+$/.test(digits) && digits.length === RPPS_LENGTH
    ? null
    : 'Le numéro RPPS contient 11 chiffres.';
}

/** Éléments manquants, dans l'ordre du formulaire, pour expliquer pourquoi l'envoi est bloqué. */
export function getRegisterMissingItems(values: RegisterFormValues): string[] {
  const missing: string[] = [];
  if (!values.email.trim()) missing.push('votre e-mail');
  if (!values.firstName.trim()) missing.push('votre prénom');
  if (!values.lastName.trim()) missing.push('votre nom');

  if (values.role === 'patient') {
    if (!values.birthDate.trim()) missing.push('votre date de naissance');
    if (!values.gender) missing.push('votre genre');
  }

  if (values.role === 'nurse') {
    if (!values.gender) missing.push('votre genre');
    if (validateProfessionalId(values.professionalId)) missing.push('un numéro RPPS ou Adeli valide');
  }

  if (values.role === 'pro') {
    if (!values.emploi.trim()) {
      missing.push('votre profession');
    } else if (!isProOther(values.emploi)) {
      if (isProIpaEmploi(values.emploi) && !values.gender.trim()) missing.push('votre genre');
      if (!values.proRpps.trim() || getProfessionalIdFieldError(values)) {
        missing.push(isProIpaEmploi(values.emploi) ? 'un numéro RPPS ou Adeli valide' : 'un numéro RPPS valide');
      }
    }
  }

  if (!values.acceptTerms) missing.push('l’acceptation des conditions');
  if (values.role === 'patient' && !values.acceptHealthData) {
    missing.push('votre accord pour vos données de santé');
  }
  return missing;
}

export function formatMissingItems(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}
