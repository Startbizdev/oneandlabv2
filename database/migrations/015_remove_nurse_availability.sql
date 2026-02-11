-- Migration 015 : Suppression des horaires de disponibilité pour les infirmiers libéraux
-- Les infirmiers libéraux n'ont pas d'horaires fixes, donc on supprime leurs données de disponibilité

DELETE FROM availability_settings WHERE role = 'nurse';




