<template>
  <div class="space-y-6">
    <!-- Recherche -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <UInput
        v-model="searchQuery"
        :placeholder="searchPlaceholder"
        icon="i-lucide-search"
        class="flex-1 min-w-0 sm:max-w-xs"
        clearable
      />
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary mb-4" />
      <p class="text-muted">Chargement…</p>
    </div>

    <!-- État vide -->
    <UEmpty
      v-else-if="!loading && filteredItems.length === 0"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :actions="emptyActions"
      variant="naked"
    />

    <!-- Grille de cartes -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
      <UCard
        v-for="item in filteredItems"
        :key="item.id"
        class="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col"
        :ui="{
          root: 'flex flex-col h-full min-h-0',
          body: 'flex-1 flex flex-col min-h-0 p-4 overflow-hidden',
          footer: 'mt-auto border-t border-default p-3 flex items-center justify-center gap-1.5 flex-shrink-0 flex-wrap'
        }"
      >
        <template #default>
          <slot name="cardContent" :item="item" />
        </template>
        <template #footer>
          <div class="flex items-center justify-center gap-1.5 w-full flex-wrap">
            <slot name="cardActions" :item="item" />
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    items: any[]
    loading: boolean
    searchPlaceholder?: string
    /** Clés des champs sur lesquels filtrer la recherche (ex: ['email','first_name','last_name']) */
    searchFields?: string[]
    emptyTitle: string
    emptyDescription: string
    emptyIcon?: string
    /** Action principale état vide : { label, icon?, to? | onClick? } */
    emptyActions?: Array<{ label: string; icon?: string; to?: string; onClick?: () => void }>
  }>(),
  {
    searchPlaceholder: 'Rechercher…',
    searchFields: () => ['email', 'first_name', 'last_name'],
    emptyIcon: 'i-lucide-users',
  }
);

const searchQuery = ref('');

const filteredItems = computed(() => {
  const list = props.items ?? [];
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (!q) return list;
  const fields = props.searchFields || ['email', 'first_name', 'last_name'];
  return list.filter((item) => {
    return fields.some((key) => {
      const val = item[key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(q);
    });
  });
});
</script>
