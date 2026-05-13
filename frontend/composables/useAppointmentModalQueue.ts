import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules'

/**
 * File d'attente FIFO pour les modals RDV en attente (Lab, Sub Lab, Préleveur, Nurse).
 * Une seule modal à la fois, les RDV s'affichent un par un.
 * Évite les doublons via displayedOrQueuedIds (polling 10s peut réinjecter le même RDV).
 */
export function useAppointmentModalQueue(options?: {
  onDisplayed?: (appointment: any) => void
}) {
  const queue = useState<any[]>('appointment-modal.queue', () => [])
  const displayedOrQueuedIds = useState<Set<string>>('appointment-modal.displayedOrQueuedIds', () => new Set())
  const displayedOrQueuedBatchKeys = useState<Set<string>>('appointment-modal.displayedOrQueuedBatchKeys', () => new Set())
  const showAppointmentModal = useState<boolean>('appointment-modal.show', () => false)
  const selectedAppointment = useState<any | null>('appointment-modal.appointment', () => null)
  /** Jeton lien WhatsApp / partage confrère : envoyé au PUT confirm si présent. */
  const shareTokenForAccept = useState<string | null>('appointment-modal.shareToken', () => null)

  const onDisplayed = options?.onDisplayed

  /** Lot prise de sang ou soins infirmiers (plusieurs lignes même `creation_batch_id`). */
  function appointmentBatchGroupKey(appointment: any): string | null {
    const bid = appointment?.creation_batch_id
    if (!bid) return null
    if (isBloodTestAppointment(appointment?.type)) return `blood_test:${bid}`
    if (isNursingAppointment(appointment?.type)) return `nursing:${bid}`
    return null
  }

  /** IDs du lot renvoyés par GET détail (ligne + batch_siblings). La liste pending peut omettre creation_batch_id → sans ça, N entrées pour un même lot et N modales. */
  function lotIdsFromDetailPayload(data: any): Set<string> {
    const ids = new Set<string>()
    if (data?.id) ids.add(String(data.id))
    const sibs = data?.batch_siblings
    if (Array.isArray(sibs)) {
      for (const s of sibs) {
        if (s?.id) ids.add(String(s.id))
      }
    }
    return ids
  }

  /** Retire de la file tous les RDV du même lot que le détail fraîchement chargé. */
  function purgeQueueForSameLotAsDetail(data: any) {
    const lotIds = lotIdsFromDetailPayload(data)
    if (lotIds.size === 0) return
    queue.value = queue.value.filter((a: any) => !a?.id || !lotIds.has(String(a.id)))
  }

  async function enqueueOne(appointment: any) {
    const id = appointment?.id
    if (!id || displayedOrQueuedIds.value.has(id)) return
    if (showAppointmentModal.value && String(selectedAppointment.value?.id) === String(id)) return
    const batchKey = appointmentBatchGroupKey(appointment)
    if (batchKey && displayedOrQueuedBatchKeys.value.has(batchKey)) return
    displayedOrQueuedIds.value = new Set([...displayedOrQueuedIds.value, id])
    if (batchKey) displayedOrQueuedBatchKeys.value = new Set([...displayedOrQueuedBatchKeys.value, batchKey])
    queue.value = [...queue.value, appointment]
    await processNext()
  }

  async function enqueueMany(appointments: any[]) {
    if (!appointments?.length) return
    const ids = displayedOrQueuedIds.value
    const batchKeys = displayedOrQueuedBatchKeys.value
    const localBatchKeys = new Set<string>()
    const displayedId =
      showAppointmentModal.value && selectedAppointment.value?.id
        ? String(selectedAppointment.value.id)
        : ''
    const toAdd = appointments.filter((a: any) => {
      if (!a?.id || ids.has(a.id)) return false
      if (displayedId && String(a.id) === displayedId) return false
      const batchKey = appointmentBatchGroupKey(a)
      if (!batchKey) return true
      if (batchKeys.has(batchKey) || localBatchKeys.has(batchKey)) return false
      localBatchKeys.add(batchKey)
      return true
    })
    if (toAdd.length === 0) return
    const newIds = new Set([...ids, ...toAdd.map((a: any) => a.id)])
    displayedOrQueuedIds.value = newIds
    const addedBatchKeys = toAdd.map((a: any) => appointmentBatchGroupKey(a)).filter(Boolean) as string[]
    const newBatchKeys = new Set([...batchKeys, ...addedBatchKeys])
    displayedOrQueuedBatchKeys.value = newBatchKeys
    queue.value = [...queue.value, ...toAdd]
    await processNext()
  }

  async function processNext() {
    if (showAppointmentModal.value || queue.value.length === 0) return

    const { apiFetch } = await import('~/utils/api')
    const { user } = useAuth()
    const role = user.value?.role
    const myId = user.value?.id

    if (!['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') || !myId) return

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
            description: 'Plus disponible à l’acceptation.',
            color: 'neutral',
          })
        }
        await processNext()
        return
      }
      if (role === 'nurse' && isBloodTestAppointment(data.type)) {
        queue.value = queue.value.slice(1)
        await processNext()
        return
      }
      // Pas de popup « accepter / refuser » pour un RDV qu’on a créé soi-même (ni après redispatch si l’API renvoie encore la ligne)
      if ((role === 'nurse' || role === 'lab' || role === 'subaccount' || role === 'preleveur') && !isPendingIncomingOffer(data, myId)) {
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
          : role === 'preleveur'
            ? data.assigned_to != null && String(data.assigned_to) !== my
            : data.assigned_lab_id != null && String(data.assigned_lab_id) !== my

      if (alreadyAcceptedByOther) {
        queue.value = queue.value.slice(1)
        purgeQueueForSameLotAsDetail(data)
        const currentLotKey = appointmentBatchGroupKey(data)
        if (currentLotKey) {
          queue.value = queue.value.filter((a: any) => appointmentBatchGroupKey(a) !== currentLotKey)
        }
        selectedAppointment.value = data
        showAppointmentModal.value = true
        onDisplayed?.(data)
        return
      }

      queue.value = queue.value.slice(1)
      purgeQueueForSameLotAsDetail(data)

      const currentLotKey = appointmentBatchGroupKey(data)
      if (currentLotKey) {
        queue.value = queue.value.filter((a: any) => appointmentBatchGroupKey(a) !== currentLotKey)
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
