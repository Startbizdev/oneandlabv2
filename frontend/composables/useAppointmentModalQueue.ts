import { isPendingIncomingOffer } from '~/utils/appointment-offer'

/**
 * File d'attente FIFO pour les modals RDV en attente (Lab, Sub Lab, Nurse).
 * Une seule modal à la fois, les RDV s'affichent un par un.
 * Évite les doublons via displayedOrQueuedIds (polling 10s peut réinjecter le même RDV).
 */
export function useAppointmentModalQueue(options?: {
  onDisplayed?: (appointment: any) => void
}) {
  const queue = useState<any[]>('appointment-modal.queue', () => [])
  const displayedOrQueuedIds = useState<Set<string>>('appointment-modal.displayedOrQueuedIds', () => new Set())
  const showAppointmentModal = useState<boolean>('appointment-modal.show', () => false)
  const selectedAppointment = useState<any | null>('appointment-modal.appointment', () => null)
  /** Jeton lien WhatsApp / partage confrère : envoyé au PUT confirm si présent. */
  const shareTokenForAccept = useState<string | null>('appointment-modal.shareToken', () => null)

  const onDisplayed = options?.onDisplayed

  async function enqueueOne(appointment: any) {
    const id = appointment?.id
    if (!id || displayedOrQueuedIds.value.has(id)) return
    displayedOrQueuedIds.value = new Set([...displayedOrQueuedIds.value, id])
    queue.value = [...queue.value, appointment]
    await processNext()
  }

  async function enqueueMany(appointments: any[]) {
    if (!appointments?.length) return
    const ids = displayedOrQueuedIds.value
    const toAdd = appointments.filter((a: any) => a?.id && !ids.has(a.id))
    if (toAdd.length === 0) return
    const newIds = new Set([...ids, ...toAdd.map((a: any) => a.id)])
    displayedOrQueuedIds.value = newIds
    queue.value = [...queue.value, ...toAdd]
    await processNext()
  }

  async function processNext() {
    if (showAppointmentModal.value || queue.value.length === 0) return

    const { apiFetch } = await import('~/utils/api')
    const { user } = useAuth()
    const role = user.value?.role
    const myId = user.value?.id

    if (!['nurse', 'lab', 'subaccount'].includes(role ?? '') || !myId) return

    const next = queue.value[0]
    const appId = next?.id
    if (!appId) {
      queue.value = queue.value.slice(1)
      await processNext()
      return
    }

    try {
      const detailRes = await apiFetch(`/appointments/${appId}`, { method: 'GET' })
      if (!detailRes?.success || !detailRes.data) {
        queue.value = queue.value.slice(1)
        await processNext()
        return
      }

      const data = detailRes.data
      if (['canceled', 'refused', 'expired'].includes(String(data.status ?? ''))) {
        queue.value = queue.value.slice(1)
        if (data.status === 'canceled') {
          const toast = useAppToast()
          toast.add({
            title: 'Rendez-vous annulé',
            description:
              'Le patient a annulé ce rendez-vous. Il n’est plus disponible pour acceptation.',
            color: 'neutral',
          })
        }
        await processNext()
        return
      }
      if (role === 'nurse' && data.type === 'blood_test') {
        queue.value = queue.value.slice(1)
        await processNext()
        return
      }
      // Pas de popup « accepter / refuser » pour un RDV qu’on a créé soi-même (ni après redispatch si l’API renvoie encore la ligne)
      if ((role === 'nurse' || role === 'lab' || role === 'subaccount') && !isPendingIncomingOffer(data, myId)) {
        queue.value = queue.value.slice(1)
        await processNext()
        return
      }
      const my = String(myId)
      const alreadyAcceptedByOther =
        role === 'nurse'
          ? (data.assigned_nurse_id != null &&
              String(data.assigned_nurse_id) !== my) ||
            (data.assigned_lab_id != null && String(data.assigned_lab_id) !== '')
          : data.assigned_lab_id != null && String(data.assigned_lab_id) !== my

      if (alreadyAcceptedByOther) {
        queue.value = queue.value.slice(1)
        if (data.batch_siblings?.length) {
          const siblingIds = new Set((data.batch_siblings as { id: string }[]).map((s) => s.id))
          queue.value = queue.value.filter((a: any) => !siblingIds.has(String(a.id)))
        }
        selectedAppointment.value = data
        showAppointmentModal.value = true
        onDisplayed?.(data)
        return
      }

      queue.value = queue.value.slice(1)

      // Lot multi-soins : retirer les siblings de la file pour éviter N modals séparées
      if (data.batch_siblings?.length) {
        const siblingIds = new Set((data.batch_siblings as { id: string }[]).map((s) => s.id))
        queue.value = queue.value.filter((a: any) => !siblingIds.has(String(a.id)))
      }

      selectedAppointment.value = data
      showAppointmentModal.value = true
      onDisplayed?.(data)
    } catch (e) {
      console.error('[useAppointmentModalQueue] processNext', e)
      queue.value = queue.value.slice(1)
      await processNext()
    }
  }

  function onModalClosed() {
    showAppointmentModal.value = false
    selectedAppointment.value = null
    processNext()
  }

  /** Ouverture directe (ex: clic "Détails") quand queue vide et modal fermée */
  function openDirectly(appointment: any) {
    if (showAppointmentModal.value) {
      enqueueOne(appointment)
      return
    }
    const id = appointment?.id
    if (id) displayedOrQueuedIds.value = new Set([...displayedOrQueuedIds.value, id])
    selectedAppointment.value = appointment
    showAppointmentModal.value = true
    onDisplayed?.(appointment)
  }

  return {
    showAppointmentModal,
    selectedAppointment,
    shareTokenForAccept,
    queue,
    enqueueOne,
    enqueueMany,
    processNext,
    onModalClosed,
    openDirectly,
  }
}
