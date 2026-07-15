-- Index perf liste admin (pagination cartes par created_at + lots)
CREATE INDEX idx_appointments_created_at ON appointments (created_at);

CREATE INDEX idx_appointments_type_batch_created
    ON appointments (type, creation_batch_id, created_at);
