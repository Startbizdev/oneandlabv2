import { isPendingIncomingOffer } from '~/utils/appointment-offer'

/** Affiche immédiatement l’état « déjà pris par un confrère » (aucune donnée patient / pas d’actions accepter). */
export function appointmentModalAlreadyTakenPayload(appointmentId: string) {
  return { id: appointmentId, __modalPresetTaken: true as const }
}

/**
 * Composable partagé pour ouvrir la modal d'acceptation RDV (nurse, lab, subaccount).
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

  function appointmentsDetailPath(appointmentId: string): string {
    const role = user.value?.role
    const base = role === 'nurse' ? '/nurse' : role === 'subaccount' ? '/subaccount' : '/lab'
    return `${base}/appointments/${appointmentId}`
  }

  /** Aligné sur useAppointmentModalQueue.processNext : modal seulement si le RDV est encore « prenable ». */
  function canOpenAcceptModal(data: any, role: string | undefined, myId: string | undefined): boolean {
    if (!data || data.status !== 'pending' || !myId) return false
    if (role === 'nurse') {
      // Les prises de sang sont acceptées par lab / sous-compte, pas par l'infirmier
      if (data.type === 'blood_test') return false
      if (!isPendingIncomingOffer(data, myId)) return false
      const alreadyTaken =
        (data.assigned_nurse_id != null && String(data.assigned_nurse_id) !== String(myId)) ||
        (data.assigned_lab_id != null && String(data.assigned_lab_id) !== '')
      return !alreadyTaken
    }
    if (role === 'lab' || role === 'subaccount') {
      if (data.type !== 'blood_test') return false
      if (!isPendingIncomingOffer(data, myId)) return false
      const alreadyTaken = data.assigned_lab_id != null && String(data.assigned_lab_id) !== String(myId)
      return !alreadyTaken
    }
    return false
  }

  /** Un autre pro a déjà accepté : afficher la modal « déjà pris », pas la fiche détail. */
  function isTakenByOther(data: any, role: string | undefined, myId: string | undefined): boolean {
    if (!data || !myId) return false
    const my = String(myId)
    if (role === 'nurse') {
      const nid =
        data.assigned_nurse_id != null && data.assigned_nurse_id !== ''
          ? String(data.assigned_nurse_id)
          : ''
      if (nid && nid !== my) return true
      if (data.assigned_lab_id != null && String(data.assigned_lab_id) !== '') return true
      return false
    }
    if (role === 'lab' || role === 'subaccount') {
      const lid =
        data.assigned_lab_id != null && data.assigned_lab_id !== ''
          ? String(data.assigned_lab_id)
          : ''
      return !!(lid && lid !== my)
    }
    return false
  }

  async function openAppointmentModalById(appointmentId: string) {
    const role = user.value?.role
    const myId = user.value?.id
    if (!appointmentId || !['nurse', 'lab', 'subaccount'].includes(role ?? '')) return
    try {
      const { apiFetch } = await import('~/utils/api')
      const detailRes = await apiFetch(`/appointments/${appointmentId}`, { method: 'GET' })
      if (!detailRes?.success) return
      if ((detailRes as { alreadyAccepted?: boolean }).alreadyAccepted) {
        openDirectly(appointmentModalAlreadyTakenPayload(appointmentId))
        return
      }
      const data = detailRes.data
      if (data && canOpenAcceptModal(data, role, myId)) {
        openDirectly(data)
        return
      }
      if (data && isTakenByOther(data, role, myId)) {
        openDirectly({ ...data, __modalPresetTaken: true as const })
      }
    } catch (e) {
      console.error('[useAppointmentModal] openAppointmentModalById', e)
    }
  }

  /** Ouvre la modal d’acceptation si le RDV est encore offert ; si déjà pris par un confrère, modal « déjà pris » ; sinon fiche détail. */
  async function openAppointmentModalByIdIfEligible(appointmentId: string) {
    const role = user.value?.role
    const myId = user.value?.id
    const detailPath = appointmentsDetailPath(appointmentId)
    if (!appointmentId || !['nurse', 'lab', 'subaccount'].includes(role ?? '') || !myId) {
      await navigateTo(detailPath)
      return
    }
    try {
      const { apiFetch } = await import('~/utils/api')
      const detailRes = await apiFetch(`/appointments/${appointmentId}`, { method: 'GET' })
      if (!detailRes?.success) {
        await navigateTo(detailPath)
        return
      }
      if ((detailRes as { alreadyAccepted?: boolean }).alreadyAccepted) {
        openDirectly(appointmentModalAlreadyTakenPayload(appointmentId))
        return
      }
      const data = detailRes.data
      if (!data) {
        await navigateTo(detailPath)
        return
      }
      if (canOpenAcceptModal(data, role, myId)) {
        openDirectly(data)
        return
      }
      if (isTakenByOther(data, role, myId)) {
        openDirectly({ ...data, __modalPresetTaken: true as const })
        return
      }
      await navigateTo(detailPath)
    } catch (e) {
      console.error('[useAppointmentModal] openAppointmentModalByIdIfEligible', e)
      await navigateTo(detailPath)
    }
  }

  /**
   * Lien partagé (WhatsApp) : GET `/appointments/:id?share_token=` (même agrégat que sans token : `Appointment::getById`, donc `batch_siblings` si lot).
   * Puis `openDirectly(data)` : la modal reçoit ce détail complet.
   */
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
      if (!detailRes?.success) {
        shareTokenForAccept.value = null
        return
      }
      if ((detailRes as { alreadyAccepted?: boolean }).alreadyAccepted) {
        openDirectly(appointmentModalAlreadyTakenPayload(appointmentId))
        return
      }
      const data = detailRes.data
      if (data) {
        openDirectly(data)
        // GET /appointments/:id?share_token= a matérialisé les offres côté API : rafraîchir « Mes demandes »
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
