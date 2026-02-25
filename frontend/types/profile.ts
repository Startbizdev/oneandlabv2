// ============================================================================
// Profile form & address
// ============================================================================

export interface Address {
  label?: string
  lat?: number
  lng?: number
  complement?: string
}

export interface ProfileForm {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  name: string
  rpps: string
  siret: string
  adeli: string
  /** Profession de santé (pro uniquement, hors infirmier) */
  emploi: string | null
  birth_date: string | null
  gender: string | null
  address: Address | null
  address_complement: string | null
}

export const GENDER_OPTIONS = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
] as const

// ============================================================================
// Patient documents
// ============================================================================

export type DocumentType = 'carte_vitale' | 'carte_mutuelle' | 'autres_assurances'

export interface PatientDocument {
  medical_document_id: string
  document_type: string
  file_name: string
  updated_at: string
}

export interface DocumentConfig {
  type: DocumentType
  label: string
  icon: string
  iconColor: 'blue' | 'purple' | 'gray'
  required: boolean
  acceptedTypes: string[]
  maxSize: number
}

export const DOCUMENT_CONFIGS: Record<DocumentType, DocumentConfig> = {
  carte_vitale: {
    type: 'carte_vitale',
    label: 'Carte Vitale',
    icon: 'i-lucide-credit-card',
    iconColor: 'blue',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSize: 5,
  },
  carte_mutuelle: {
    type: 'carte_mutuelle',
    label: 'Carte Mutuelle',
    icon: 'i-lucide-shield-check',
    iconColor: 'purple',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSize: 5,
  },
  autres_assurances: {
    type: 'autres_assurances',
    label: 'Autres Assurances',
    icon: 'i-lucide-file-plus',
    iconColor: 'gray',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSize: 10,
  },
}
