<template>
  <div class="min-h-[calc(100vh-4rem)] bg-gray-50 pb-32">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header class="mb-6 text-left">
        <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Détails de votre rendez-vous
        </h1>
        <p v-if="providerName" class="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">
          Avec {{ providerName }}
        </p>
        <p v-else class="mt-1 text-sm text-gray-500">
          Complétez les informations pour chaque soin sélectionné.
        </p>
      </header>

      <UAlert
        v-if="validationError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Champs obligatoires manquants"
        class="mb-6"
        id="form-error-alert"
      >
        <template #description>
          <div class="whitespace-pre-line">{{ validationError }}</div>
        </template>
      </UAlert>

      <ClientOnly>
        <UnifiedAppointmentForm
          v-if="selectedServices.length > 0"
          ref="unifiedFormRef"
          v-model="formData"
          :selected-services="selectedServices"
          :categories="categories"
          :relative="relativeForForm"
          :hide-personal-info="hidePersonalInfo"
          :min-lead-time-hours="minLeadTimeHours ?? undefined"
          :accept-saturday="acceptSaturday !== false"
          :accept-sunday="acceptSunday !== false"
          @submit="emit('submit', $event)"
        >
          <template #beforeFooter>
            <UCard
              v-if="isAuthenticated && selectedServices.length > 0"
              class="mb-0 mt-2 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <template #header>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  >
                    <UIcon name="i-lucide-users" class="h-5 w-5" />
                  </div>
                  <h3 class="text-base font-semibold leading-snug text-gray-900 dark:text-white sm:text-lg">
                    Pour qui prenez-vous ce rendez-vous ?
                  </h3>
                </div>
              </template>

              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    @click="emit('select-for-myself')"
                    :class="[
                      'flex min-h-[5.25rem] w-full rounded-2xl border-2 p-3 text-left transition-all sm:min-h-0 sm:p-4',
                      selectedRelative === null && !showRelativesSelector
                        ? 'border-blue-600 bg-blue-50/80 shadow-[0_2px_8px_rgba(37,99,235,0.1)] dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40',
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        :class="[
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10',
                          selectedRelative === null && !showRelativesSelector ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
                        ]"
                      >
                        <UIcon
                          name="i-lucide-user"
                          :class="[
                            'h-5 w-5',
                            selectedRelative === null && !showRelativesSelector ? 'text-white' : 'text-gray-500',
                          ]"
                        />
                      </div>
                      <div class="min-w-0">
                        <p class="font-semibold text-gray-900 dark:text-white">Pour moi-même</p>
                        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Mes informations</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    @click="emit('toggle-proche')"
                    :class="[
                      'flex min-h-[5.25rem] w-full rounded-2xl border-2 p-3 text-left transition-all sm:min-h-0 sm:p-4',
                      showRelativesSelector || typeof selectedRelative === 'string'
                        ? 'border-blue-600 bg-blue-50/80 shadow-[0_2px_8px_rgba(37,99,235,0.1)] dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40',
                    ]"
                  >
                    <div class="flex w-full items-start justify-between gap-2 sm:items-center">
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          :class="[
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10',
                            showRelativesSelector || typeof selectedRelative === 'string' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
                          ]"
                        >
                          <UIcon
                            name="i-lucide-heart"
                            :class="[
                              'h-5 w-5',
                              showRelativesSelector || typeof selectedRelative === 'string' ? 'text-white' : 'text-gray-500',
                            ]"
                          />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="font-semibold text-gray-900 dark:text-white">Pour un proche</p>
                          <p class="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {{
                              typeof selectedRelative === 'string'
                                ? `${relatives.find((r) => r.id === selectedRelative)?.first_name || 'Proche'} sélectionné(e)`
                                : 'Enfant, parent, conjoint…'
                            }}
                          </p>
                        </div>
                      </div>
                      <UIcon
                        :name="showRelativesSelector ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        class="mt-0.5 h-5 w-5 shrink-0 text-gray-400 sm:mt-0"
                      />
                    </div>
                  </button>
                </div>

                <div v-if="showRelativesSelector" class="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div>
                    <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"> Choisissez le proche concerné </label>

                    <div v-if="relatives.length > 0" class="space-y-3">
                      <div class="grid grid-cols-1 gap-3">
                        <button
                          v-for="relative in relatives"
                          :key="relative.id"
                          type="button"
                          @click="emit('load-relative', relative.id)"
                          :class="[
                            'relative rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                            selectedRelative === relative.id
                              ? 'border-blue-600 bg-blue-50/80 shadow-sm dark:border-blue-500 dark:bg-blue-950/30'
                              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40',
                          ]"
                        >
                          <div class="flex items-center gap-3">
                            <div
                              :class="[
                                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white',
                                selectedRelative === relative.id
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-500',
                              ]"
                            >
                              {{ relative.first_name?.charAt(0).toUpperCase() }}{{ relative.last_name?.charAt(0).toUpperCase() }}
                            </div>

                            <div class="min-w-0 flex-1">
                              <p class="mb-1 font-medium text-gray-900 dark:text-white">
                                {{ relative.first_name }} {{ relative.last_name }}
                              </p>

                              <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <UIcon :name="getRelationshipIcon(relative.relationship_type)" class="h-3.5 w-3.5" />
                                <span>{{ getRelationshipDescription(relative.relationship_type, relative.gender) }}</span>
                              </div>
                            </div>

                            <div class="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                @click.stop="emit('edit-relative', relative)"
                                class="rounded-md p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Modifier"
                              >
                                <UIcon name="i-lucide-pencil" class="h-4 w-4 text-gray-500" />
                              </button>
                              <button
                                type="button"
                                @click.stop="emit('delete-relative', relative)"
                                class="rounded-md p-1.5 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Supprimer"
                              >
                                <UIcon name="i-lucide-trash-2" class="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </button>
                      </div>
                      <UButton
                        type="button"
                        variant="outline"
                        size="sm"
                        icon="i-lucide-plus"
                        class="w-full border-dashed"
                        @click="emit('add-relative')"
                      >
                        Ajouter un autre proche
                      </UButton>
                    </div>

                    <UEmpty
                      v-else
                      icon="i-lucide-users"
                      title="Aucun proche enregistré"
                      description="Ajoutez un proche (enfant, parent, conjoint…) pour prendre rendez-vous à sa place. Vous pourrez réutiliser ses informations à chaque réservation."
                      class="rounded-2xl border-2 border-dashed border-gray-200 py-8 dark:border-gray-700"
                      :actions="[{ label: 'Ajouter un proche', icon: 'i-lucide-plus', variant: 'solid', onClick: () => emit('add-relative') }]"
                    />
                  </div>
                </div>

                <div
                  v-if="
                    ((selectedRelative === null && !showRelativesSelector) || (typeof selectedRelative === 'string' && selectedRelative.length > 0)) &&
                    !showFullForm
                  "
                  class="border-t border-gray-100 pt-4 dark:border-gray-800"
                >
                  <div class="mb-4 flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Informations enregistrées</h4>
                      <p class="mt-0.5 text-xs text-gray-500">Complétez le reste du formulaire ci-dessus</p>
                    </div>
                    <UButton type="button" variant="outline" size="sm" icon="i-lucide-pencil" @click="emit('show-full-form')">
                      Modifier
                    </UButton>
                  </div>

                  <div
                    class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-gray-50 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-gray-900/40"
                  >
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div class="flex items-start gap-3">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800"
                        >
                          <UIcon name="i-lucide-user" class="h-4 w-4 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs text-gray-500 dark:text-gray-400">Nom complet</p>
                          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {{ prefilledInfo.first_name }} {{ prefilledInfo.last_name }}
                          </p>
                        </div>
                      </div>

                      <div v-if="prefilledInfo.birth_date" class="flex items-start gap-3">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800"
                        >
                          <UIcon name="i-lucide-cake" class="h-4 w-4 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p>
                          <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ formatBirthDate(prefilledInfo.birth_date) }}
                          </p>
                        </div>
                      </div>

                      <div v-if="prefilledInfo.email" class="flex items-start gap-3">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800"
                        >
                          <UIcon name="i-lucide-mail" class="h-4 w-4 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {{ prefilledInfo.email }}
                          </p>
                        </div>
                      </div>

                      <div v-if="prefilledInfo.phone" class="flex items-start gap-3">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800"
                        >
                          <UIcon name="i-lucide-phone" class="h-4 w-4 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                          <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ prefilledInfo.phone }}
                          </p>
                        </div>
                      </div>

                      <div v-if="prefilledInfo.address" class="flex items-start gap-3 md:col-span-2">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800"
                        >
                          <UIcon name="i-lucide-map-pin" class="h-4 w-4 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs text-gray-500 dark:text-gray-400">Adresse</p>
                          <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ typeof prefilledInfo.address === 'string' ? prefilledInfo.address : prefilledInfo.address?.label }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </template>
          <template #footer>
            <RendezVousStickyFooter
              primary-label="Continuer"
              :primary-submit="true"
              @back="emit('prev')"
            />
          </template>
        </UnifiedAppointmentForm>
        <template #fallback>
          <div class="py-8 text-center">
            <p class="text-gray-500">Chargement du formulaire...</p>
          </div>
        </template>
      </ClientOnly>

      <div v-if="selectedServices.length === 0" class="py-8 text-center">
        <p class="text-gray-500">Veuillez sélectionner au moins un soin</p>
        <UButton class="mt-4" @click="emit('back-to-selection')">Retour à la sélection</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    validationError: string;
    selectedServices: Array<{ id: string; type: string; name: string; category_id: string | null; icon?: string }>;
    /** Même forme que l’API /categories (options dynamiques par soin) */
    categories: Array<{
      id: string;
      name?: string;
      type?: string;
      options?: Array<{ option_key: string; label: string; field_type?: string; options?: { value: string; label: string }[] }>;
    }>;
    providerName?: string | null;
    isAuthenticated: boolean;
    relatives: any[];
    prefilledInfo: Record<string, any>;
    relativeForForm: any | null;
    hidePersonalInfo: boolean;
    minLeadTimeHours?: number | null;
    acceptSaturday?: boolean;
    acceptSunday?: boolean;
  }>(),
  {
    providerName: null,
    minLeadTimeHours: null,
    acceptSaturday: true,
    acceptSunday: true,
  }
);

const unifiedFormRef = ref<{ flushDraftToParent?: () => void } | null>(null);

const formData = defineModel<any>('formData', { required: true });

function flushBookingDraftToParent() {
  unifiedFormRef.value?.flushDraftToParent?.();
}

defineExpose({ flushBookingDraftToParent });
/** null = pour moi-même, string = id proche, undefined = non défini */
const selectedRelative = defineModel<any>('selectedRelative');
const showRelativesSelector = defineModel<boolean>('showRelativesSelector', { default: false });
const showFullForm = defineModel<boolean>('showFullForm', { default: false });

const emit = defineEmits<{
  submit: [data: any];
  prev: [];
  'select-for-myself': [];
  'toggle-proche': [];
  'load-relative': [id: string];
  'edit-relative': [relative: any];
  'delete-relative': [relative: any];
  'add-relative': [];
  'show-full-form': [];
  'back-to-selection': [];
}>();

function getRelationshipIcon(type: string) {
  const icons: Record<string, string> = {
    child: 'i-lucide-baby',
    parent: 'i-lucide-users',
    spouse: 'i-lucide-heart',
    sibling: 'i-lucide-user',
    grandparent: 'i-lucide-user-round',
    grandchild: 'i-lucide-baby',
    other: 'i-lucide-user',
  };
  return icons[type] || 'i-lucide-user';
}

function getRelationshipDescription(type: string, gender?: string) {
  const descriptions: Record<string, Record<string, string>> = {
    child: { male: 'Votre fils', female: 'Votre fille', other: 'Votre enfant' },
    parent: { male: 'Votre père', female: 'Votre mère', other: 'Votre parent' },
    spouse: { male: 'Votre conjoint', female: 'Votre conjointe', other: 'Votre conjoint(e)' },
    sibling: { male: 'Votre frère', female: 'Votre sœur', other: 'Votre frère/sœur' },
    grandparent: { male: 'Votre grand-père', female: 'Votre grand-mère', other: 'Votre grand-parent' },
    grandchild: { male: 'Votre petit-fils', female: 'Votre petite-fille', other: 'Votre petit-enfant' },
    other: { male: 'Proche', female: 'Proche', other: 'Proche' },
  };
  const typeDescriptions = descriptions[type] || descriptions.other;
  return typeDescriptions[gender || 'other'] || typeDescriptions.other;
}

function formatBirthDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
</script>
