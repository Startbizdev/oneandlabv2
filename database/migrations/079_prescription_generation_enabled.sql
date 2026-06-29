-- Admin : activer / désactiver la génération d'ordonnances pour les pros de santé
ALTER TABLE profiles
  ADD COLUMN prescription_generation_enabled TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Pro : accès génération ordonnances (0 = désactivé par admin)'
  AFTER is_accepting_appointments;
