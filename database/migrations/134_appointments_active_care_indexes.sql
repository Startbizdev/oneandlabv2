-- Migration 134 : index couvrants pour « Mes patients » (soins en cours attribués à un soignant).
-- Une recherche par colonne d'attribution lit seulement l'index : rapide même avec des milliers de RDV.
-- Idempotente, sans modification des données (ALTER ... ADD INDEX en ligne, sans verrou de table).

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appt_care_assigned_nurse_id') = 0,
    'ALTER TABLE appointments ADD INDEX idx_appt_care_assigned_nurse_id (assigned_nurse_id, status, relative_id, patient_id), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appt_care_assigned_pro_id') = 0,
    'ALTER TABLE appointments ADD INDEX idx_appt_care_assigned_pro_id (assigned_pro_id, status, relative_id, patient_id), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appt_care_assigned_to') = 0,
    'ALTER TABLE appointments ADD INDEX idx_appt_care_assigned_to (assigned_to, status, relative_id, patient_id), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
