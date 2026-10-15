import { isPendingIncomingOffer, isSeparateOfferLine } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { updateAppointment, snoozeOfferAppointment } from '@/features/appointments/api/appointments.service';
import type { AppointmentListRow } from '@/utils/appointment-batch';

export type OfferActionResult =
  | { ok: true; declinedOffer?: boolean; count: number }
  | { ok: false; planLimit?: boolean; alreadyTaken?: boolean; error: string };

const ALREADY_TAKEN_RE =
  /déjà été accepté|déjà accepté|plus disponible|ne peut plus être accepté|ne vous est pas proposé|autre infirmier|autre professionnel|n'est plus disponible/i;

export function isRdvAlreadyTakenMessage(text: string | null | undefined): boolean {
  if (!text) return false;
  return ALREADY_TAKEN_RE.test(String(text));
}

export function isIncomingOfferAppointment(
  apt: Appointment,
  userId: string | undefined,
): boolean {
  return (
    apt.status === 'pending' &&
    isPendingIncomingOffer(apt, userId) &&
    (String((apt as Appointment & { assigned_nurse_id?: string }).assigned_nurse_id ?? '') ===
      String(userId ?? '') ||
      !(apt as Appointment & { assigned_nurse_id?: string }).assigned_nurse_id)
  );
}

/** IDs des RDV du lot encore proposables à l'infirmier. */
export function collectIncomingOfferIds(
  row: AppointmentListRow,
  userId: string | undefined,
): string[] {
  const apts = row.kind === 'batch' ? row.appointments : [row.appointment];
  return apts.filter((a) => isIncomingOfferAppointment(a, userId)).map((a) => a.id);
}

function parseUpdateError(err: unknown): OfferActionResult {
  const msg =
    err instanceof Error ? err.message : 'Une erreur est survenue';
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  if (code === 'PLAN_LIMIT' || /limite|offre Découverte/i.test(msg)) {
    return { ok: false, planLimit: true, error: msg };
  }
  if (isRdvAlreadyTakenMessage(msg)) {
    return { ok: false, alreadyTaken: true, error: msg };
  }
  return { ok: false, error: msg };
}

export async function acceptOfferAppointment(
  appointmentId: string,
  shareToken?: string | null,
): Promise<OfferActionResult> {
  try {
    const body: Record<string, unknown> = { status: 'confirmed' };
    if (shareToken) body.share_token = shareToken;
    const res = await updateAppointment(appointmentId, body);
    if (!res.success) {
      const errMsg = res.error ?? res.message ?? 'Impossible d’accepter';
      if (isRdvAlreadyTakenMessage(errMsg)) {
        return { ok: false, alreadyTaken: true, error: errMsg };
      }
      if (res.code === 'PLAN_LIMIT' || /limite|Découverte/i.test(errMsg)) {
        return { ok: false, planLimit: true, error: errMsg };
      }
      return { ok: false, error: errMsg };
    }
    return { ok: true, count: 1 };
  } catch (e) {
    return parseUpdateError(e);
  }
}

export async function refuseOfferAppointment(appointmentId: string): Promise<OfferActionResult> {
  try {
    const res = await updateAppointment(appointmentId, { status: 'refused' });
    if (!res.success) {
      return { ok: false, error: res.error ?? res.message ?? 'Impossible de refuser' };
    }
    const declined = Boolean((res as { declined_offer?: boolean }).declined_offer);
    return { ok: true, declinedOffer: declined, count: 1 };
  } catch (e) {
    return parseUpdateError(e);
  }
}

/** Accepte tout le lot (comme la web : un PUT par RDV si lot cluster sans batch_id commun). */
export async function acceptOfferBatch(
  row: AppointmentListRow,
  userId: string | undefined,
  shareToken?: string | null,
): Promise<OfferActionResult> {
  const ids = collectIncomingOfferIds(row, userId);
  if (!ids.length) return { ok: false, error: 'Aucune offre à accepter' };

  const apts =
    row.kind === 'batch'
      ? [...row.appointments].sort(
          (a, b) =>
            new Date(a.scheduled_at || a.created_at || 0).getTime() -
            new Date(b.scheduled_at || b.created_at || 0).getTime(),
        )
      : [row.appointment];

  const toAccept = apts.filter((a) => ids.includes(a.id));
  const shared = toAccept.filter((a) => !isSeparateOfferLine(a));
  const separate = toAccept.filter((a) => isSeparateOfferLine(a));
  const primary = shared[0] ?? separate[0];
  if (!primary) return { ok: false, error: 'Aucune offre à accepter' };

  let okCount = 0;
  if (shared.length > 0) {
    const accepted = await acceptOfferAppointment(shared[0].id, shareToken);
    if (!accepted.ok) return accepted;
    okCount += shared.length;
  }
  for (let i = 0; i < separate.length; i += 1) {
    const accepted = await acceptOfferAppointment(
      separate[i].id,
      shared.length === 0 && i === 0 ? shareToken : null,
    );
    if (!accepted.ok) return accepted;
    okCount += 1;
  }
  return { ok: true, count: okCount };
}

export async function refuseOfferBatch(
  row: AppointmentListRow,
  userId: string | undefined,
): Promise<OfferActionResult> {
  const ids = collectIncomingOfferIds(row, userId);
  if (!ids.length) return { ok: false, error: 'Aucune offre à refuser' };

  let declinedAny = false;
  for (const id of ids) {
    const r = await refuseOfferAppointment(id);
    if (!r.ok) return r;
    if (r.declinedOffer) declinedAny = true;
  }
  return { ok: true, declinedOffer: declinedAny, count: ids.length };
}

/** Reporter la modal sans retirer l'offre (snooze serveur 30 min). */
export async function snoozeOfferBatch(
  row: AppointmentListRow,
  userId: string | undefined,
): Promise<OfferActionResult> {
  const ids = collectIncomingOfferIds(row, userId);
  if (!ids.length) return { ok: false, error: 'Aucune offre à reporter' };

  for (const id of ids) {
    const res = await snoozeOfferAppointment(id);
    if (!res.success) {
      return { ok: false, error: res.error ?? res.message ?? 'Impossible de reporter' };
    }
  }
  return { ok: true, count: ids.length };
}
