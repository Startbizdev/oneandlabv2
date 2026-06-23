export type AppointmentUnavailableReason = 'canceled' | 'refused' | 'expired' | (string & {})

export type AppointmentAccessParseResult =
  | { kind: 'data'; data: Record<string, unknown> }
  | { kind: 'already_accepted' }
  | { kind: 'unavailable'; reason: AppointmentUnavailableReason }
  | { kind: 'error' }

export function parseAppointmentAccessResponse(res: unknown): AppointmentAccessParseResult {
  if (!res || typeof res !== 'object') return { kind: 'error' }
  const body = res as Record<string, unknown>
  if (body.success !== true) return { kind: 'error' }
  if (body.alreadyAccepted === true) return { kind: 'already_accepted' }
  if (body.appointmentUnavailable === true) {
    return {
      kind: 'unavailable',
      reason: String(body.reason ?? 'unavailable'),
    }
  }
  if (body.data && typeof body.data === 'object') {
    return { kind: 'data', data: body.data as Record<string, unknown> }
  }
  return { kind: 'error' }
}

/** Un RDV pending ne peut pas être « pris par un confrère ». */
export function isTakenByColleagueFromDetail(
  data: Record<string, unknown> | null | undefined,
  role: string | undefined,
  myId: string | undefined,
): boolean {
  if (!data || !myId) return false
  if (String(data.status ?? '') === 'pending') return false

  const my = String(myId)
  if (role === 'nurse') {
    const nurseId =
      data.assigned_nurse_id != null && data.assigned_nurse_id !== ''
        ? String(data.assigned_nurse_id)
        : ''
    return !!(nurseId && nurseId !== my)
  }
  if (role === 'lab' || role === 'subaccount') {
    const labId =
      data.assigned_lab_id != null && data.assigned_lab_id !== ''
        ? String(data.assigned_lab_id)
        : ''
    return !!(labId && labId !== my)
  }
  if (role === 'preleveur') {
    const preleveurId =
      data.assigned_to != null && data.assigned_to !== ''
        ? String(data.assigned_to)
        : ''
    return !!(preleveurId && preleveurId !== my)
  }
  return false
}

export function unavailableNoticeTitle(reason: AppointmentUnavailableReason): string {
  if (reason === 'canceled') return 'Rendez-vous annulé'
  if (reason === 'refused') return 'Rendez-vous refusé'
  if (reason === 'expired') return 'Rendez-vous expiré'
  return 'Rendez-vous indisponible'
}

export function unavailableNoticeMessage(reason: AppointmentUnavailableReason): string {
  if (reason === 'canceled') {
    return 'Ce rendez-vous a été annulé et n’est plus disponible.'
  }
  if (reason === 'refused') {
    return 'Ce rendez-vous a été refusé et n’est plus disponible.'
  }
  if (reason === 'expired') {
    return 'Ce rendez-vous a expiré et n’est plus disponible.'
  }
  return 'Ce rendez-vous n’est plus disponible.'
}
