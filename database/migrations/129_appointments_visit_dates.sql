-- Bilan sanguin sur plusieurs jours : une seule ligne, dates en clair pour l'agenda.

ALTER TABLE appointments
    ADD COLUMN visit_dates JSON NULL AFTER scheduled_at;
