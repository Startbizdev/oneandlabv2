-- Migration 051 : unicité de email_hash (évite ambiguïté OTP / login)
-- Prérequis : exécuter backend/scripts/run-migration-051-fix-duplicate-email-hash.php (backfill patients)

ALTER TABLE profiles
    DROP INDEX idx_email_hash,
    ADD UNIQUE INDEX uq_profiles_email_hash (email_hash);
