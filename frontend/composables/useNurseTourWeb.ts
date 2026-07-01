<script setup lang="ts">
import { apiFetch, apiFetchBlob } from '~/utils/api';
import { buildNavigationUrl } from '@oneandlab/shared-utils';

export type TourVisitStatus = 'todo' | 'en_route' | 'on_site' | 'done' | 'skipped';
export type TourSortMode = 'smart' | 'schedule' | 'nearest' | 'manual';

export interface NurseTourStop {
  stop_id: string;
  appointment_id: string;
  position: number;
  visit_status: TourVisitStatus;
  patient_name: string;
  patient_id?: string | null;
  patient_gender?: string | null;
  profile_image_url?: string | null;
  type?: string;
  category_id?: string | null;
  category_name: string;
  category_icon?: string | null;
  category_image_url?: string | null;
  creation_batch_id?: string | null;
  batch_sibling_count?: number;
  care_options?: Record<string, string | number> | null;
  nursing_items?: Array<Record<string, unknown>>;
  nursing_items_display?: Array<Record<string, unknown>>;
  status: string;
  scheduled_at?: string | null;
  availability?: unknown;
  address_line: string;
  address_complement?: string;
  lat?: number | null;
  lng?: number | null;
  distance_km_from_prev: number;
  drive_min_from_prev: number;
  phone?: string;
}

export interface NurseTourPayload {
  date: string;
  plan: {
    id: string;
    sort_mode: TourSortMode;
    manual_order_locked: boolean;
    nav_app_pref: string;
  };
  summary: {
    total_stops: number;
    done_stops: number;
    estimated_km: number;
  };
  stops: NurseTourStop[];
  next_stop_id?: string | null;
}

function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useNurseTourWeb() {
  const selectedDate = ref(formatDateYmd(new Date()));
  const loading = ref(false);
  const saving = ref(false);
  const tour = ref<NurseTourPayload | null>(null);
  const dayCounts = ref<Record<string, number>>({});
  const dragIndex = ref<number | null>(null);
  const toast = useToast();

  const sortModes: { value: TourSortMode; label: string }[] = [
    { value: 'smart', label: 'Intelligent' },
    { value: 'schedule', label: 'Créneaux' },
    { value: 'nearest', label: 'Proximité' },
    { value: 'manual', label: 'Manuel' },
  ];

  async function loadSummary() {
    const base = new Date(selectedDate.value + 'T12:00:00');
    const from = new Date(base);
    from.setDate(from.getDate() - 3);
    const to = new Date(base);
    to.setDate(to.getDate() + 7);
    const qs = new URLSearchParams({
      from: formatDateYmd(from),
      to: formatDateYmd(to),
    });
    const res = await apiFetch(`/nurse/tour/summary?${qs}`);
    if (res?.success && res.data?.counts) {
      dayCounts.value = res.data.counts;
    }
  }

  async function loadTour() {
    loading.value = true;
    try {
      const qs = new URLSearchParams({ date: selectedDate.value });
      const res = await apiFetch(`/nurse/tour?${qs}`);
      if (res?.success && res.data) {
        tour.value = res.data as NurseTourPayload;
      } else {
        tour.value = null;
      }
    } catch {
      tour.value = null;
      toast.add({ title: 'Tournée indisponible', color: 'error' });
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    await Promise.all([loadTour(), loadSummary()]);
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDate.value + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    selectedDate.value = formatDateYmd(d);
  }

  const dayStrip = computed(() => {
    const base = new Date(selectedDate.value + 'T12:00:00');
    const items: { date: string; label: string; isToday: boolean; count: number }[] = [];
    for (let i = -1; i <= 2; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const date = formatDateYmd(d);
      const today = formatDateYmd(new Date());
      let label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      if (date === today) label = "Aujourd'hui";
      items.push({
        date,
        label,
        isToday: date === today,
        count: dayCounts.value[date] ?? 0,
      });
    }
    return items;
  });

  async function persistOrder(ids: string[]) {
    saving.value = true;
    try {
      const res = await apiFetch('/nurse/tour/order', {
        method: 'PATCH',
        body: { date: selectedDate.value, appointment_ids: ids },
      });
      if (res?.success && res.data) {
        tour.value = res.data as NurseTourPayload;
        toast.add({ title: 'Ordre enregistré', color: 'success' });
      }
    } catch {
      toast.add({ title: 'Enregistrement impossible', color: 'error' });
    } finally {
      saving.value = false;
    }
  }

  async function moveStop(index: number, dir: -1 | 1) {
    if (!tour.value) return;
    const swap = index + dir;
    if (swap < 0 || swap >= tour.value.stops.length) return;
    const ids = tour.value.stops.map((s) => s.appointment_id);
    [ids[index], ids[swap]] = [ids[swap]!, ids[index]!];
    await persistOrder(ids);
  }

  function onDragStart(index: number) {
    dragIndex.value = index;
  }

  async function onDrop(targetIndex: number) {
    if (dragIndex.value === null || !tour.value || dragIndex.value === targetIndex) {
      dragIndex.value = null;
      return;
    }
    const ids = tour.value.stops.map((s) => s.appointment_id);
    const [moved] = ids.splice(dragIndex.value, 1);
    ids.splice(targetIndex, 0, moved!);
    dragIndex.value = null;
    await persistOrder(ids);
  }

  async function applySortMode(mode: TourSortMode) {
    if (!tour.value) return;
    if (tour.value.plan.manual_order_locked && mode !== 'manual') {
      const ok = window.confirm('Remplacer votre ordre manuel par un tri automatique ?');
      if (!ok) return;
    }
    saving.value = true;
    try {
      const res = await apiFetch('/nurse/tour/optimize', {
        method: 'POST',
        body: {
          date: selectedDate.value,
          mode,
          force: tour.value.plan.manual_order_locked,
        },
      });
      if (res?.success && res.data) {
        tour.value = res.data as NurseTourPayload;
      } else if (res?.code === 'manual_order_locked') {
        toast.add({ title: 'Ordre manuel verrouillé — confirmez pour remplacer', color: 'warning' });
      }
    } catch {
      toast.add({ title: 'Tri impossible', color: 'error' });
    } finally {
      saving.value = false;
    }
  }

  async function resetOrder() {
    saving.value = true;
    try {
      const res = await apiFetch('/nurse/tour/reset-order', {
        method: 'POST',
        body: { date: selectedDate.value },
      });
      if (res?.success && res.data) tour.value = res.data as NurseTourPayload;
    } finally {
      saving.value = false;
    }
  }

  async function markDone(stopId: string) {
    const res = await apiFetch(`/nurse/tour/stops/${stopId}/status`, {
      method: 'POST',
      body: { status: 'done' },
    });
    if (res?.success && res.data) tour.value = res.data as NurseTourPayload;
  }

  async function rescheduleStop(
    stopId: string,
    payload: { scheduled_at: string; availability: string },
  ) {
    saving.value = true;
    try {
      const res = await apiFetch(`/nurse/tour/stops/${stopId}/reschedule`, {
        method: 'PATCH',
        body: payload,
      });
      if (res?.success && res.data) {
        tour.value = res.data as NurseTourPayload;
        toast.add({ title: 'Créneau mis à jour — patient prévenu', color: 'success' });
      }
    } catch {
      toast.add({ title: 'Déplacement impossible', color: 'error' });
    } finally {
      saving.value = false;
    }
  }

  function callPatient(phone?: string) {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }

  function openNav(stop: NurseTourStop) {
    const url = buildNavigationUrl('waze', {
      lat: stop.lat ?? undefined,
      lng: stop.lng ?? undefined,
      addressLine: stop.address_line,
    });
    if (url) window.open(url, '_blank', 'noopener');
  }

  async function downloadIcs() {
    try {
      const qs = new URLSearchParams({ date: selectedDate.value });
      const { blob, filenameHint } = await apiFetchBlob(`/nurse/tour/calendar.ics?${qs}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameHint ?? `tournee-${selectedDate.value}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.add({ title: 'Export ICS impossible', color: 'error' });
    }
  }

  const mapMarkers = computed(() =>
    (tour.value?.stops ?? [])
      .filter((s) => s.lat != null && s.lng != null)
      .map((s, i) => ({
        lat: Number(s.lat),
        lng: Number(s.lng),
        popup: `${i + 1}. ${s.patient_name}`,
      })),
  );

  watch(selectedDate, () => void refresh(), { immediate: true });

  // Prefetch jour adjacent pour navigation rapide du strip
  watch(selectedDate, (d) => {
    const base = new Date(d + 'T12:00:00');
    for (const delta of [-1, 1]) {
      const adj = new Date(base);
      adj.setDate(adj.getDate() + delta);
      const adjDate = formatDateYmd(adj);
      void apiFetch(`/nurse/tour?date=${adjDate}`).catch(() => {});
    }
  });

  return {
    selectedDate,
    loading,
    saving,
    tour,
    dayStrip,
    sortModes,
    mapMarkers,
    shiftDay,
    moveStop,
    onDragStart,
    onDrop,
    applySortMode,
    resetOrder,
    markDone,
    rescheduleStop,
    callPatient,
    openNav,
    downloadIcs,
    refresh,
  };
}
