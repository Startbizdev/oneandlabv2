<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6">Mentions légales</h1>
    
    <UCard class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold mb-4">Éditeur du site</h2>
        <p class="text-gray-700">
          OneAndLab<br>
          Plateforme de santé à domicile<br>
          Email : contact@startbiz.fr
        </p>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-4">Hébergement</h2>
        <p class="text-gray-700">
          Les données sont hébergées sur des serveurs sécurisés conformes aux normes HDS (Hébergement de Données de Santé).
        </p>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-4">Protection des données</h2>
        <p class="text-gray-700">
          Conformément au Règlement Général sur la Protection des Données (RGPD), vos données personnelles sont traitées de manière sécurisée et confidentielle.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
</script>


