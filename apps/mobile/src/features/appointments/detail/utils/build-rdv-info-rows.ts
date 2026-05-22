import { Linking } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import {
  appointmentHasMultipleCareLines,
  buildAppointmentDetailKvRows,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import { formatAvailabilityDisplayFr, formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';
import { appointmentAddressLine } from '@/utils/appointment-display';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  beneficiaryBirthLine,
  beneficiaryFirstName,
  beneficiaryLastName,
  bookingContactFullName,
  patientContactEmail,
  patientPhone,
  relationshipLine,
  showBookingContactBlock,
} from './patient-appointment-display';
import type { ContactAction } from '../components/layout/ContactActionBar';

dayjs.locale('fr');

export type RdvInfoRow =
  | { kind: 'field'; label: string; value: string; strikethrough?: boolean }
  | { kind: 'identity'; firstName: string; lastName: string }
  | { kind: 'actions'; actions: ContactAction[] }
  | { kind: 'address'; value: string };

export type BuildRdvInfoRowsOptions = {
  /** Lot multi-RDV : soins listés dans « Actes du lot », pas ici. */
  omitCareFields?: boolean;
};

const CARE_ITEM_LABEL_RE = /^(Soins prévus|Prestations) #(\d+)$/;
const CARE_META_LABELS = new Set([
  'Type de prise en charge',
  'Fréquence',
  'Préférence infirmier',
  'Type prélèvement',
  'Durée',
]);

function contactActions(phone: string, emailHref: string | null): ContactAction[] {
  const actions: ContactAction[] = [];
  const tel = phone.replace(/\s/g, '');
  if (tel) {
    actions.push({
      key: 'phone',
      label: 'Appeler',
      icon: 'phone',
      onPress: () => void Linking.openURL(`tel:${tel}`),
    });
    actions.push({
      key: 'sms',
      label: 'Message',
      icon: 'message',
      onPress: () => void Linking.openURL(`sms:${tel}`),
    });
  }
  if (emailHref) {
    actions.push({
      key: 'email',
      label: 'E-mail',
      icon: 'email',
      onPress: () => void Linking.openURL(emailHref),
    });
  }
  return actions;
}

function buildCareRows(apt: Appointment): RdvInfoRow[] {
  const multipleCare = appointmentHasMultipleCareLines(apt);
  const careName = (apt.category_name ?? '').trim();

  const extra = buildAppointmentDetailKvRows(apt, {
    hideAddress: true,
    hideScheduledDate: true,
    hideCreatedAt: true,
    titleContext: multipleCare ? null : careName,
  }).filter((r) => {
    const skip = new Set([
      'Soins prévus',
      'Prestations',
      'Type de soin',
      'Message',
      'Créé le',
      'Modifié le',
    ]);
    return r.value && !skip.has(r.label);
  });

  const meta: { label: string; value: string }[] = [];
  const items: { num: number; value: string }[] = [];

  for (const r of extra) {
    const careMatch = r.label.match(CARE_ITEM_LABEL_RE);
    if (careMatch) {
      items.push({ num: Number(careMatch[2]), value: r.value });
      continue;
    }
    if (CARE_META_LABELS.has(r.label)) {
      meta.push({ label: r.label, value: r.value });
      continue;
    }
    if (!multipleCare) {
      meta.push({ label: r.label, value: r.value });
    }
  }

  items.sort((a, b) => a.num - b.num);

  const hasCare =
    meta.length > 0 || items.length > 0 || (careName.length > 0 && !multipleCare);
  if (!hasCare) return [];

  const hasPrestations = extra.some((e) => e.label.startsWith('Prestations'));
  const itemLabelPrefix = hasPrestations ? 'Prestations' : 'Soins prévus';

  const rows: RdvInfoRow[] = [];

  if (!multipleCare && careName && items.length === 0) {
    rows.push({ kind: 'field', label: 'Soin', value: careName });
  }

  for (const m of meta) {
    rows.push({ kind: 'field', label: m.label, value: m.value });
  }

  for (const item of items) {
    rows.push({
      kind: 'field',
      label: `${itemLabelPrefix} #${item.num}`,
      value: item.value,
    });
  }

  return rows;
}

function buildRdvRows(apt: Appointment, viewer?: AuthUser | null): RdvInfoRow[] {
  const rows: RdvInfoRow[] = [];
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const canceled = isAppointmentCanceled(apt.status);
  const strike = canceled;

  const addr = appointmentAddressLine(apt);
  if (addr) rows.push({ kind: 'address', value: addr });

  const datePart = formatFrenchWeekdayDate(apt.scheduled_at);
  const slot = formatAvailabilityDisplayFr(fd.availability, apt.scheduled_at);
  const dateCreaneau = [datePart, slot].filter(Boolean).join(' · ');
  if (dateCreaneau) {
    rows.push({ kind: 'field', label: 'Date & créneau', value: dateCreaneau, strikethrough: strike });
  }

  const first = beneficiaryFirstName(apt);
  const last = beneficiaryLastName(apt);
  if (first || last) {
    rows.push({ kind: 'identity', firstName: first || '—', lastName: last || '—' });
  }

  const relLine = relationshipLine(apt);
  if (relLine) rows.push({ kind: 'field', label: 'Lien', value: relLine });

  const birth = beneficiaryBirthLine(apt);
  if (birth) rows.push({ kind: 'field', label: 'Date de naissance', value: birth });

  const email = patientContactEmail(apt, viewer ?? undefined);
  if (email.text) rows.push({ kind: 'field', label: 'E-mail', value: email.text });

  const phone = patientPhone(apt);
  const actions = contactActions(phone, email.href);
  if (actions.length) rows.push({ kind: 'actions', actions });

  if (showBookingContactBlock(apt)) {
    const bookerName = bookingContactFullName(apt);
    if (bookerName) {
      rows.push({ kind: 'field', label: 'Rendez-vous pris par', value: bookerName });
    }
  }

  return rows;
}

function insertCareAfterDateSlot(rdv: RdvInfoRow[], care: RdvInfoRow[]): RdvInfoRow[] {
  if (!care.length) return rdv;

  const dateIdx = rdv.findIndex(
    (r) => r.kind === 'field' && r.label === 'Date & créneau',
  );
  let insertAt: number;
  if (dateIdx >= 0) {
    insertAt = dateIdx + 1;
  } else {
    const addrIdx = rdv.findIndex((r) => r.kind === 'address');
    insertAt = addrIdx >= 0 ? addrIdx + 1 : 0;
  }

  return [...rdv.slice(0, insertAt), ...care, ...rdv.slice(insertAt)];
}

/** Toutes les lignes dans la même carte (marges identiques). */
export function buildRdvInfoContent(
  apt: Appointment,
  viewer?: AuthUser | null,
  options: BuildRdvInfoRowsOptions = {},
): { rows: RdvInfoRow[] } {
  const rdv = buildRdvRows(apt, viewer);
  const care = options.omitCareFields ? [] : buildCareRows(apt);
  return { rows: insertCareAfterDateSlot(rdv, care) };
}

/** @deprecated Utiliser buildRdvInfoContent. */
export function buildRdvInfoRows(
  apt: Appointment,
  viewer?: AuthUser | null,
  options: BuildRdvInfoRowsOptions = {},
): RdvInfoRow[] {
  return buildRdvInfoContent(apt, viewer, options).rows;
}
