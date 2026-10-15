import {
  incomingOfferBatchKey,
  incomingOfferIdsCoveredByOpen,
  mergeOfferBatchSiblings,
  planIncomingOfferEnqueue,
  type IncomingOfferClusterSource,
} from '@oneandlab/shared-utils'
import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import { isBloodTestAppointment } from '~/utils/appointment-type-rules'
import {
  isTakenByColleagueFromDetail,
  parseAppointmentAccessResponse,
  unavailableNoticeMessage,
  unavailableNoticeTitle,
} from '~/utils/appointment-access-response'

/**
 * File d'attente FIFO pour les modals RDV en attente (Lab, Sub Lab, Préleveur, Nurse).
 * Une seule modal à la fois.
 * Un envoi (lot SQL, ou même patient créé dans les 2 minutes) n'ouvre qu'une fenêtre.
 */
export function useAppointmentModalQueue(options?: {
  onDisplayed?: (appointment: any) => void
}) {
  const queue = useState<any[]>('appointment-modal.queue', () => [])
  const displayedOrQueuedIds = useState<Set<string>>('appointment-modal.displayedOrQueuedIds', () => new Set())
  const displayedOrQueuedBatchKeys = useState<Set<string>>('appointment-modal.displayedOrQueuedBatchKeys', () => new Set())
  const coveredSnapshots = useState<IncomingOfferClusterSource[]>('appointment-modal.coveredSnapshots', () => [])
  const showAppointmentModal = useState<boolean>('appointment-modal.show', () => false)
  const selectedAppointment = useState<any | null>('appointment-modal.appointment', () => null)
  /** Jeton lien WhatsApp / partage confrère : envoyé au PUT confirm si présent. */
  const shareTokenForAccept = useState<string | null>('appointment-modal.shareToken', () => null)

  const onDisplayed = options?.onDisplayed

  function offerSnapshot(appointment: any): IncomingOfferClusterSource {
    return {
      id: appointment?.id ? String(appointment.id) : '',
      type: appointment?.type ?? null,
      creation_batch_id: appointment?.creation_batch_id ?? null,
      patient_id: appointment?.patient_id ?? null,
      relative_id: appointment?.relative_id ?? null,
      created_at: appointment?.created_at ?? null,
      status: appointment?.status ?? null,
      scheduled_at: appointment?.scheduled_at ?? null,
      category_name: appointment?.category_name ?? null,
      batch_siblings: Array.isArray(appointment?.batch_siblings)
        ? appointment.batch_siblings
            .filter((sibling: { id?: string }) => sibling?.id)
            .map((sibling: { id: string }) => ({ id: String(sibling.id), status: '', scheduled_at: '' }))
        : [],
    }
  }

  function rememberCovered(ids: Iterable<string>, snapshots: IncomingOfferClusterSource[]) {
    const nextIds = new Set(displayedOrQueuedIds.value)
    const nextBatchKeys = new Set(displayedOrQueuedBatchKeys.value)
    for (const id of ids) {
      if (id) nextIds.add(String(id))
    }
    for (const snapshot of snapshots) {
      const key = incomingOfferBatchKey(snapshot)
      if (key) nextBatchKeys.add(key)
    }
    displayedOrQueuedIds.value = nextIds
    displayedOrQueuedBatchKeys.value = nextBatchKeys
    const merged = [...coveredSnapshots.value]
    for (const snapshot of snapshots) {
      if (!snapshot.id) continue
      const index = merged.findIndex((item) => String(item.id) === String(snapshot.id))
      if (index >= 0) merged[index] = snapshot
      else merged.push(snapshot)
    }
    coveredSnapshots.value = merged.slice(-300)
  }

  function alreadyCoveredSources(): IncomingOfferClusterSource[] {
    const byId = new Map<string, IncomingOfferClusterSource>()
    for (const id of displayedOrQueuedIds.value) byId.set(String(id), { id: String(id) })
    for (const snapshot of coveredSnapshots.value) {
      if (snapshot?.id) byId.set(String(snapshot.id), snapshot)
    }
    for (const queued of queue.value) {
      if (queued?.id) byId.set(String(queued.id), offerSnapshot(queued))
    }
    return [...byId.values()]
  }

  /**
   * Retire de la file toutes les lignes du même envoi que le détail chargé
   * (lot SQL, frères du GET, ou même patient créé dans les 2 minutes).
   */
  function absorbOpenedLot(data: any) {
    const queued = queue.value
    const dropIds = new Set(incomingOfferIdsCoveredByOpen(data, queued))
    const clustered = queued.filter((item: any) => item?.id && dropIds.has(String(item.id)))
    queue.value = queued.filter((item: any) => !item?.id || !dropIds.has(String(item.id)))
    const batchKey = incomingOfferBatchKey(data)
    if (batchKey) {
      queue.value = queue.value.filter((item: any) => incomingOfferBatchKey(item) !== batchKey)
    }
    const merged = mergeOfferBatchSiblings(data, clustered)
    rememberCovered(dropIds, [offerSnapshot(merged), ...clustered.map(offerSnapshot)])
    return merged
  }

  async function enqueueOne(appointment: any) {
    await enqueueMany(appointment ? [appointment] : [])
  }

  async function enqueueMany(appointments: any[]) {
    if (!appointments?.length) return
    const displayedId =
      showAppointmentModal.value && selectedAppointment.value?.id
        ? String(selectedAppointment.value.id)
        : ''
    const candidates = appointments.filter(
      (item: any) => item?.id && String(item.id) !== displayedId,
    )
    const plan = planIncomingOfferEnqueue(candidates, alreadyCoveredSources())
    if (plan.enqueue.length === 0 && plan.coveredIds.length === 0) return
    const snapshots = [
      ...plan.enqueue.map(offerSnapshot),
      ...candidates
        .filter((item: any) => plan.coveredIds.includes(String(item.id)))
        .map(offerSnapshot),
    ]
    rememberCovered(
      [...plan.coveredIds, ...plan.enqueue.map((item) => String(item.id))],
      snapshots,
    )
    if (plan.enqueue.length === 0) return
    queue.value = [...queue.value, ...plan.enqueue]
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
      const parsed = parseAppointmentAccessResponse(detailRes)

      if (parsed.kind === 'already_accepted') {
        absorbOpenedLot(next)
        selectedAppointment.value = { id: appId, __modalPresetTaken: true }
        showAppointmentModal.value = true
        onDisplayed?.(selectedAppointment.value)
        return
      }

      if (parsed.kind === 'unavailable') {
        absorbOpenedLot(next)
        const toast = useAppToast()
        toast.add({
          title: unavailableNoticeTitle(parsed.reason),
          description: unavailableNoticeMessage(parsed.reason),
          color: 'neutral',
        })
        await processNext()
        return
      }

      if (parsed.kind !== 'data') {
        absorbOpenedLot(next)
        await processNext()
        return
      }

      const data = parsed.data
      if (['canceled', 'refused', 'expired'].includes(String(data.status ?? ''))) {
        absorbOpenedLot(data)
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
      if (role === 'nurse' && isBloodTestAppointment(typeof data.type === 'string' ? data.type : undefined)) {
        absorbOpenedLot(data)
        await processNext()
        return
      }
      // Pas de popup « accepter / refuser » pour un RDV qu’on a créé soi-même (ni après redispatch si l’API renvoie encore la ligne)
      if ((role === 'nurse' || role === 'lab' || role === 'subaccount' || role === 'preleveur') && !isPendingIncomingOffer(data, myId)) {
        absorbOpenedLot(data)
        await processNext()
        return
      }
      const alreadyAcceptedByOther = isTakenByColleagueFromDetail(data, role, myId)
      const merged = absorbOpenedLot(data)

      if (alreadyAcceptedByOther) {
        selectedAppointment.value = merged
        showAppointmentModal.value = true
        onDisplayed?.(merged)
        return
      }

      selectedAppointment.value = merged
      showAppointmentModal.value = true
      onDisplayed?.(merged)
    } catch (e) {
      console.error('[useAppointmentModalQueue] processNext', e)
      const head = queue.value[0]
      queue.value = queue.value.slice(1)
      if (head?.id) rememberCovered([String(head.id)], [offerSnapshot(head)])
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
      void enqueueOne(appointment)
      return
    }
    const merged = appointment?.id ? absorbOpenedLot(appointment) : appointment
    selectedAppointment.value = merged
    showAppointmentModal.value = true
    onDisplayed?.(merged)
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
