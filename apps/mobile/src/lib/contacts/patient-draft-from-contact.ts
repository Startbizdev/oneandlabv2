import type { Contact } from 'expo-contacts';

export type PatientContactDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** Adresse du répertoire en une ligne, à géocoder via la recherche d'adresse (pas de coordonnées dans un contact). */
  addressQuery: string;
};

type ContactFields = Pick<Contact, 'name' | 'firstName' | 'lastName' | 'phoneNumbers' | 'emails' | 'addresses'>;

function pickPreferred<T extends { isPrimary?: boolean; label?: string }>(
  items: T[] | undefined,
  hasValue: (item: T) => boolean,
  preferredLabel?: RegExp,
): T | undefined {
  const usable = (items ?? []).filter(hasValue);
  return (
    usable.find((i) => i.isPrimary) ??
    (preferredLabel ? usable.find((i) => preferredLabel.test(i.label ?? '')) : undefined) ??
    usable[0]
  );
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: '', lastName: parts[0] ?? '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Contact du répertoire → champs du formulaire « Nouveau patient » (numéro mobile de préférence). */
export function patientDraftFromContact(contact: ContactFields): PatientContactDraft {
  const fromParts = { firstName: contact.firstName?.trim() ?? '', lastName: contact.lastName?.trim() ?? '' };
  const names = fromParts.firstName || fromParts.lastName ? fromParts : splitFullName(contact.name ?? '');

  const phone = pickPreferred(contact.phoneNumbers, (p) => Boolean(p.number?.trim()), /mobile|portable|cell/i);
  const email = pickPreferred(contact.emails, (e) => Boolean(e.email?.trim()));
  const address = pickPreferred(contact.addresses, (a) => Boolean(a.street?.trim() || a.city?.trim()));

  const street = address?.street?.replace(/\s*\n+\s*/g, ', ').trim() ?? '';
  const cityLine = [address?.postalCode?.trim(), address?.city?.trim()].filter(Boolean).join(' ');

  return {
    firstName: names.firstName,
    lastName: names.lastName,
    phone: phone?.number?.trim() ?? '',
    email: email?.email?.trim() ?? '',
    addressQuery: [street, cityLine].filter(Boolean).join(', '),
  };
}
