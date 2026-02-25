<template>
  <section 
    class="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50 min-h-screen flex items-center"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
      <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
        <!-- Contenu texte -->
        <div class="text-center lg:text-left order-2 lg:order-1" :class="textAlignment">
          <h1 
            v-if="title" 
            class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-gray-900 mb-4 sm:mb-5 md:mb-6 leading-tight tracking-tight"
          >
            {{ title }}
          </h1>
          
          <p 
            v-if="subtitle" 
            class="text-lg sm:text-xl md:text-2xl text-gray-700 mb-4 sm:mb-5 md:mb-6 max-w-2xl mx-auto lg:mx-0 font-medium leading-snug"
          >
            {{ subtitle }}
          </p>
          
          <p 
            v-if="description" 
            class="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
          >
            {{ description }}
          </p>
          
          <!-- Label des CTAs -->
          <p 
            v-if="ctaLabel && ctas && ctas.length > 0" 
            class="text-lg sm:text-xl font-normal text-gray-800 mb-4 sm:mb-5 text-center lg:text-left"
          >
            {{ ctaLabel }}
          </p>
          
          <!-- CTAs -->
          <div 
            v-if="ctas && ctas.length > 0" 
            class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
          >
            <UButton
              v-for="(cta, index) in ctas"
              :key="index"
              :to="cta.to"
              :color="cta.color || 'primary'"
              :size="cta.size || 'lg'"
              :variant="cta.variant || 'outline'"
              :icon="cta.icon"
              class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-normal border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {{ cta.label }}
            </UButton>
          </div>
          
          <!-- Slot pour contenu personnalisé -->
          <div v-if="$slots.default" class="mt-6 sm:mt-8">
            <slot />
          </div>
        </div>
        
        <!-- Image SVG -->
        <div 
          v-if="imageSrc" 
          class="order-1 lg:order-2 flex items-center justify-center lg:justify-end px-4 sm:px-6 md:px-8"
        >
          <div class="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl transform transition-transform duration-300 hover:scale-105">
            <img 
              :src="imageSrc" 
              :alt="imageAlt || title || 'Hero image'"
              class="w-full h-auto object-contain drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
        
        <!-- Slot pour image personnalisée -->
        <div 
          v-else-if="$slots.image" 
          class="order-1 lg:order-2 flex items-center justify-center lg:justify-end"
        >
          <slot name="image" />
        </div>
      </div>
    </div>
    
    <!-- Éléments décoratifs optionnels -->
    <div 
      v-if="showDecorations" 
      class="absolute inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      <div class="absolute -top-40 -right-40 w-72 h-72 sm:w-80 sm:h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-72 h-72 sm:w-80 sm:h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface CTA {
  label: string;
  to: string;
  color?: 'primary' | 'white' | 'gray' | 'green' | 'blue' | 'red' | 'yellow';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  icon?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  ctas?: CTA[];
  ctaLabel?: string;
  backgroundClass?: string;
  textAlignment?: string;
  showDecorations?: boolean;
}

withDefaults(defineProps<Props>(), {
  textAlignment: '',
  backgroundClass: '',
  showDecorations: true,
});
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>

