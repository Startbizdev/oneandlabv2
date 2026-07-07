import { apiFetch } from '~/utils/api';
import {
  computeTourSummaryFromStops,
  resolveTourNextStopId,
} from '@oneandlab/shared-utils';

export type TourSortMode = 'smart' | 'schedule' | 'nearest' | 'manual';

export interface PreleveurTourStop {
  stop_id: string;
  appointment_id: string;
  position: number;
  visit_status: string;
  patient_name: string;
  status: string;
  scheduled_at?: string | null;
  availability?: unknown;
  address_line: string;
  lat?: number | null;
  lng?: number | null;
  distance_km_from_prev: number;
  drive_min_from_prev: number;
  phone?: string;
}

export interface PreleveurTourPayload {
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
  stops: PreleveurTourStop[];
  next_stop_id?: string | null;
}

function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function withDerivedTourSummary(data: PreleveurTourPayload): PreleveurTourPayload {
  const summary = computeTourSummaryFromStops(data.stops, data.summary.estimated_km);
  return {
    ...data,
    summary,
    next_stop_id: resolveTourNextStopId(data.stops),
  };
}

export function usePreleveurTourWeb() {
  const selectedDate = ref(formatDateYmd(new Date()));
  const loading = ref(false);
  const saving = ref(false);
  const locating = ref(false);
  const tour = ref<PreleveurTourPayload | null>(null);
  const coords = ref<{ lat: number; lng: number } | null>(null);
  const toast = useToast();

  const sortModes: { value: TourSortMode; label: string }[] = [
    { value: 'smart', label: 'Intelligent' },
    { value: 'schedule', label: 'Créneaux' },
    { value: 'nearest', label: 'Proximité' },
    { value: 'manual', label: 'Manuel' },
  ];

  async function refreshLocation() {
    if (!navigator.geolocation) return;
    locating.value = true;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 60_000,
        });
      });
      coords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      toast.add({ title: 'GPS indisponible', color: 'warning' });
    } finally {
      locating.value = false;
    }
  }

  async function loadTour() {
    loading.value = true;
    try {
      const qs = new URLSearchParams({ date: selectedDate.value });
      if (coords.value) {
        qs.set('lat', String(coords.value.lat));
        qs.set('lng', String(coords.value.lng));
      }
      const res = await apiFetch(`/preleveur/tour?${qs}`);
      if (res?.success && res.data) {
        tour.value = withDerivedTourSummary(res.data as PreleveurTourPayload);
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

  async function refreshWithLocation() {
    await refreshLocation();
    await loadTour();
    if (coords.value) {
      toast.add({ title: 'Position actualisée — ordre recalculé', color: 'success' });
    }
  }

  async function refresh() {
    await loadTour();
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDate.value + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    selectedDate.value = formatDateYmd(d);
  }

  async function persistOrder(ids: string[]) {
    saving.value = true;
    try {
      const res = await apiFetch('/preleveur/tour/order', {
        method: 'PATCH',
        body: { date: selectedDate.value, appointment_ids: ids },
      });
      if (res?.success && res.data) {
        tour.value = withDerivedTourSummary(res.data as PreleveurTourPayload);
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

  async function applySortMode(mode: TourSortMode) {
    if (!tour.value) return;
    if (tour.value.plan.manual_order_locked && mode !== 'manual') {
      const ok = window.confirm('Remplacer votre ordre manuel par un tri automatique ?');
      if (!ok) return;
    }
    saving.value = true;
    try {
      const body: Record<string, unknown> = {
        date: selectedDate.value,
        mode,
        force: tour.value.plan.manual_order_locked,
      };
      if (coords.value) {
        body.lat = coords.value.lat;
        body.lng = coords.value.lng;
      }
      const res = await apiFetch('/preleveur/tour/optimize', {
        method: 'POST',
        body,
      });
      if (res?.success && res.data) {
        tour.value = withDerivedTourSummary(res.data as PreleveurTourPayload);
      } else if (res?.code === 'manual_order_locked') {
        toast.add({ title: 'Ordre manuel verrouillé', color: 'warning' });
      }
    } catch {
      toast.add({ title: 'Tri impossible', color: 'error' });
    } finally {
      saving.value = false;
    }
  }

  const sortModeLabel = computed(() => {
    const mode = tour.value?.plan.sort_mode ?? 'smart';
    return sortModes.find((m) => m.value === mode)?.label ?? mode;
  });

  const showManualReorder = computed(
    () => tour.value?.plan.sort_mode === 'manual' || tour.value?.plan.manual_order_locked,
  );

  watch(selectedDate, () => {
    void loadTour();
  });

  return {
    selectedDate,
    loading,
    saving,
    locating,
    tour,
    sortModes,
    sortModeLabel,
    showManualReorder,
    shiftDay,
    loadTour,
    refresh,
    refreshWithLocation,
    moveStop,
    applySortMode,
  };
}
