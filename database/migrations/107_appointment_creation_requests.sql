-- Apply before deploying clients that send client_request_id. Contains no clinical payload.
CREATE TABLE IF NOT EXISTS appointment_creation_requests (
    actor_id VARCHAR(36) NOT NULL,
    request_key VARCHAR(64) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    appointment_id VARCHAR(36) NULL,
    response_completed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_id, request_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
