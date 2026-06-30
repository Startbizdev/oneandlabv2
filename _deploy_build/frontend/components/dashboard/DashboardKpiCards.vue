<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
    <div
      v-for="card in kpiCards"
      :key="card.id"
      class="rounded-xl border border-default/50 bg-default p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-medium text-muted">{{ card.label }}</p>
          <p class="text-2xl font-semibold tabular-nums mt-1 text-default" :class="card.colorClass">
            {{ loading ? '—' : card.value }}
          </p>
        </div>
        <div
          v-if="card.icon"
          class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          :class="card.iconBg"
        >
          <UIcon :name="card.icon" class="w-5 h-5" :class="card.iconColor" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  colorClass?: string;
}

interface Props {
  /** Total RDV */
  total: number;
  /** En attente */
  pending: number;
  /** Aujourd'hui */
  today: number;
  /** Terminés */
  completed: number;
  /** Ce mois (lab uniquement) */
  month?: number;
  /** Taux de complétion % (lab uniquement) */
  completionRate?: number;
  /** Durée moyenne en min (lab uniquement) */
  averageDuration?: number;
  /** Afficher les KPIs lab (mois, taux, durée) */
  isLab?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  month: 0,
  completionRate: 0,
  averageDuration: 0,
  isLab: false,
  loading: false,
});

const kpiCards = computed<KpiCard[]>(() => [
  {
    id: 'total',
    label: 'RDV total',
    value: props.total,
    icon: 'i-lucide-calendar-days',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 'pending',
    label: 'En attente',
    value: props.pending,
    icon: 'i-lucide-clock',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'today',
    label: "Aujourd'hui",
    value: props.today,
    icon: 'i-lucide-calendar-check',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    colorClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'completed',
    label: 'Terminés',
    value: props.completed,
    icon: 'i-lucide-check-circle',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ...(props.isLab
    ? [
        {
          id: 'month',
          label: 'Ce mois',
          value: props.month,
          icon: 'i-lucide-trending-up',
          iconBg: 'bg-violet-500/10',
          iconColor: 'text-violet-600 dark:text-violet-400',
        } as KpiCard,
        {
          id: 'completion',
          label: 'Taux complétion',
          value: `${props.completionRate}%`,
          icon: 'i-lucide-percent',
          iconBg: 'bg-slate-500/10',
          iconColor: 'text-slate-600 dark:text-slate-400',
        } as KpiCard,
      ]
    : []),
]);
</script>
