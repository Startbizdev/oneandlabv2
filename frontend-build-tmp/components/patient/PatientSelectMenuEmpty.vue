<template>
  <div class="py-5 px-3 text-center space-y-2 max-w-[20rem] mx-auto">
    <UIcon
      name="i-lucide-user-search"
      class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600"
      aria-hidden="true"
    />
    <p class="text-sm font-medium text-gray-900 dark:text-white">
      <template v-if="hasSearchQuery">Aucun patient ne correspond</template>
      <template v-else>Aucun patient à afficher</template>
    </p>
    <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
      <template v-if="hasSearchQuery">
        Essayez un autre orthographe, un e-mail ou les derniers chiffères du téléphone. Effacez la recherche
        <span v-if="suggestNewPatientOption">
          pour revoir toute la liste et l’option <span class="font-medium text-gray-700 dark:text-gray-300">Nouveau patient</span>
        </span>
        <span v-else>pour revoir toute la liste.</span>
      </template>
      <template v-else>
        <span v-if="suggestNewPatientOption">
          Les fiches patient apparaissent ici. Sinon choisissez
          <span class="font-medium text-gray-700 dark:text-gray-300">Nouveau patient</span> pour une saisie manuelle complète.
        </span>
        <span v-else>
          Ajoutez des patients à votre liste depuis l’espace prévu (profil, patients, etc.), puis revenez sur cet écran.
        </span>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Terme saisi dans le champ de recherche du menu (slot #empty de USelectMenu) */
    searchTerm?: string;
    /**
     * `true` : le menu inclut l’option « Nouveau patient » (formulaire RDV création).
     * `false` : liste seule (assistant, ordonnances…).
     */
    suggestNewPatientOption?: boolean;
  }>(),
  {
    searchTerm: '',
    suggestNewPatientOption: true,
  }
);

const hasSearchQuery = computed(() => String(props.searchTerm ?? '').trim().length > 0);
</script>
