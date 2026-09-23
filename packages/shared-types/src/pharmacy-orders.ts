/** Statuts commande pharmacie (MVP). */
export const PHARMACY_ORDER_STATUSES = [
  'en_attente',
  'acceptee',
  'en_cours',
  'terminee',
  'refusee',
  'complement_demande',
  'annulee',
] as const;

export type PharmacyOrderStatus = (typeof PHARMACY_ORDER_STATUSES)[number];

export type PharmacyFulfillmentMode = 'click_collect' | 'home_delivery';

export type PharmacyOrderAddress = {
  formatted_address?: string;
  label?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

export type PharmacyOrder = {
  id: string;
  requester_id: string;
  requester_role: 'nurse' | 'pro' | 'super_admin';
  pharmacy_id: string;
  patient_id: string;
  relative_id: string | null;
  fulfillment_mode: PharmacyFulfillmentMode;
  delivery_address: PharmacyOrderAddress | null;
  delivery_postal_code: string | null;
  desired_fulfillment_date: string | null;
  status: PharmacyOrderStatus;
  requester_comment: string | null;
  pharmacy_note: string | null;
  rejection_reason: string | null;
  prescription_document_ids: string[];
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
  patient_display_name?: string | null;
  pharmacy_display_name?: string | null;
  relative_display_name?: string | null;
  requester_display_name?: string | null;
  requester_phone?: string | null;
  requester_email?: string | null;
  requester_emploi?: string | null;
  requester_public_slug?: string | null;
};

export type PharmacyModuleConfig = {
  module_enabled: boolean;
  ordering_enabled_for_nurse: boolean;
  ordering_enabled_emplois: string[];
  ordering_allow_custom_emploi: boolean;
  pharmacy_receiver_emplois: string[];
};

export type PharmacyModuleUiFlags = {
  module_enabled: boolean;
  can_order: boolean;
  can_receive: boolean;
  is_pharmacy_account: boolean;
};

export type PharmacyCatalogItem = {
  id: string;
  display_name: string;
  emploi: string;
  accepts_click_collect: boolean;
  accepts_home_delivery: boolean;
  click_collect_days: number[];
  home_delivery_days: number[];
  address: PharmacyOrderAddress | null;
  postal_code: string;
  is_favorite?: boolean;
};

export type PharmacyOrderMessage = {
  id: string;
  order_id: string;
  author_id: string;
  author_name?: string;
  body: string;
  medical_document_id: string | null;
  created_at: string;
};

export type CreatePharmacyOrderPayload = {
  patient_id: string;
  relative_id?: string | null;
  pharmacy_id: string;
  fulfillment_mode: PharmacyFulfillmentMode;
  delivery_address?: PharmacyOrderAddress | null;
  desired_fulfillment_date: string;
  requester_comment?: string | null;
  prescription_document_ids: string[];
};
