-- Migration 045 : Ajout du statut 'planned' (planifié) aux appointments
-- Requis pour la migration des données legacy (MongoDB → MySQL)

ALTER TABLE appointments
MODIFY COLUMN status ENUM(
    'pending',
    'confirmed',
    'planned',
    'inProgress',
    'completed',
    'canceled',
    'expired',
    'refused'
) NOT NULL DEFAULT 'pending';
