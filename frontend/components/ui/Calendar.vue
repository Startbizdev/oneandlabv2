<template>
  <div class="flex flex-col h-full bg-default rounded-xl overflow-hidden shadow-sm border border-default">
    <!-- Header: Navigation & Actions -->
    <header class="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 border-b border-default bg-default/95 sticky top-0 z-20">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        
        <!-- Navigation Date -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <div class="flex items-center bg-muted/50 rounded-lg p-0.5 sm:p-1 border border-default">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-chevron-left"
              class="rounded-md hover:bg-background"
              aria-label="Précédent"
              @click="navigate(-1)"
            />
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              class="text-sm font-medium px-3 rounded-md hover:bg-background"
              @click="goToToday"
            >
              Aujourd'hui
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-chevron-right"
              class="rounded-md hover:bg-background"
              aria-label="Suivant"
              @click="navigate(1)"
            />
          </div>
          <h2 class="text-base sm:text-xl font-normal text-foreground capitalize tracking-tight flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <span class="truncate">{{ currentLabel }}</span>
          </h2>
        </div>

        <!-- View Switcher & Actions -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div class="flex bg-muted/50 p-1 rounded-lg border border-default">
            <button
              v-for="v in views"
              :key="v.id"
              class="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200"
              :class="currentView === v.id ? 'bg-default text-foreground shadow-sm ring-1 ring-default' : 'text-muted-foreground hover:text-foreground'"
              @click="currentView = v.id"
            >
              {{ v.label }}
            </button>
          </div>
          <UButton
            v-if="!disableAdd"
            icon="i-lucide-plus"
            size="sm"
            color="primary"
            class="rounded-lg shadow-sm shadow-primary/20"
            @click="$emit('add-event')"
          >
            Nouveau
          </UButton>
        </div>
      </div>
    </header>

    <!-- Légende des statuts (badges) -->
    <div class="px-3 sm:px-4 py-2 border-b border-default bg-muted/20 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <span class="text-muted-foreground font-medium shrink-0">Statuts :</span>
      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <UBadge
          v-for="s in statusLegend"
          :key="s.value"
          :color="getStatusBadgeColor(s.value)"
          variant="soft"
          size="xs"
        >
          {{ s.label }}
        </UBadge>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden relative min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-muted/5">
      
      <!-- MONTH VIEW -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-200 ease-in absolute inset-0"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-105"
      >
        <div v-if="currentView === 'month'" class="h-full flex flex-col">
          <!-- Mobile : mini calendrier (UI/UX moderne) -->
          <div class="md:hidden flex-shrink-0 rounded-xl border border-default bg-default shadow-sm overflow-hidden mx-2 mt-2 mb-1">
            <div class="grid grid-cols-7 bg-muted/30 border-b border-default">
              <div
                v-for="d in weekDays"
                :key="d"
                class="py-2 text-center text-[10px] font-normal uppercase tracking-wider text-muted-foreground"
              >
                {{ d }}
              </div>
            </div>
            <div class="grid grid-cols-7 grid-rows-6 p-1.5 gap-0.5">
              <button
                v-for="day in calendarDays"
                :key="day.dateStr"
                type="button"
                class="min-h-[40px] flex flex-col items-center justify-center rounded-lg transition-all duration-200 touch-manipulation"
                :class="[
                  !day.isCurrentMonth && 'opacity-40',
                  day.isToday && !selectedDayId && 'bg-primary/15 ring-1 ring-primary/30',
                  selectedDayId === day.dateStr && 'bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2 ring-offset-default',
                  selectedDayId !== day.dateStr && day.isCurrentMonth && !day.isToday && 'hover:bg-muted/50 active:bg-muted'
                ]"
                @click="handleDayClick(day)"
              >
                <span
                  class="text-sm font-normal tabular-nums w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                  :class="[
                    day.isToday && selectedDayId !== day.dateStr && 'bg-primary text-white',
                    selectedDayId === day.dateStr && 'bg-white/20',
                    selectedDayId !== day.dateStr && !day.isToday && 'text-foreground'
                  ]"
                >
                  {{ day.dayNumber }}
                </span>
                <span
                  v-if="day.items.length > 0 && selectedDayId !== day.dateStr"
                  class="flex gap-0.5 mt-0.5"
                  aria-hidden
                >
                  <span
                    v-for="n in Math.min(day.items.length, 3)"
                    :key="n"
                    class="w-1 h-1 rounded-full bg-current opacity-60"
                  />
                </span>
              </button>
            </div>
            <div class="flex items-center justify-between gap-2 px-3 py-2 border-t border-default bg-muted/20">
              <span class="text-xs font-medium text-foreground truncate capitalize">{{ currentLabel }}</span>
              <button
                v-if="selectedDayId"
                type="button"
                class="text-xs font-medium text-primary shrink-0 py-1 px-2 rounded-md hover:bg-primary/10 active:bg-primary/20 transition-colors"
                @click.stop="$emit('day-click', { fullDate: null })"
              >
                Voir tout le mois
              </button>
            </div>
          </div>

          <!-- Mobile : liste des RDV (filtrée par jour sélectionné) -->
          <div class="md:hidden flex-1 overflow-y-auto min-h-0 border-t border-default/50 bg-muted/5">
            <div class="p-3 space-y-4">
              <template v-if="Object.keys(mobileListGroups).length === 0">
                <div class="flex flex-col items-center justify-center py-8 text-center">
                  <UIcon name="i-lucide-calendar-x" class="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p class="text-sm text-muted-foreground">
                    {{ selectedDayId ? 'Aucun rendez-vous ce jour-là' : 'Aucun rendez-vous ce mois-ci' }}
                  </p>
                  <p v-if="selectedDayId" class="text-xs text-muted-foreground mt-1">Choisissez un autre jour ou « Voir tout le mois »</p>
                </div>
              </template>
              <template v-else>
                <div v-for="(group, dateStr) in mobileListGroups" :key="dateStr" class="space-y-2">
                  <h3 class="text-xs font-normal text-foreground uppercase tracking-wider sticky top-0 bg-default/95 backdrop-blur py-2 z-10 border-b border-default/50">
                    {{ formatDateFull(dateStr) }}
                  </h3>
                  <div class="space-y-2">
                    <button
                      v-for="item in group"
                      :key="item[itemIdKey]"
                      type="button"
                      class="w-full flex items-start gap-3 p-3.5 rounded-xl border border-default bg-default shadow-sm hover:shadow hover:border-primary/20 active:scale-[0.99] text-left transition-all"
                      @click="$emit('item-click', item)"
                    >
                      <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <UIcon :name="getTypeIcon(item)" class="w-5 h-5 text-primary" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <span class="font-normal text-foreground block truncate">{{ getPatientLabel(item) }}</span>
                        <span class="text-xs text-muted-foreground block mt-0.5">{{ getCreneauLabel(item) }} · {{ item.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}</span>
                        <p v-if="getItemAddress(item)" class="text-xs text-muted-foreground mt-1.5 truncate flex items-center gap-1" :title="getItemAddress(item)">
                          <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0" />
                          {{ getItemAddress(item) }}
                        </p>
                      </div>
                      <UBadge :color="getStatusBadgeColor(item[itemStatusKey])" variant="soft" size="xs" class="shrink-0 mt-0.5" />
                      <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Desktop : en-tête jours + grille complète -->
          <div class="hidden md:flex flex-col flex-1 min-h-0">
            <div class="grid grid-cols-7 border-b border-default bg-muted/30">
              <div
                v-for="(day, i) in weekDays"
                :key="day"
                class="py-2 text-center text-[10px] sm:text-xs font-normal uppercase tracking-wider text-muted-foreground"
              >
                {{ day }}
              </div>
            </div>

            <!-- Calendar Grid (desktop) -->
            <div class="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
            <div
              v-for="(day, index) in calendarDays"
              :key="day.dateStr"
              class="group relative border-b border-r border-default/50 bg-default p-1 sm:p-2 transition-colors hover:bg-muted/30 flex flex-col gap-1 min-h-[80px] sm:min-h-[100px] md:min-h-[110px]"
              :class="[
                !day.isCurrentMonth && 'bg-muted/5 text-muted-foreground/60',
                day.isToday && 'bg-primary/10 ring-1 ring-inset ring-primary/20'
              ]"
              @click="handleDayClick(day)"
              @dragover.prevent
              @drop="onDrop($event, day)"
            >
              <!-- Date Number -->
              <div class="flex justify-between items-start">
                <span
                  class="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm font-normal rounded-full transition-all"
                  :class="[
                    day.isToday 
                      ? 'bg-primary text-white shadow-md shadow-primary/25 scale-110' 
                      : 'text-foreground/80 group-hover:text-foreground group-hover:bg-muted',
                    selectedDayId === day.dateStr && !day.isToday && 'ring-2 ring-primary/50 bg-primary/10'
                  ]"
                >
                  {{ day.dayNumber }}
                </span>
                
                <!-- Quick Add Button (Desktop only, masqué si disableAdd) -->
                <button
                  v-if="!disableAdd"
                  class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-primary"
                  title="Ajouter un événement"
                  @click.stop="$emit('add-event', day.fullDate)"
                >
                  <UIcon name="i-lucide-plus" class="w-3 h-3" />
                </button>
              </div>

              <!-- Events : badges RDV modernes (cartes compactes) -->
              <div class="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar min-h-0">
                <button
                  v-for="item in day.items.slice(0, 4)"
                  :key="item[itemIdKey]"
                  type="button"
                  class="w-full text-left rounded-xl border border-default/60 bg-default/80 hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset focus:border-primary/40 shadow-sm hover:shadow"
                  @click.stop="$emit('item-click', item)"
                  @dragstart="onDragStart($event, item)"
                  draggable="true"
                >
                  <UBadge
                    :color="getStatusBadgeColor(item[itemStatusKey])"
                    variant="soft"
                    size="sm"
                    :leading-icon="getTypeIcon(item)"
                    class="w-full justify-start text-xs font-medium truncate py-2 px-2.5 gap-2 rounded-lg border-0"
                  >
                    <span class="tabular-nums shrink-0 text-foreground">{{ getCreneauLabel(item) }}</span>
                    <span class="truncate text-foreground">
                      <slot name="item" :item="item">
                        {{ getPatientLabel(item) }}
                      </slot>
                    </span>
                  </UBadge>
                </button>
                <button
                  v-if="day.items.length > 4"
                  type="button"
                  class="text-[10px] sm:text-xs text-muted-foreground hover:text-primary font-medium text-left px-1 mt-auto focus:outline-none py-0.5"
                  @click.stop="$emit('day-click', day)"
                >
                  +{{ day.items.length - 4 }} de plus
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- LIST VIEW : desktop uniquement (sur mobile on garde la liste sous le mini calendrier) -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in absolute inset-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div v-if="currentView === 'list'" class="h-full overflow-hidden flex flex-col">
          <!-- Mobile : même liste que sous le mini (avec adresse/info), une seule liste -->
          <div class="md:hidden flex-1 overflow-y-auto min-h-0 p-3 bg-muted/5">
            <template v-if="Object.keys(groupedItems).length === 0">
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <UIcon name="i-lucide-calendar-x" class="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p class="text-sm text-muted-foreground">Aucun rendez-vous ce mois-ci</p>
              </div>
            </template>
            <div v-else class="space-y-4">
              <div v-for="(group, dateStr) in groupedItems" :key="dateStr" class="space-y-2">
                <h3 class="text-xs font-normal text-foreground uppercase tracking-wider sticky top-0 bg-default/95 backdrop-blur py-2 z-10 border-b border-default/50">
                  {{ formatDateFull(dateStr) }}
                </h3>
                <div class="space-y-2">
                  <button
                    v-for="item in group"
                    :key="item[itemIdKey]"
                    type="button"
                    class="w-full flex items-start gap-3 p-3.5 rounded-xl border border-default bg-default shadow-sm hover:shadow hover:border-primary/20 active:scale-[0.99] text-left transition-all"
                    @click="$emit('item-click', item)"
                  >
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <UIcon :name="getTypeIcon(item)" class="w-5 h-5 text-primary" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <span class="font-normal text-foreground block truncate">{{ getPatientLabel(item) }}</span>
                      <span class="text-xs text-muted-foreground block mt-0.5">{{ getCreneauLabel(item) }} · {{ item.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}</span>
                      <p v-if="getItemAddress(item)" class="text-xs text-muted-foreground mt-1.5 truncate flex items-center gap-1" :title="getItemAddress(item)">
                        <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0" />
                        {{ getItemAddress(item) }}
                      </p>
                    </div>
                    <UBadge :color="getStatusBadgeColor(item[itemStatusKey])" variant="soft" size="xs" class="shrink-0 mt-0.5" />
                    <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop : liste avec timeline -->
          <div class="hidden md:block h-full overflow-y-auto p-4 custom-scrollbar">
            <div v-if="allSortedItems.length === 0" class="flex flex-col items-center justify-center h-full text-muted-foreground">
              <UIcon name="i-lucide-calendar-x" class="w-12 h-12 mb-2 opacity-20" />
              <p>Aucun événement pour cette période</p>
            </div>
            <div v-else class="max-w-3xl mx-auto space-y-6">
              <div v-for="(group, dateStr) in groupedItems" :key="dateStr" class="relative pl-6 border-l-2 border-muted">
                <span class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                <h3 class="text-sm font-normal text-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                  {{ formatDateFull(dateStr) }}
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="item in group"
                    :key="item[itemIdKey]"
                    class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-default bg-default hover:bg-muted/30 hover:border-primary/20 transition-all cursor-pointer group shadow-sm"
                    @click="$emit('item-click', item)"
                  >
                    <div class="flex flex-col items-center min-w-[3rem] sm:min-w-[3.5rem] gap-1">
                      <UIcon :name="getTypeIcon(item)" class="w-4 h-4 text-muted-foreground shrink-0" />
                      <span class="text-xs font-normal text-foreground tabular-nums">{{ getCreneauLabel(item) }}</span>
                      <UBadge
                        :color="getStatusBadgeColor(item[itemStatusKey])"
                        variant="soft"
                        size="xs"
                      >
                        {{ getStatusLabel(item[itemStatusKey]) }}
                      </UBadge>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-normal text-foreground truncate">
                          {{ getPatientLabel(item) }}
                        </span>
                      </div>
                      <p class="text-sm text-muted-foreground truncate">
                        {{ item.address || 'Aucune adresse' }}
                      </p>
                    </div>
                    <UButton
                      icon="i-lucide-chevron-right"
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

// --- TYPES & PROPS ---
interface CalendarItem {
  id?: string | number;
  [key: string]: any;
}

interface Props {
  items?: CalendarItem[];
  itemDateKey?: string;
  itemIdKey?: string;
  itemStatusKey?: string;
  startDate?: Date;
  selectedDay?: Date | null;
  disableAdd?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  itemDateKey: 'scheduled_at',
  itemIdKey: 'id',
  itemStatusKey: 'status',
  startDate: () => new Date(),
  selectedDay: null,
  disableAdd: false,
});

const emit = defineEmits<{
  'update:date': [date: Date];
  'item-click': [item: any];
  'day-click': [day: any];
  'add-event': [date?: Date];
  'item-drop': [item: any, newDate: Date];
}>();

// --- STATE ---
const currentDate = ref(new Date(props.startDate));
const currentView = ref<'month' | 'list'>('month');
const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const views = [
  { id: 'month', label: 'Mois' },
  { id: 'list', label: 'Liste' }
];

// Légende des statuts pour les badges (ordre d'affichage)
const statusLegend = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'inProgress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'canceled', label: 'Annulé' },
  { value: 'expired', label: 'Expiré' },
  { value: 'refused', label: 'Refusé' },
];

// --- COMPUTED ---

const currentLabel = computed(() => {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate.value);
});

const selectedDayId = computed(() => props.selectedDay ? formatDateId(props.selectedDay) : null);

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  // First day of the month
  const firstDayOfMonth = new Date(year, month, 1);
  // Padding days (start from Monday)
  const dayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Mon, 6 = Sun
  
  const startDate = new Date(year, month, 1 - diff);
  const today = new Date();
  today.setHours(0,0,0,0);

  const days = [];
  // 6 weeks * 7 days = 42 cells
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = formatDateId(date);
    
    // Filter items for this day
    const dayItems = props.items.filter(item => {
      const itemDate = new Date(item[props.itemDateKey]);
      return formatDateId(itemDate) === dateStr;
    }).sort((a, b) => new Date(a[props.itemDateKey]).getTime() - new Date(b[props.itemDateKey]).getTime());

    days.push({
      dateStr,
      dayNumber: date.getDate(),
      fullDate: date,
      isCurrentMonth: date.getMonth() === month,
      isToday: formatDateId(date) === formatDateId(today),
      items: dayItems
    });
  }
  return days;
});

// For List View
const allSortedItems = computed(() => {
  const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
  const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0);
  
  return props.items.filter(item => {
    const d = new Date(item[props.itemDateKey]);
    return d >= start && d <= end;
  }).sort((a, b) => new Date(a[props.itemDateKey]).getTime() - new Date(b[props.itemDateKey]).getTime());
});

const groupedItems = computed(() => {
  const groups: Record<string, any[]> = {};
  allSortedItems.value.forEach(item => {
    const dateStr = formatDateId(new Date(item[props.itemDateKey]));
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  });
  return groups;
});

/** Sur mobile : si un jour est sélectionné, n'afficher que les RDV de ce jour ; sinon tout le mois */
const mobileListGroups = computed(() => {
  if (selectedDayId.value) {
    const id = selectedDayId.value;
    const items = groupedItems.value[id] || [];
    return items.length ? { [id]: items } : {};
  }
  return groupedItems.value;
});

// --- METHODS ---

function formatDateId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateFull(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dateStr));
}

function formatItemTime(item: any): string {
  const d = new Date(item[props.itemDateKey]);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Icône selon le type (aligné admin / cartes RDV)
function getTypeIcon(item: any): string {
  return item.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope';
}

// Créneau horaire ou "TLJ" (toute la journée) — même logique que AppointmentListPage / getCreneauHoraireLabel
function getCreneauLabel(item: any): string {
  const availability = item.form_data?.availability;
  if (availability != null) {
    try {
      let avail: any = availability;
      if (typeof availability === 'string') {
        const trimmed = availability.trim();
        if (trimmed) {
          avail = JSON.parse(trimmed);
          if (avail?.type === 'all_day') return 'TLJ';
        }
      } else if (typeof avail === 'object' && avail.type === 'all_day') {
        return 'TLJ';
      }
      if (avail?.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
        const start = Math.floor(Number(avail.range[0]));
        const end = Math.floor(Number(avail.range[1]));
        if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h - ${end}h`;
      }
    } catch {
      // ignore
    }
  }
  if (item.form_data?.availability_type === 'all_day') return 'TLJ';
  return formatItemTime(item);
}

// Nom du patient : patient_name ou form_data first_name + last_name (aligné CalendarPage)
function getPatientLabel(item: any): string {
  if (item.patient_name) return item.patient_name;
  const fn = item.form_data?.first_name ?? '';
  const ln = item.form_data?.last_name ?? '';
  const name = [fn, ln].filter(Boolean).join(' ').trim();
  return name || item.title || 'Patient';
}

// Adresse : item.address ou form_data (street, city, etc.)
function getItemAddress(item: any): string {
  if (item.address && String(item.address).trim()) return String(item.address).trim();
  const fd = item.form_data;
  if (!fd) return '';
  const parts = [fd.address, fd.street, fd.city, fd.postal_code, fd.city_zip].filter(Boolean);
  return parts.map(String).join(', ').trim() || '';
}

function navigate(dir: number) {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + dir);
  currentDate.value = d;
  emit('update:date', d);
}

function goToToday() {
  const now = new Date();
  currentDate.value = now;
  emit('update:date', now);
}

function handleDayClick(day: any) {
  emit('day-click', day);
}

// Drag & Drop Logic
function onDragStart(event: DragEvent, item: any) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(item));
  }
}

function onDrop(event: DragEvent, day: any) {
  const data = event.dataTransfer?.getData('application/json');
  if (data) {
    const item = JSON.parse(data);
    // Don't emit if same day
    const oldDateStr = formatDateId(new Date(item[props.itemDateKey]));
    if (oldDateStr !== day.dateStr) {
      emit('item-drop', item, day.fullDate);
    }
  }
}

// Couleurs UBadge Nuxt UI : error, primary, secondary, success, info, warning, neutral
function getStatusBadgeColor(status: string): 'warning' | 'info' | 'primary' | 'success' | 'error' | 'neutral' {
  const map: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'error' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    expired: 'neutral',
    refused: 'error',
  };
  return map[status] ?? 'neutral';
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return map[status] ?? status;
}

watch(() => props.startDate, (newVal) => {
  if (newVal) currentDate.value = new Date(newVal);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>