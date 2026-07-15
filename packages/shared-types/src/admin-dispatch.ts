export type DispatchMode = 'zone' | 'external_invite' | 'direct_assign' | 'manual';

export type DispatchEventType =
  | 'created'
  | 'zone_dispatch'
  | 'redispatch'
  | 'external_nurse_invite'
  | 'direct_assign'
  | 'offer_declined'
  | 'offer_accepted'
  | 'offer_accepted_via_share_token'
  | 'nurse_share_release'
  | 'nurse_share_link_created'
  | 'reassign'
  | 'nurse_share_redispatch_zone'
  | string;

export interface AdminDispatchKpis {
  pending_dispatch: number;
  redispatch_24h: number;
  redispatch_7d: number;
  external_invites_7d: number;
  median_accept_minutes: number | null;
}

export interface AdminDispatchListRow {
  id: string;
  type: 'nursing' | 'blood_test' | string;
  status: string;
  scheduled_at: string | null;
  created_at: string | null;
  last_event_at: string | null;
  dispatch_mode: DispatchMode | null;
  pending_offers_count: number;
  has_redispatch: boolean;
  patient_id: string | null;
  patient_display_name: string | null;
  created_by: string | null;
  created_by_role: string | null;
  created_by_display_name: string | null;
  assigned_pro_id: string | null;
  assigned_pro_display_name: string | null;
  assigned_nurse_id: string | null;
  assigned_nurse_display_name: string | null;
  assigned_lab_id: string | null;
  assigned_lab_display_name: string | null;
  assigned_to: string | null;
  assigned_to_display_name: string | null;
  creneau: string | null;
}

export interface AdminDispatchActor {
  id: string;
  display_name: string | null;
  role: string | null;
}

export interface AdminDispatchTimelineItem {
  source: 'dispatch_event' | 'status_update' | 'access_log';
  id: string;
  event_type: DispatchEventType;
  created_at: string;
  actor_id: string | null;
  actor_display_name: string | null;
  actor_role: string | null;
  target_id: string | null;
  target_display_name: string | null;
  target_role: string | null;
  metadata: Record<string, unknown>;
  label: string;
}

export interface AdminDispatchDetail {
  identity: {
    appointment_id: string;
    type: string;
    status: string;
    dispatch_mode: DispatchMode | null;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    nurse_share_released_at: string | null;
    created_at: string | null;
    patient: AdminDispatchActor | null;
    creator: AdminDispatchActor | null;
    assigned_pro: AdminDispatchActor | null;
    assigned_nurse: AdminDispatchActor | null;
    assigned_lab: AdminDispatchActor | null;
    assigned_preleveur: AdminDispatchActor | null;
    creneau: string | null;
  };
  active_offers: Array<{
    profile_id: string;
    role: string | null;
    display_name: string | null;
    offered_at: string;
  }>;
  dispatch_waves: Array<{
    event_type: string;
    created_at: string;
    actor: AdminDispatchActor | null;
    recipient_count: number;
    recipients: AdminDispatchActor[];
  }>;
  share_tokens: Array<{
    token_id: string;
    created_at: string;
    expires_at: string | null;
  }>;
  timeline: AdminDispatchTimelineItem[];
  history_incomplete: boolean;
  history_incomplete_message: string | null;
}

export interface AdminDispatchDashboardData {
  kpis: AdminDispatchKpis;
  rows: AdminDispatchListRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
