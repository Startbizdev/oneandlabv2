<template>
  <div class="relative">
    <UDropdownMenu
      :items="shareMenuItems"
      :popper="{ placement: 'bottom-end' }"
      :ui="{ width: 'w-56' }"
    >
      <UButton
        :variant="compact ? 'soft' : 'outline'"
        :color="compact ? 'white' : 'neutral'"
        :size="compact ? 'md' : 'md'"
        :block="!compact"
        :class="[
          compact ? 'rounded-full p-2.5 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-0 shadow-lg' : 'justify-center gap-2 font-normal',
        ]"
        icon="i-lucide-share-2"
        :aria-label="compact ? 'Partager le profil' : undefined"
      >
        <span v-if="!compact">Partager le profil</span>
      </UButton>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    shareUrl: string
    profileName: string
    profileType: 'nurse' | 'lab'
    address?: string | null
    /** Style compact (icône seule) pour le header / bannière */
    compact?: boolean
  }>(),
  { compact: false }
)

const profileLabel = computed(() =>
  props.profileType === 'nurse' ? 'Infirmier(e) à domicile' : 'Laboratoire - Prise de sang à domicile'
)

/** Message court pour SMS (infos utiles + lien, ~160 caractères si possible) */
const smsMessage = computed(() => {
  const parts = [
    `${props.profileName} - ${profileLabel.value}.`,
    props.address ? `Zone : ${props.address}.` : '',
    `Prendre RDV : ${props.shareUrl}`,
  ]
  return parts.filter(Boolean).join(' ')
})

/** Sujet email */
const emailSubject = computed(() => `Profil ${props.profileName} - ${profileLabel.value}`)

/** Corps email */
const emailBody = computed(() => {
  const lines = [
    `Profil : ${props.profileName}`,
    `Type : ${profileLabel.value}`,
    props.address ? `Zone / Adresse : ${props.address}` : '',
    '',
    'Voir le profil et prendre rendez-vous :',
    props.shareUrl,
  ]
  return lines.filter(Boolean).join('\n')
})

const toast = useAppToast()
const copyLink = () => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(props.shareUrl)
    toast.add({ title: 'Lien copié', color: 'green', timeout: 2000 })
  }
}

const shareMenuItems = computed(() => [
  [
    {
      label: 'Copier le lien',
      icon: 'i-lucide-link',
      onSelect: copyLink,
    },
  ],
  [
    {
      label: 'Envoyer par SMS',
      icon: 'i-lucide-message-circle',
      onSelect: () => { window.location.href = `sms:?body=${encodeURIComponent(smsMessage.value)}` },
    },
    {
      label: 'Envoyer par e-mail',
      icon: 'i-lucide-mail',
      onSelect: () => { window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject.value)}&body=${encodeURIComponent(emailBody.value)}` },
    },
  ],
  [
    {
      label: 'Partager sur Facebook',
      icon: 'i-simple-icons-facebook',
      onSelect: () => openShare('facebook'),
    },
    {
      label: 'Partager sur X',
      icon: 'i-simple-icons-x',
      onSelect: () => openShare('x'),
    },
  ],
])

function openShare(platform: 'facebook' | 'x') {
  const url = encodeURIComponent(props.shareUrl)
  const text = encodeURIComponent(`${props.profileName} - ${profileLabel.value}`)
  if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400')
  } else {
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400')
  }
}
</script>
