import { nextTick } from 'vue'
import { isPendingIncomingOffer } from '~/utils/appointment-offer'
import { isBloodTestAppointment } from '~/utils/appointment-type-rules'
import {
  isTakenByColleagueFromDetail,
  parseAppointmentAccessResponse,
  type AppointmentUnavailableReason,
} from '~/utils/appointment-access-response'

/** Affiche immédiatement l’état « déjà pris par un confrère » (aucune donnée patient / pas d’actions accepter). */
export function appointmentModalAlreadyTakenPayload(appointmentId: string) {
  return { id: appointmentId, __modalPresetTaken: true as const }
}

function appointmentsListPath(role: string | undefined): string {
  if (role === 'nurse') return '/nurse/appointments'
  if (role === 'subaccount') return '/subaccount/appointments'
  if (role === 'preleveur') return '/preleveur'
  return '/lab/appointments'
}

function appointmentsDetailPath(appointmentId: string, role: string | undefined): string {
  const base = role === 'nurse' ? '/nurse' : role === 'subaccount' ? '/subaccount' : role === 'preleveur' ? '/preleveur' : '/lab'
  return `${base}/appointments/${appointmentId}`
}

/**
 * Composable partagé pour ouvrir la modal d'acceptation RDV (nurse, lab, subaccount, preleveur).
 * Délègue à useAppointmentModalQueue pour une seule source de vérité.
 * Utilisé par le layout dashboard et les pages liste RDV pour ouvrir la modal depuis un clic "Détails" sur un RDV pending.
 */
export function useAppointmentModal(options?: { onDisplayed?: (appointment: any) => void }) {
  const { user } = useAuth()
  const {
    showAppointmentModal,
    selectedAppointment,
    shareTokenForAccept,
    enqueueOne,
    enqueueMany,
    openDirectly,
    onModalClosed,
  } = useAppointmentModalQueue(options)

  /** Aligné sur useAppointmentModalQueue.processNext : modal seulement si le RDV est encore « prenable ». */
  function canOpenAcceptModal(data: any, role: string | undefined, myId: string | undefined): boolean {
    if (!data || data.status !== 'pending' || !myId) return false
    if (role === 'nurse') {
      if (isBloodTestAppointment(data.type)) return false
      if (!isPendingIncomingOffer(data, myId)) return false
      const alreadyTaken =
        (data.assigned_nurse_id != null && String(data.assigned_nurse_id) !== String(myId)) ||
        (data.assigned_lab_id != null && String(data.assigned_lab_id) !== '')
      return !alreadyTaken
    }
    if (role === 'lab' || role === 'subaccount') {
      if (!isBloodTestAppointment(data.type)) return false
      if (!isPendingIncomingOffer(data, myId)) return false
      const alreadyTaken = data.assigned_lab_id != null && String(data.assigned_lab_id) !== String(myId)
      return !alreadyTaken
    }
    if (role === 'preleveur') {
      if (!isBloodTestAppointment(data.type)) return false
      if (!isPendingIncomingOffer(data, myId)) return false
      const alreadyTaken = data.assigned_to != null && String(data.assigned_to) !== String(myId)
      return !alreadyTaken
    }
    return false
  }

  async function navigateUnavailable(reason: AppointmentUnavailableReason) {
    const listPath = appointmentsListPath(user.value?.role)
    await navigateTo(`${listPath}?appointmentUnavailable=${encodeURIComponent(reason)}`)
  }

  async function resolveAppointmentOpen(appointmentId: string, options?: { fallbackToDetail?: boolean }) {
    const role = user.value?.role
    const myId = user.value?.id
    const detailPath = appointmentsDetailPath(appointmentId, role)
    if (!appointmentId || !['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '')) return

    try {
      const { apiFetch } = await import('~/utils/api')
      const detailRes = await apiFetch(`/appointments/${appointmentId}`, { method: 'GET' })
      const parsed = parseAppointmentAccessResponse(detailRes)

      if (parsed.kind === 'already_accepted') {
        openDirectly(appointmentModalAlreadyTakenPayload(appointmentId))
        return
      }
      if (parsed.kind === 'unavailable') {
        await navigateUnavailable(parsed.reason)
        return
      }
      if (parsed.kind !== 'data') {
        if (options?.fallbackToDetail !== false) await navigateTo(detailPath)
        return
      }

      const data = parsed.data
      if (canOpenAcceptModal(data, role, myId)) {
        openDirectly(data)
        return
      }
      if (isTakenByColleagueFromDetail(data, role, myId)) {
        openDirectly({ ...data, __modalPresetTaken: true as const })
        return
      }
      if (options?.fallbackToDetail !== false) {
        await navigateTo(detailPath)
      }
    } catch (e) {
      console.error('[useAppointmentModal] resolveAppointmentOpen', e)
      if (options?.fallbackToDetail !== false) await navigateTo(detailPath)
    }
  }

  async function openAppointmentModalById(appointmentId: string) {
    await resolveAppointmentOpen(appointmentId, { fallbackToDetail: true })
  }

  /** Ouvre la modal d’acceptation si le RDV est encore offert ; si déjà pris par un confrère, modal « déjà pris » ; sinon fiche détail. */
  async function openAppointmentModalByIdIfEligible(appointmentId: string) {
    const role = user.value?.role
    const myId = user.value?.id
    const detailPath = appointmentsDetailPath(appointmentId, role)
    if (!appointmentId || !['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') || !myId) {
      await navigateTo(detailPath)
      return
    }
    await resolveAppointmentOpen(appointmentId, { fallbackToDetail: true })
  }

  async function openAppointmentModalFromShareLink(appointmentId: string, shareToken: string) {
    const role = user.value?.role
    const myId = user.value?.id
    if (!appointmentId || !shareToken || role !== 'nurse' || !myId) return
    const { apiFetch } = await import('~/utils/api')
    shareTokenForAccept.value = shareToken
    try {
      const detailRes = await apiFetch(
        `/appointments/${encodeURIComponent(appointmentId)}?share_token=${encodeURIComponent(shareToken)}`,
        { method: 'GET' },
      )
      const parsed = parseAppointmentAccessResponse(detailRes)
      if (parsed.kind === 'already_accepted') {
        openDirectly(appointmentModalAlreadyTakenPayload(appointmentId))
        return
      }
      if (parsed.kind === 'unavailable') {
        shareTokenForAccept.value = null
        await navigateUnavailable(parsed.reason)
        return
      }
      if (parsed.kind === 'data') {
        await nextTick()
        openDirectly(parsed.data)
        const listRefreshTrigger = useState<number>('appointments.listRefreshTrigger', () => 0)
        listRefreshTrigger.value += 1
      } else {
        shareTokenForAccept.value = null
      }
    } catch (e) {
      console.error('[useAppointmentModal] openAppointmentModalFromShareLink', e)
      shareTokenForAccept.value = null
    }
  }

  return {
    showAppointmentModal,
    selectedAppointment,
    shareTokenForAccept,
    openAppointmentModalById,
    openAppointmentModalByIdIfEligible,
    openAppointmentModalFromShareLink,
    enqueueMany,
    onModalClosed,
  }
}
