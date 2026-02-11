<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6">Politique de confidentialité</h1>
    
    <UCard class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold mb-4">Collecte des données</h2>
        <p class="text-gray-700">
          Nous collectons uniquement les données nécessaires à la fourniture de nos services de santé à domicile. 
          Ces données sont traitées conformément à la réglementation en vigueur.
        </p>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-4">Utilisation des données</h2>
        <p class="text-gray-700">
          Vos données personnelles et médicales sont utilisées exclusivement pour :
        </p>
        <ul class="list-disc list-inside mt-2 text-gray-700 space-y-1">
          <li>La gestion de vos rendez-vous</li>
          <li>La coordination avec les professionnels de santé</li>
          <li>Le suivi de vos soins</li>
        </ul>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-4">Sécurité</h2>
        <p class="text-gray-700">
          Toutes les données sont cryptées et stockées sur des serveurs certifiés HDS (Hébergement de Données de Santé). 
          Nous mettons en œuvre toutes les mesures techniques et organisationnelles nécessaires pour protéger vos données.
        </p>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-4">Vos droits</h2>
        <p class="text-gray-700">
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition 
          concernant vos données personnelles. Pour exercer ces droits, contactez-nous à : contact@startbiz.fr
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


