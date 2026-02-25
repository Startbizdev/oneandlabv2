<template>
  <section 
    class="relative py-12 sm:py-16 md:py-20 lg:py-24"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- En-tête -->
      <div class="text-center mb-8 sm:mb-10 md:mb-12">
        <h2 
          v-if="title"
          class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-gray-900 dark:text-white mb-3 sm:mb-4 md:mb-5"
        >
          {{ title }}
        </h2>
        <p 
          v-if="subtitle"
          class="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- Étapes -->
      <div class="grid md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="relative"
        >
          <!-- Contenu de l'étape -->
          <div class="text-center">
            <div 
              v-if="step.icon"
              class="mb-4 sm:mb-5 md:mb-6 flex justify-center"
            >
              <div class="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg bg-primary-50 flex items-center justify-center">
                <UIcon 
                  :name="step.icon" 
                  class="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary-600"
                />
              </div>
            </div>

            <h3 
              class="text-lg sm:text-xl md:text-2xl font-normal text-gray-900 dark:text-white mb-2 sm:mb-3"
            >
              {{ step.title }}
            </h3>

            <p 
              class="text-sm sm:text-base text-gray-600 leading-relaxed"
            >
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Slot pour contenu personnalisé -->
      <div v-if="$slots.default" class="mt-10 sm:mt-12 md:mt-16">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface StepButton {
  label: string;
  to: string;
  color?: 'primary' | 'white' | 'gray' | 'green' | 'blue' | 'red' | 'yellow';
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  icon?: string;
}

interface Step {
  title: string;
  description: string;
  icon?: string;
  button?: StepButton;
}

interface Props {
  title?: string;
  subtitle?: string;
  steps: Step[];
  backgroundClass?: string;
}

withDefaults(defineProps<Props>(), {
  backgroundClass: '',
});
</script>

<style scoped>
/* Animation pour les numéros d'étape */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.relative {
  animation: fadeInUp 0.6s ease-out;
}

.relative:nth-child(1) {
  animation-delay: 0.1s;
}

.relative:nth-child(2) {
  animation-delay: 0.2s;
}

.relative:nth-child(3) {
  animation-delay: 0.3s;
}
</style>

