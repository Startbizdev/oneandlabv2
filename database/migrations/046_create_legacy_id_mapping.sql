-- Migration 046 : Table de mapping ObjectId legacy → UUID cible
-- Requise pour la migration des données MongoDB → MySQL

CREATE TABLE IF NOT EXISTS legacy_id_mapping (
  legacy_collection VARCHAR(50) NOT NULL,
  legacy_object_id VARCHAR(24) NOT NULL,
  target_table VARCHAR(50) NOT NULL,
  target_uuid CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_collection, legacy_object_id),
  INDEX idx_target (target_table, target_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
