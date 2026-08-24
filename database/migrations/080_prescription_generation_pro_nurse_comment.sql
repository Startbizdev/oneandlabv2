-- Doc : prescription_generation_enabled s'applique aux pros et infirmiers
ALTER TABLE profiles
  MODIFY COLUMN prescription_generation_enabled TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Pro / infirmier : accès génération ordonnances (0 = désactivé par admin)';
