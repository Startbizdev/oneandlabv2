import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { careEmojiForAppointment, careEmojiForCareItem } from '@/utils/care-category-display';
import type { CareCategory } from '@/features/categories/api/categories.service';
import {
  buildAppointmentCareOptionKvRows,
  buildNursingAppointmentFormMetaKvRows,
  buildNursingItemPerActOptionKvRows,
  buildNursingItemTypeKvRow,
  getAppointmentBloodItems,
  getAppointmentNursingItems,
  getBloodTestTypeLabel,
  getNursingDurationLabel,
  getFrequencyLabel,
  getPreferredNurseGenderLabel,
  isAppointmentCanceled,
  resolveCareItemDisplayLabel,
  nursingItemMetaDurationLabel,
  nursingItemMetaFrequencyLabel,
  shouldShowNursingItemTypeRow,
} from '@/utils/appointment-detail-display';
import {
  buildBatchLotCommonKvRows,
  buildNursingSharedIdenticalKvRows,
  collectLotBloodItems,
  collectLotNursingItems,
  nursingSharedOptionKeys,
} from '@/utils/batch-appointment-detail-display';
import {
  formatAvailabilityDisplayFr as formatAvailabilityDisplayFrBase,
  formatFrenchWeekdayDate,
} from '@/utils/appointment-datetime-fr';
import {
  formatPassageDurationFromFormData,
  formatPassageLocationFromFormData,
  formatPassageTimeSlotFromFormData,
  isNursePassageFormData,
} from '@oneandlab/shared-utils';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  appointmentBeneficiaryAvatarMeta,
  beneficiaryBirthLine,
  beneficiaryFirstName,
  beneficiaryLastName,
  bookingContactFullName,
  patientContactEmail,
  relationshipLine,
  showBookingContactBlock,
} from './patient-appointment-display';
import { isAppointmentForRelative } from '@/utils/patient-appointment-list';
dayjs.locale('fr');

export type RdvInfoRow =
  | { kind: 'field'; label: string; value: string; emoji?: string; strikethrough?: boolean }
  | {
      kind: 'identity';
      firstName: string;
      lastName: string;
      identityLabel?: string;
      profileImageUrl?: string | null;
      gender?: string | null;
      avatarSeed?: string;
    }
  | { kind: 'address'; value: string };

export type BuildRdvInfoRowsOptions = {
  /** @deprecated Les soins lot passent par `batch`. */
  omitCareFields?: boolean;
  /** Actes liés (même créneau) : soins dans cette carte, sans date/statut répétés. */
  batch?: Appointment[];
  /** Catalogue pour libellés d’options soin (localisation, type, etc.). */
  categories?: CareCategory[];
};

const SKIP_CARE_KV_LABELS = new Set([
  'Soins prévus',
  'Prestations',
  'Type de soin',
  'Message',
  'Créé le',
  'Modifié le',
  'Date & heure',
]);

const CARE_ITEM_LABEL_RE = /^(Soins prévus|Prestations) #(\d+)$/;
const CARE_META_LABELS = new Set([
  'Type de prise en charge',
  'Fréquence',
  'Préférence infirmier',
  'Type prélèvement',
  'Durée',
  'Prise en charge',
]);

function pushCareField(
  rows: RdvInfoRow[],
  label: string,
  value: string,
  emoji?: string,
): void {
  if (!value.trim()) return;
  rows.push({ kind: 'field', label, value, emoji });
}

function pushKvRows(rows: RdvInfoRow[], kv: { label: string; value: string; strikethrough?: boolean }[]): void {
  rows.push(...kvToInfoRows(kv));
}

/** Prise en charge / fréquence communes au RDV, affichées après le 1er acte si absentes sur l’acte. */
function appendSharedNursingFormMetaAfterItem(
  rows: RdvInfoRow[],
  apt: Appointment,
  itemIndex: number,
  itemHasDuration: boolean,
  itemHasFrequency: boolean,
): void {
  if (itemIndex !== 0) return;
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  if (!itemHasDuration) {
    const dur = getNursingDurationLabel(String(fd.duration_days ?? ''), fd.custom_days as number | null);
    if (dur) pushCareField(rows, 'Type de prise en charge', dur);
  }
  if (!itemHasFrequency) {
    const freq =
      fd.frequency != null && fd.frequency !== '' ? getFrequencyLabel(String(fd.frequency)) : '';
    if (freq) pushCareField(rows, 'Fréquence', freq);
  }
}

function buildNursingItemGroupRows(
  apt: Appointment,
  item: Record<string, unknown>,
  idx: number,
  total: number,
  categories: CareCategory[] | undefined,
  sharedKeys: Set<string>,
): RdvInfoRow[] {
  const rows: RdvInfoRow[] = [];
  const itemLabel = resolveCareItemDisplayLabel(item, categories);
  const fieldLabel = total > 1 ? 'Soin' : 'Soins prévus';

  pushCareField(
    rows,
    fieldLabel,
    itemLabel,
    careEmojiForCareItem(item, apt.type, categories, itemLabel),
  );

  if (categories?.length) {
    if (shouldShowNursingItemTypeRow(item, getAppointmentNursingItems(apt), apt)) {
      const typeRow = buildNursingItemTypeKvRow(item, categories);
      if (typeRow) pushCareField(rows, typeRow.label, typeRow.value);
    }
    pushKvRows(rows, buildNursingItemPerActOptionKvRows(item, categories, sharedKeys));
  }

  const itemDur = nursingItemMetaDurationLabel(item);
  if (itemDur) pushCareField(rows, 'Prise en charge', itemDur);

  const itemFreq = nursingItemMetaFrequencyLabel(item);
  if (itemFreq) pushCareField(rows, 'Fréquence', itemFreq);

  appendSharedNursingFormMetaAfterItem(rows, apt, idx, Boolean(itemDur), Boolean(itemFreq));

  return rows;
}

function buildBloodItemGroupRows(
  apt: Appointment,
  item: Record<string, unknown>,
  idx: number,
  total: number,
  categories: CareCategory[] | undefined,
): RdvInfoRow[] {
  const rows: RdvInfoRow[] = [];
  const itemLabel = resolveCareItemDisplayLabel(item, categories);
  const fieldLabel = total > 1 ? 'Prélèvement' : 'Prestation';

  pushCareField(
    rows,
    fieldLabel,
    itemLabel,
    careEmojiForCareItem(item, apt.type, categories, itemLabel),
  );

  if (categories?.length) {
    pushKvRows(rows, buildNursingItemPerActOptionKvRows(item, categories));
  }

  return rows;
}

function buildCareRows(apt: Appointment, categories?: CareCategory[]): RdvInfoRow[] {
  const rows: RdvInfoRow[] = [];
  const nursingItems = getAppointmentNursingItems(apt);
  const bloodItems = getAppointmentBloodItems(apt);
  const careName = (apt.category_name ?? '').trim();
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;

  if (isNursingAppointment(apt.type) && nursingItems.length > 0) {
    const sharedKeys =
      categories?.length && nursingItems.length > 1
        ? nursingSharedOptionKeys(nursingItems, categories)
        : new Set<string>();

    for (let idx = 0; idx < nursingItems.length; idx++) {
      rows.push(
        ...buildNursingItemGroupRows(apt, nursingItems[idx]!, idx, nursingItems.length, categories, sharedKeys),
      );
    }

    if (categories?.length && sharedKeys.size > 0) {
      pushKvRows(rows, buildNursingSharedIdenticalKvRows(nursingItems, categories));
    }

    const pref = getPreferredNurseGenderLabel(String(fd.preferred_nurse_gender ?? ''));
    if (pref && fd.preferred_nurse_gender && fd.preferred_nurse_gender !== 'any') {
      pushCareField(rows, 'Préférence infirmier', pref);
    }

    return rows;
  }

  if (isBloodTestAppointment(apt.type) && bloodItems.length > 0) {
    for (let idx = 0; idx < bloodItems.length; idx++) {
      rows.push(...buildBloodItemGroupRows(apt, bloodItems[idx]!, idx, bloodItems.length, categories));
    }

    const bt = getBloodTestTypeLabel(fd);
    if (bt) pushCareField(rows, 'Type prélèvement', bt);

    return rows;
  }

  if (careName) {
    pushCareField(rows, 'Soin', careName, careEmojiForAppointment(apt, careName, categories));
    if (categories?.length) {
      pushKvRows(rows, buildAppointmentCareOptionKvRows(apt, categories));
    }
    pushKvRows(rows, buildNursingAppointmentFormMetaKvRows(apt));
  }

  return rows;
}

function kvToInfoRows(rows: { label: string; value: string; strikethrough?: boolean }[]): RdvInfoRow[] {
  return rows
    .filter((r) => r.value?.trim())
    .map((r) => ({
      kind: 'field' as const,
      label: r.label,
      value: r.value,
      strikethrough: r.strikethrough,
    }));
}

/** Soins d’un lot : libellés par acte + options, puis champs communs (aligné fiche web). */
function buildBatchCareRows(
  primary: Appointment,
  batch: Appointment[],
  categories?: CareCategory[],
): RdvInfoRow[] {
  if (batch.length <= 1) {
    return buildCareRows(primary, categories);
  }

  const rows: RdvInfoRow[] = [];
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;

  if (isNursingAppointment(primary.type)) {
    const lotItems = collectLotNursingItems(primary, batch);
    if (lotItems.length > 0) {
      const sharedKeys =
        categories?.length && lotItems.length > 1
          ? nursingSharedOptionKeys(lotItems, categories)
          : new Set<string>();

      for (let idx = 0; idx < lotItems.length; idx++) {
        rows.push(
          ...buildNursingItemGroupRows(
            primary,
            lotItems[idx]!,
            idx,
            lotItems.length,
            categories,
            sharedKeys,
          ),
        );
      }

      if (categories?.length && sharedKeys.size > 0) {
        pushKvRows(rows, buildNursingSharedIdenticalKvRows(lotItems, categories));
      }

      const pref = getPreferredNurseGenderLabel(String(fd.preferred_nurse_gender ?? ''));
      if (pref && fd.preferred_nurse_gender && fd.preferred_nurse_gender !== 'any') {
        pushCareField(rows, 'Préférence infirmier', pref);
      }

      if (categories?.length) {
        pushKvRows(rows, buildBatchLotCommonKvRows(primary, batch, categories));
      }
      return rows;
    }
  }

  if (isBloodTestAppointment(primary.type)) {
    const lotItems = collectLotBloodItems(primary, batch);
    if (lotItems.length > 0) {
      for (let idx = 0; idx < lotItems.length; idx++) {
        rows.push(...buildBloodItemGroupRows(primary, lotItems[idx]!, idx, lotItems.length, categories));
      }

      const bt = getBloodTestTypeLabel(fd);
      if (bt) pushCareField(rows, 'Type prélèvement', bt);

      if (categories?.length) {
        pushKvRows(rows, buildBatchLotCommonKvRows(primary, batch, categories));
      }
      return rows;
    }
  }

  return buildCareRows(primary, categories);
}

function buildRdvRows(apt: Appointment, viewer?: AuthUser | null, _batch?: Appointment[]): RdvInfoRow[] {
  const rows: RdvInfoRow[] = [];
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const canceled = isAppointmentCanceled(apt.status);
  const strike = canceled;

  const datePart = formatFrenchWeekdayDate(apt.scheduled_at);
  const fdRecord = fd as Record<string, unknown>;
  const isPassage = isNursePassageFormData(fdRecord, (apt as { passage_source?: string }).passage_source);

  if (isPassage) {
    const slot = formatPassageTimeSlotFromFormData(fdRecord, apt.scheduled_at);
    const dateCreaneau = [datePart, slot].filter(Boolean).join(' · ');
    if (dateCreaneau) {
      rows.push({ kind: 'field', label: 'Date & créneau', value: dateCreaneau, strikethrough: strike });
    }
    const duration = formatPassageDurationFromFormData(fdRecord);
    if (duration) {
      rows.push({ kind: 'field', label: 'Durée du passage', value: duration, strikethrough: strike });
    }
    rows.push({
      kind: 'field',
      label: 'Lieu',
      value: formatPassageLocationFromFormData(fdRecord),
      strikethrough: strike,
    });
  } else {
    const slot = formatAvailabilityDisplayFrBase(fd.availability, apt.scheduled_at, fdRecord);
    const dateCreaneau = [datePart, slot].filter(Boolean).join(' · ');
    if (dateCreaneau) {
      rows.push({ kind: 'field', label: 'Date & créneau', value: dateCreaneau, strikethrough: strike });
    }
  }

  const first = beneficiaryFirstName(apt);
  const last = beneficiaryLastName(apt);
  const isPatientViewer = viewer?.role === 'patient';
  const forRelative = isAppointmentForRelative(apt);

  if ((!isPatientViewer || forRelative) && (first || last)) {
    const avatar = appointmentBeneficiaryAvatarMeta(apt);
    rows.push({
      kind: 'identity',
      firstName: first || '—',
      lastName: last || '—',
      identityLabel: isPatientViewer && forRelative ? 'Pour qui' : 'Patient',
      profileImageUrl: avatar.profileImageUrl,
      gender: avatar.gender,
      avatarSeed: avatar.seed,
    });
  }

  if (!isPatientViewer) {
    const relLine = relationshipLine(apt);
    if (relLine) rows.push({ kind: 'field', label: 'Lien', value: relLine });

    const birth = beneficiaryBirthLine(apt);
    if (birth) rows.push({ kind: 'field', label: 'Date de naissance', value: birth });

    const showEmailField = viewer?.role === 'patient';
    const email = patientContactEmail(apt, viewer ?? undefined);
    if (showEmailField && email.text) {
      rows.push({ kind: 'field', label: 'E-mail', value: email.text });
    }

    if (showBookingContactBlock(apt)) {
      const bookerName = bookingContactFullName(apt);
      if (bookerName) {
        rows.push({ kind: 'field', label: 'Rendez-vous pris par', value: bookerName });
      }
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
export function buildRdvBaseRows(
  apt: Appointment,
  viewer?: AuthUser | null,
  batch?: Appointment[],
): RdvInfoRow[] {
  return buildRdvRows(apt, viewer, batch);
}

export function buildRdvCareRows(
  apt: Appointment,
  options: BuildRdvInfoRowsOptions = {},
): RdvInfoRow[] {
  const batch = options.batch?.filter(Boolean);
  const isLot = (batch?.length ?? 0) > 1;
  if (options.omitCareFields && !isLot) return [];
  return isLot && batch
    ? buildBatchCareRows(apt, batch, options.categories)
    : buildCareRows(apt, options.categories);
}

export function buildRdvInfoContent(
  apt: Appointment,
  viewer?: AuthUser | null,
  options: BuildRdvInfoRowsOptions = {},
): { rows: RdvInfoRow[] } {
  const rdv = buildRdvRows(apt, viewer);
  const care = buildRdvCareRows(apt, options);
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
