<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Tableau de bord"
      description="Vue d'ensemble de la plateforme OneAndLab — statistiques, derniers rendez-vous et activité en temps réel."
    >
      <template #actions>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser"
          @click="fetchDashboard"
        >
          Actualiser
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          icon="i-lucide-calendar"
          to="/admin/appointments"
        >
          Rendez-vous
        </UButton>
        <UButton
          variant="outline"
          size="sm"
          icon="i-lucide-calendar-days"
          to="/admin/calendar"
        >
          Calendrier
        </UButton>
      </template>
    </TitleDashboard>

    <UAlert v-if="error" color="error" variant="soft" :title="error" />

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl border border-gray-200 bg-white animate-pulse dark:border-gray-800 dark:bg-gray-900" />
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <!-- Contenu principal (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- 4 cartes statistiques (structure type Shadcn: header icon+value, content title+description) -->
          <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div
              v-for="card in statsCards"
              :key="card.title"
              class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              :class="{ 'cursor-pointer transition hover:border-primary/30 hover:shadow': card.to }"
              @click="card.to ? $router.push(card.to) : null"
            >
              <div class="flex items-center gap-4">
                <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <UIcon :name="card.icon" class="size-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ card.value }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <span class="font-semibold text-gray-900 dark:text-white">{{ card.title }}</span>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ card.description }}
                </p>
              </div>
            </div>
          </section>

          <!-- Historique des rendez-vous -->
          <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:px-5">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <UIcon name="i-lucide-calendar-clock" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                Historique des rendez-vous
              </h2>
              <UButton variant="ghost" size="xs" to="/admin/appointments">Voir tout</UButton>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-left text-sm">
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr
                    v-for="rdv in data.lastAppointments"
                    :key="rdv.id"
                    class="hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                  >
                    <td class="px-4 py-2.5 font-medium text-gray-900 dark:text-white md:px-5">
                      {{ getPatientName(rdv) }}
                    </td>
                    <td class="px-4 py-2.5 md:px-5">
                      <UBadge
                        v-if="rdv.type === 'blood_test'"
                        color="error"
                        variant="soft"
                        size="xs"
                        leading-icon="i-lucide-syringe"
                      >
                        Prise de sang
                      </UBadge>
                      <UBadge
                        v-else
                        color="info"
                        variant="soft"
                        size="xs"
                        leading-icon="i-lucide-stethoscope"
                      >
                        Soins infirmiers
                      </UBadge>
                    </td>
                    <td class="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 md:px-5">
                      {{ rdv.scheduled_at ? formatDateOnly(rdv.scheduled_at) : '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 md:px-5">
                      {{ getCreneauHoraire(rdv) }}
                    </td>
                    <td class="px-4 py-2.5 md:px-5">
                      <UBadge :color="getStatusColor(rdv.status)" variant="soft" size="xs">
                        {{ getStatusLabel(rdv.status) }}
                      </UBadge>
                    </td>
                    <td class="px-4 py-2.5 md:px-5">
                      <UButton size="xs" variant="ghost" icon="i-lucide-eye" :to="`/admin/appointments/${rdv.id}`" />
                    </td>
                  </tr>
                  <tr v-if="data.lastAppointments.length === 0">
                    <td colspan="6" class="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400 md:px-5">
                      Aucun rendez-vous récent.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Derniers inscrits -->
          <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:px-5">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <UIcon name="i-lucide-user-plus" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                Derniers inscrits
              </h2>
              <UButton variant="ghost" size="xs" to="/admin/users">Voir tout</UButton>
            </div>
            <div class="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 md:gap-4 md:p-5 lg:grid-cols-4">
              <NuxtLink
                v-for="u in data.lastUsers"
                :key="u.id"
                to="/admin/users"
                class="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 transition hover:border-primary/30 hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-primary/40 dark:hover:bg-gray-800/80"
              >
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {{ getUserInitials(u) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {{ [u.first_name, u.last_name].filter(Boolean).join(' ') || '—' }}
                    </div>
                    <div class="truncate text-xs text-gray-500 dark:text-gray-400">{{ u.email || '—' }}</div>
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-1">
                  <UBadge :color="getRoleBadgeColor(u.role)" variant="soft" size="xs">
                    {{ getRoleLabel(u.role) }}
                  </UBadge>
                  <span class="text-xs text-gray-400 dark:text-gray-500">{{ u.created_at ? formatDateShort(u.created_at) : '—' }}</span>
                </div>
              </NuxtLink>
              <div
                v-if="data.lastUsers.length === 0"
                class="col-span-2 py-8 text-center text-xs text-gray-500 dark:text-gray-400 md:col-span-3 lg:col-span-4"
              >
                Aucun utilisateur récent.
              </div>
            </div>
          </section>

          <!-- Temps réel -->
          <section class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:px-5">
                <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <UIcon name="i-lucide-activity" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Dernières activités
                </h2>
              </div>
              <div class="max-h-56 overflow-y-auto">
                <ul class="divide-y divide-gray-200 dark:divide-gray-800">
                  <li
                    v-for="log in (data.lastActivityLogs || [])"
                    :key="log.id"
                    class="px-4 py-2.5 md:px-5"
                  >
                    <div class="text-sm text-gray-700 dark:text-gray-300">{{ activitySummary(log) }}</div>
                    <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatDateShort(log.created_at) }}</div>
                  </li>
                  <li v-if="!(data.lastActivityLogs?.length)" class="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400 md:px-5">
                    Aucune activité récente.
                  </li>
                </ul>
              </div>
            </div>
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:px-5">
                <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <UIcon name="i-lucide-user-cog" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Mises à jour compte
                </h2>
              </div>
              <div class="max-h-56 overflow-y-auto">
                <ul class="divide-y divide-gray-200 dark:divide-gray-800">
                  <li
                    v-for="p in (data.lastProfileUpdates || [])"
                    :key="p.id"
                    class="flex items-center justify-between gap-2 px-4 py-2.5 md:px-5"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ profileUpdateName(p) }}
                      </p>
                      <div class="mt-0.5">
                        <UBadge :color="getRoleBadgeColor(p.role)" variant="soft" size="xs">{{ getRoleLabel(p.role) }}</UBadge>
                      </div>
                    </div>
                    <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ formatDateShort(p.updated_at) }}</span>
                  </li>
                  <li v-if="!(data.lastProfileUpdates?.length)" class="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400 md:px-5">
                    Aucune mise à jour récente.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <!-- Colonne de droite -->
        <div class="space-y-6 lg:sticky lg:top-6">
          <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-5">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <UIcon name="i-lucide-users" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Répartition comptes
            </h3>
            <div class="space-y-2">
              <div v-for="role in roleStats" :key="role.key" class="flex items-center justify-between text-xs">
                <span class="text-gray-600 dark:text-gray-400">{{ role.label }}</span>
                <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ data.usersByRole[role.key] ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
                <span class="text-xs font-semibold text-gray-900 dark:text-white">Total</span>
                <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ data.usersByRole.total }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-5">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <UIcon name="i-lucide-pie-chart" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Bilan historique RDV
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="item in bilanRdvItems"
                :key="item.key"
                class="flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <UIcon :name="item.icon" class="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.label }}</span>
                </div>
                <span class="text-xs font-semibold tabular-nums text-gray-900 dark:text-white shrink-0">
                  {{ data.appointmentsByStatus[item.key] ?? 0 }}
                </span>
              </div>
            </div>
            <div class="mt-2 flex items-center justify-between rounded-lg border-t border-gray-200 bg-gray-50/80 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-800/50">
              <span class="text-xs font-semibold text-gray-900 dark:text-white">Total</span>
              <span class="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">{{ data.appointmentsByStatus.total }}</span>
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-5">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <UIcon name="i-lucide-zap" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Accès rapide
            </h3>
            <div class="flex flex-col gap-0.5">
              <NuxtLink
                v-for="link in quickLinks"
                :key="link.to"
                :to="link.to"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <UIcon :name="link.icon" class="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const { data, loading, error, fetchDashboard } = useAdminDashboard();

const statsCards = computed(() => [
  {
    icon: 'i-lucide-calendar',
    value: String(data.value?.appointmentsByStatus.total ?? 0),
    title: 'Total RDV',
    description: 'Tous créés',
    to: null,
  },
  {
    icon: 'i-lucide-clock',
    value: String(data.value?.appointmentsByStatus.pending ?? 0),
    title: 'En attente',
    description: 'À confirmer',
    to: null,
  },
  {
    icon: 'i-lucide-circle-check',
    value: String(data.value?.appointmentsByStatus.completed ?? 0),
    title: 'Terminés',
    description: 'Réalisés',
    to: null,
  },
  {
    icon: 'i-lucide-user-plus',
    value: String(data.value?.registrationRequestsPending ?? 0),
    title: 'Inscriptions',
    description: 'À valider',
    to: '/admin/inscriptions',
  },
]);

const roleStats = [
  { key: 'patient', label: 'Patients' },
  { key: 'nurse', label: 'Infirmiers' },
  { key: 'lab', label: 'Laboratoires' },
  { key: 'subaccount', label: 'Sous-labos' },
  { key: 'preleveur', label: 'Préleveurs' },
  { key: 'pro', label: 'Pros santé' },
];

const bilanRdvItems = [
  { key: 'pending', label: 'En attente', icon: 'i-lucide-clock' },
  { key: 'confirmed', label: 'Confirmé', icon: 'i-lucide-check-circle' },
  { key: 'inProgress', label: 'En cours', icon: 'i-lucide-loader-circle' },
  { key: 'completed', label: 'Terminé', icon: 'i-lucide-circle-check' },
  { key: 'canceled', label: 'Annulé', icon: 'i-lucide-x-circle' },
  { key: 'refused', label: 'Refusé', icon: 'i-lucide-ban' },
];


const quickLinks = [
  { label: 'Inscriptions', to: '/admin/inscriptions', icon: 'i-lucide-user-plus' },
  { label: 'Utilisateurs', to: '/admin/users', icon: 'i-lucide-users' },
  { label: 'Catégories', to: '/admin/categories', icon: 'i-lucide-tags' },
  { label: 'Zones', to: '/admin/coverage', icon: 'i-lucide-map' },
  { label: 'Avis', to: '/admin/reviews', icon: 'i-lucide-star' },
  { label: 'Notifications', to: '/admin/notifications', icon: 'i-lucide-bell' },
  { label: 'Logs HDS', to: '/admin/logs', icon: 'i-lucide-file-text' },
];

function getPatientName(rdv: { form_data?: Record<string, unknown>; relative_first_name?: string; relative_last_name?: string }): string {
  const fd = rdv.form_data || {};
  const first = (fd.first_name as string) || rdv.relative_first_name || '';
  const last = (fd.last_name as string) || rdv.relative_last_name || '';
  return `${first} ${last}`.trim() || '—';
}

/** Initiales utilisateur (2 lettres) */
function getUserInitials(u: { first_name?: string; last_name?: string; email?: string }): string {
  const first = (u.first_name?.[0] ?? '').toUpperCase();
  const last = (u.last_name?.[0] ?? '').toUpperCase();
  if (first || last) return (first + last).slice(0, 2);
  if (u.email?.[0]) return u.email[0].toUpperCase();
  return '?';
}

/** Nom affiché pour une entrée "mise à jour compte" (first_name + last_name ou email) */
function profileUpdateName(p: { first_name?: string; last_name?: string; email?: string }): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (p.email) return p.email;
  return 'Compte';
}

function getCreneauHoraire(rdv: { form_data?: Record<string, unknown>; scheduled_at?: string }): string {
  const availability = (rdv.form_data as Record<string, unknown>)?.availability;
  if (availability != null) {
    try {
      const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
      if (avail?.type === 'all_day') return 'Toute la journée';
      if (avail?.type === 'custom' && Array.isArray(avail?.range) && avail.range.length >= 2) {
        const start = Math.floor(Number(avail.range[0]));
        const end = Math.floor(Number(avail.range[1]));
        if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h00 - ${end}h00`;
      }
    } catch {
      // ignore
    }
  }
  if (rdv.scheduled_at) {
    try {
      return new Date(rdv.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // ignore
    }
  }
  return 'Non précisé';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    refused: 'Refusé',
  };
  return labels[status] || status;
}

/** Couleurs Nuxt UI : primary, success, info, warning, error, neutral */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    refused: 'neutral',
  };
  return colors[status] || 'neutral';
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    patient: 'Patient',
    nurse: 'Infirmier',
    lab: 'Laboratoire',
    subaccount: 'Sous-labo',
    preleveur: 'Préleveur',
    pro: 'Pro santé',
    super_admin: 'Super admin',
  };
  return labels[role] || role;
}

/** Couleurs Nuxt UI : primary, success, info, warning, error, neutral */
function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    patient: 'info',
    nurse: 'success',
    lab: 'warning',
    subaccount: 'primary',
    preleveur: 'error',
    pro: 'primary',
    super_admin: 'neutral',
  };
  return colors[role] || 'neutral';
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    view: 'Consultation',
    delete: 'Suppression',
    decrypt: 'Déchiffrement',
    incident: 'Incident',
    reassign_appointment: 'Réaffectation RDV',
    redispatch: 'Redispatch',
  };
  return labels[action] || action;
}

function resourceLabel(resource: string): string {
  const labels: Record<string, string> = {
    appointment: 'Rendez-vous',
    profile: 'Profil',
    review: 'Avis',
    care_category: 'Catégorie',
  };
  return labels[resource] || resource;
}

/** Résumé lisible pour une entrée d'activité (temps réel) */
function activitySummary(log: { action: string; resource_type: string; resource_id?: string | null }): string {
  const action = actionLabel(log.action);
  const resource = resourceLabel(log.resource_type);
  return `${action} · ${resource}`;
}

function formatDateOnly(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

onMounted(() => {
  fetchDashboard();
});
</script>
