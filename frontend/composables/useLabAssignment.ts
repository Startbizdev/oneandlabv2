/**
 * Composable réutilisable pour l'assignation lab/sous-compte + préleveur sur un RDV prise de sang.
 * Gère le chargement des options (sous-comptes, préleveurs), la synchro avec le RDV et l'appel API de réassignation.
 *
 * Contrat backend (aligné avec l’API) :
 * - GET /lab/preleveurs : { success, data: Array<{ id, first_name, last_name, email, lab_id, stats?, ... }> }
 *   Chaque préleveur a lab_id (id du lab ou du sous-compte auquel il est rattaché).
 * - POST /appointments/:id/reassign : body { assigned_lab_id: string, assigned_to: string|null }
 *   assigned_to = id du préleveur (doit avoir profiles.lab_id = assigned_lab_id).
 */

import { apiFetch } from '~/utils/api'

/** Valeur sentinelle pour "Aucun préleveur" (Combobox n'accepte pas value vide). */
export const PRELEVEUR_NONE_VALUE = '__aucun__'

export interface LabAssignmentOption {
  value: string
  label: string
}

function parseListResponse(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray((res as any)?.items)) return (res as any).items
  if (Array.isArray((res as any)?.result)) return (res as any).result
  return []
}

function parsePreleveursResponse(res: any): any[] {
  if (!res) return []
  if (res?.success === true && Array.isArray(res?.data)) return res.data
  if (res?.success === true && res?.data && typeof res.data === 'object' && Array.isArray((res.data as any).data)) {
    return (res.data as any).data
  }
  return parseListResponse(res)
}

export function useLabAssignment() {
  const { user } = useAuth()
  const toast = useAppToast()

  const subaccounts = ref<any[]>([])
  const preleveurs = ref<any[]>([])
  const optionsLoading = ref(false)
  const selectedLabId = ref<string>('')
  const selectedPreleveurId = ref<string>(PRELEVEUR_NONE_VALUE)
  const reassigning = ref(false)

  const isLab = computed(() => user.value?.role === 'lab')
  const myId = computed(() => user.value?.id ?? user.value?.user_id ?? '')
  const parentLabId = computed(() => (user.value?.role === 'subaccount' ? (user.value?.lab_id ?? '') : ''))

  const labSelectItems = computed<LabAssignmentOption[]>(() => {
    const items: LabAssignmentOption[] = []
    if (isLab.value) {
      if (myId.value) {
        items.push({ value: String(myId.value), label: 'Laboratoire (moi)' })
      }
      for (const s of subaccounts.value) {
        const id = s?.id ?? s?.user_id ?? ''
        if (!id) continue
        const name =
          (s.company_name && String(s.company_name).trim()) ||
          [s.first_name, s.last_name].filter(Boolean).join(' ').trim() ||
          s.email ||
          id
        items.push({ value: String(id), label: `Sous-compte : ${name}` })
      }
    } else {
      if (parentLabId.value) {
        items.push({ value: String(parentLabId.value), label: 'Laboratoire (compte principal)' })
      }
      if (myId.value) {
        items.push({ value: String(myId.value), label: 'Sous-compte (moi)' })
      }
    }
    const ids = new Set(items.map((i) => i.value))
    if (selectedLabId.value && !ids.has(selectedLabId.value)) {
      items.unshift({
        value: selectedLabId.value,
        label: selectedLabId.value === myId.value ? 'Laboratoire (moi)' : selectedLabId.value === parentLabId.value ? 'Laboratoire (compte principal)' : 'Laboratoire',
      })
    }
    return items
  })

  const preleveurSelectItems = computed<LabAssignmentOption[]>(() => {
    const items: LabAssignmentOption[] = [{ value: PRELEVEUR_NONE_VALUE, label: 'Aucun' }]
    const labId = String(selectedLabId.value || myId.value || '')
    for (const p of preleveurs.value) {
      const id = p?.id ?? p?.user_id ?? ''
      if (!id) continue
      const preleveurLabId = String(p?.lab_id ?? '')
      if (labId && preleveurLabId !== labId) continue
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || id
      items.push({ value: String(id), label: name })
    }
    return items
  })

  /** True si les valeurs sélectionnées diffèrent du RDV courant (assigned_lab_id, assigned_to). */
  function hasChange(currentAppointment: any): boolean {
    if (!currentAppointment) return false
    const currentLab = currentAppointment.assigned_lab_id || myId.value
    const currentPreleveur = currentAppointment.assigned_to || ''
    const sel = selectedPreleveurId.value === PRELEVEUR_NONE_VALUE ? '' : (selectedPreleveurId.value || '')
    return (
      selectedLabId.value !== currentLab ||
      sel !== currentPreleveur
    )
  }

  /** Met à jour les sélections à partir du RDV (assigned_lab_id, assigned_to). */
  function syncFromAppointment(appointment: any) {
    if (!appointment || appointment.type !== 'blood_test') return
    if (!['pending', 'confirmed', 'inProgress'].includes(appointment.status)) return
    selectedLabId.value = appointment.assigned_lab_id || myId.value || ''
    const ato = appointment.assigned_to ?? ''
    selectedPreleveurId.value = ato ? String(ato) : PRELEVEUR_NONE_VALUE
  }

  /** Charge sous-comptes et préleveurs (à appeler au mount / quand le contexte le permet). */
  async function fetchOptions() {
    const role = user.value?.role
    if (role !== 'lab' && role !== 'subaccount') return

    optionsLoading.value = true
    try {
      if (isLab.value) {
        const [subRes, prelRes] = await Promise.all([
          apiFetch('/lab/subaccounts', { method: 'GET' }).catch(() => ({ success: false, data: [] })),
          apiFetch('/lab/preleveurs', { method: 'GET' }).catch(() => ({ success: false, data: [] })),
        ])
        subaccounts.value = parseListResponse(subRes)
        preleveurs.value = parsePreleveursResponse(prelRes)
      } else {
        const prelRes = await apiFetch('/lab/preleveurs', { method: 'GET' }).catch(() => ({ success: false, data: [] }))
        preleveurs.value = parsePreleveursResponse(prelRes)
      }
    } finally {
      optionsLoading.value = false
    }
  }

  /** Envoie la réassignation au backend et appelle onReassigned en cas de succès. Si le backend renvoie data, on le passe pour mise à jour instantanée (pas de refetch). */
  async function apply(
    appointmentId: string,
    onReassigned: (updated?: { assigned_lab_id?: string; assigned_to?: string | null; assigned_nurse_id?: string | null }) => void | Promise<void>
  ): Promise<void> {
    const labId = selectedLabId.value || myId.value
    if (!labId) {
      toast.add({ title: 'Erreur', description: 'Veuillez sélectionner un laboratoire.', color: 'error' })
      return
    }

    reassigning.value = true
    try {
      const preleveurId = selectedPreleveurId.value && selectedPreleveurId.value !== PRELEVEUR_NONE_VALUE ? String(selectedPreleveurId.value) : null
      const res = await apiFetch<{ success?: boolean; data?: { assigned_lab_id?: string; assigned_to?: string | null; assigned_nurse_id?: string | null }; error?: string }>(`/appointments/${appointmentId}/reassign`, {
        method: 'POST',
        body: {
          assigned_lab_id: String(labId),
          assigned_to: preleveurId,
        },
      })
      if (res?.success) {
        reassigning.value = false
        toast.add({ title: 'Assignation mise à jour', color: 'green' })
        await onReassigned(res?.data)
      } else {
        toast.add({
          title: 'Erreur',
          description: (res as any)?.error || 'Impossible de réassigner',
          color: 'error',
        })
      }
    } catch (err: any) {
      toast.add({
        title: 'Erreur',
        description: err?.message || 'Une erreur est survenue',
        color: 'error',
      })
    } finally {
      reassigning.value = false
    }
  }

  // Quand on change de lab, réinitialiser le préleveur s'il n'appartient pas au nouveau lab (backend: chaque préleveur a lab_id)
  watch(selectedLabId, (newLabId, oldLabId) => {
    if (!newLabId || String(newLabId) === String(oldLabId)) return
    const pid = selectedPreleveurId.value
    if (!pid || pid === PRELEVEUR_NONE_VALUE) return
    const p = preleveurs.value.find((x) => String(x?.id ?? x?.user_id ?? '') === String(pid))
    const preleveurLabId = String(p?.lab_id ?? '')
    if (preleveurLabId !== String(newLabId)) selectedPreleveurId.value = PRELEVEUR_NONE_VALUE
  })

  return {
    optionsLoading,
    reassigning,
    selectedLabId,
    selectedPreleveurId,
    labSelectItems,
    preleveurSelectItems,
    hasChange,
    syncFromAppointment,
    fetchOptions,
    apply,
    myId,
    isLab,
  }
}
