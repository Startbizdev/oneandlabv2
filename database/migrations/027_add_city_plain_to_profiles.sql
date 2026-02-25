-- Migration 027 : Ville en clair pour SEO et pages /ville/[ville]
-- Permet de filtrer laboratoires et infirmiers par ville sans déchiffrer l'adresse
ALTER TABLE profiles
ADD COLUMN city_plain VARCHAR(255) NULL DEFAULT NULL;

CREATE INDEX idx_profiles_city_plain ON profiles (city_plain);
