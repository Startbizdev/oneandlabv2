<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-bold">Donnez votre avis</h2>
    </template>
    
    <UForm :state="form" @submit="handleSubmit" class="space-y-4">
      <UFormGroup label="Note" name="rating" required>
        <div class="flex space-x-2">
          <UButton
            v-for="star in 5"
            :key="star"
            :color="star <= form.rating ? 'yellow' : 'gray'"
            variant="ghost"
            @click="form.rating = star"
          >
            <UIcon :name="'i-lucide-star'" class="w-6 h-6" :class="star <= form.rating ? 'fill-current' : 'opacity-30'" />
          </UButton>
        </div>
      </UFormGroup>
      
      <UFormGroup label="Commentaire" name="comment">
        <UTextarea v-model="form.comment" rows="4" placeholder="Partagez votre expérience..." />
      </UFormGroup>
      
      <UButton type="submit" :loading="loading" block>
        Envoyer l'avis
      </UButton>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  appointmentId: string;
  revieweeId: string;
  revieweeType: 'nurse' | 'subaccount';
}>();

const emit = defineEmits<{
  submitted: [];
}>();

import { apiFetch } from '~/utils/api';

const form = reactive({
  rating: 5,
  comment: '',
});

const loading = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  
  const response = await apiFetch('/reviews', {
    method: 'POST',
    body: {
      appointment_id: props.appointmentId,
      reviewee_id: props.revieweeId,
      reviewee_type: props.revieweeType,
    rating: form.rating,
    comment: form.comment,
  });
  
  if (response.success) {
    emit('submitted');
    form.rating = 5;
    form.comment = '';
  }
  
  loading.value = false;
};
</script>

