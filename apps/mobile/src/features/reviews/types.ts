export interface Review {
  id: string;
  rating?: number;
  comment?: string;
  response?: string;
  created_at?: string;
  updated_at?: string;
  appointment_id?: string | null;
  reviewer_name?: string;
  reviewee_name?: string;
  appointment_type?: string | null;
  appointment_scheduled_at?: string | null;
  category_name?: string | null;
  is_visible?: boolean;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
}

export type ReviewFilter = 'all' | 'pending' | 'answered';
