-- Migration 119 : absence patient sans date de fin (« jusqu'à nouvel ordre »), end_date NULL = en cours

ALTER TABLE patient_absences
    MODIFY end_date DATE NULL;
