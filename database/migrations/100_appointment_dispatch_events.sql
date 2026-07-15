-- Migration 100 : Journal dispatch admin + mode dispatch persisté

CREATE TABLE IF NOT EXISTS appointment_dispatch_events (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    event_type ENUM(
        'created',
        'zone_dispatch',
        'redispatch',
        'external_nurse_invite',
        'direct_assign',
        'offer_declined',
        'offer_accepted',
        'offer_accepted_via_share_token',
        'nurse_share_release',
        'nurse_share_link_created',
        'reassign',
        'nurse_share_redispatch_zone'
    ) NOT NULL,
    actor_id CHAR(36) NULL,
    actor_role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NULL,
    target_profile_id CHAR(36) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_dispatch_events_appointment (appointment_id, created_at),
    INDEX idx_dispatch_events_type (event_type, created_at),
    INDEX idx_dispatch_events_target (target_profile_id),

    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (target_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
    ADD COLUMN dispatch_mode ENUM('zone', 'external_invite', 'direct_assign', 'manual') NULL DEFAULT NULL
    AFTER assigned_pro_id;

CREATE INDEX idx_appointments_dispatch_mode ON appointments (dispatch_mode, status, created_at);
