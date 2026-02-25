<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      variant="outline"
      size="sm"
      icon="i-lucide-list"
      :to="`${basePath}/appointments`"
    >
      Rendez-vous
    </UButton>
    <UButton
      variant="outline"
      size="sm"
      icon="i-lucide-calendar"
      :to="`${basePath}/calendar`"
    >
      Calendrier
    </UButton>
    <template v-if="isLab">
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-users"
        :to="`${basePath}/preleveurs`"
      >
        Préleveurs
      </UButton>
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-building-2"
        :to="`${basePath}/subaccounts`"
      >
        Sous-comptes
      </UButton>
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-star"
        :to="`${basePath}/reviews`"
      >
        Avis
      </UButton>
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-bar-chart-3"
        to="/lab/stats"
      >
        Statistiques
      </UButton>
    </template>
    <template v-else>
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-star"
        :to="`${basePath}/reviews`"
      >
        Avis
      </UButton>
    </template>
    <UButton
      variant="outline"
      size="sm"
      icon="i-lucide-user"
      to="/profile"
    >
      Mon profil
    </UButton>
  </div>
</template>

<script setup lang="ts">
interface Props {
  basePath: string;
  isLab?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLab: false,
});
</script>
