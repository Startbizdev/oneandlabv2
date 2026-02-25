-- Migration 033 : Champs d'annulation par un pro (motif, commentaire, photo)
-- canceled_by, canceled_at, cancellation_reason, cancellation_comment, cancellation_photo_document_id

ALTER TABLE appointments
    ADD COLUMN canceled_by CHAR(36) NULL AFTER updated_at,
    ADD COLUMN canceled_at DATETIME NULL AFTER canceled_by,
    ADD COLUMN cancellation_reason VARCHAR(64) NULL AFTER canceled_at,
    ADD COLUMN cancellation_comment TEXT NULL AFTER cancellation_reason,
    ADD COLUMN cancellation_photo_document_id CHAR(36) NULL AFTER cancellation_comment,
    ADD INDEX idx_canceled_by (canceled_by);
