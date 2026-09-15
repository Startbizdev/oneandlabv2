export interface ReceivedReview {
  id: string;
  rating: number;
  reviewer_name?: string | null;
  comment?: string | null;
  response?: string | null;
  created_at: string;
  appointment_id?: string | null;
  appointment_type?: string | null;
  appointment_scheduled_at?: string | null;
  category_name?: string | null;
}
