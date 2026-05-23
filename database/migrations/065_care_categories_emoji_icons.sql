-- 065 : emoji par soin dans care_categories.icon (remplace images / noms Lucide)
-- Appliquer : mysql ... < database/migrations/065_care_categories_emoji_icons.sql
-- ou : database/scripts/apply-care-category-emoji.sh

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Soins infirmiers
UPDATE care_categories SET icon = '🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement' AND type = 'nursing';
UPDATE care_categories SET icon = '🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement-plaie' AND type = 'nursing';
UPDATE care_categories SET icon = '🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement complexe' AND type = 'nursing';
UPDATE care_categories SET icon = '💉', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection' AND type = 'nursing';
UPDATE care_categories SET icon = '💉', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection sous-cutanée' AND type = 'nursing';
UPDATE care_categories SET icon = '💉', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection intramusculaire' AND type = 'nursing';
UPDATE care_categories SET icon = '🧪', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement' AND type = 'nursing';
UPDATE care_categories SET icon = '🧪', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement urinaire' AND type = 'nursing';
UPDATE care_categories SET icon = '💧', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Perfusion' AND type = 'nursing';
UPDATE care_categories SET icon = '🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de plaies' AND type = 'nursing';
UPDATE care_categories SET icon = '💉', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Vaccination' AND type = 'nursing';
UPDATE care_categories SET icon = '🏥', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins post-opératoires' AND type = 'nursing';
UPDATE care_categories SET icon = '🛁', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Toilette / soins d''hygiène' AND type = 'nursing';
UPDATE care_categories SET icon = '🛁', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins d''hygiène' AND type = 'nursing';
UPDATE care_categories SET icon = '🦽', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Rééducation' AND type = 'nursing';
UPDATE care_categories SET icon = '📊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Surveillance' AND type = 'nursing';
UPDATE care_categories SET icon = '📊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Surveillance constante' AND type = 'nursing';
UPDATE care_categories SET icon = '🤍', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins palliatifs' AND type = 'nursing';
UPDATE care_categories SET icon = '🩺', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Pose de cathéter' AND type = 'nursing';
UPDATE care_categories SET icon = '📈', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Mesure tension / glycémie' AND type = 'nursing';
UPDATE care_categories SET icon = '🍽️', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Aide aux repas' AND type = 'nursing';
UPDATE care_categories SET icon = '🌙', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Garde / surveillance nuit' AND type = 'nursing';
UPDATE care_categories SET icon = '🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de stomie' AND type = 'nursing';
UPDATE care_categories SET icon = '🩺', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de sonde' AND type = 'nursing';
UPDATE care_categories SET icon = '🩺', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Sonde urinaire' AND type = 'nursing';
UPDATE care_categories SET icon = '🫁', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins respiratoires' AND type = 'nursing';
UPDATE care_categories SET icon = '💊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Chimiothérapie à domicile' AND type = 'nursing';
UPDATE care_categories SET icon = '✅', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan de prévention' AND type = 'nursing';
UPDATE care_categories SET icon = '✅', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Mon bilan prévention' AND type = 'nursing';
UPDATE care_categories SET icon = '✨', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Epilation laser' AND type = 'nursing';
UPDATE care_categories SET icon = '👤', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins à la personne' AND type = 'nursing';
UPDATE care_categories SET icon = '✂️', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Retrait de points / agrafes' AND type = 'nursing';
UPDATE care_categories SET icon = '🩸', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Suivi diabète' AND type = 'nursing';
UPDATE care_categories SET icon = '🏠', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Suivi post-hospitalisation' AND type = 'nursing';
UPDATE care_categories SET icon = '💊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Traitement' AND type = 'nursing';
UPDATE care_categories SET icon = '➕', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Autre' AND type = 'nursing';
UPDATE care_categories SET icon = '📄', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Certificat de décès' AND type = 'nursing';

-- Analyses / laboratoire
UPDATE care_categories SET icon = '🩸', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan complet' AND type = 'blood_test';
UPDATE care_categories SET icon = '🩸', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan sanguin' AND type = 'blood_test';
UPDATE care_categories SET icon = '🍬', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Glycémie' AND type = 'blood_test';
UPDATE care_categories SET icon = '🍽️', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Glycémie à jeun' AND type = 'blood_test';
UPDATE care_categories SET icon = '❤️‍🩹', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Cholestérol' AND type = 'blood_test';
UPDATE care_categories SET icon = '🌞', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Vitamines' AND type = 'blood_test';
UPDATE care_categories SET icon = '⚗️', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Hormones' AND type = 'blood_test';
UPDATE care_categories SET icon = '🧬', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Triglycérides' AND type = 'blood_test';
UPDATE care_categories SET icon = '🩸', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'NFS' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔬', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'CRP' AND type = 'blood_test';
UPDATE care_categories SET icon = '🫀', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan hépatique' AND type = 'blood_test';
UPDATE care_categories SET icon = '🫘', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan rénal' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔩', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Fer / Ferritine' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔩', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan martial' AND type = 'blood_test';
UPDATE care_categories SET icon = '🦋', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan thyroïdien' AND type = 'blood_test';
UPDATE care_categories SET icon = '🧪', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan lipidique' AND type = 'blood_test';
UPDATE care_categories SET icon = '📊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'HbA1c' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔥', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan inflammatoire' AND type = 'blood_test';
UPDATE care_categories SET icon = '🛡️', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Dépistage (VIH, hépatites)' AND type = 'blood_test';
UPDATE care_categories SET icon = '🦠', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Dépistages infections' AND type = 'blood_test';
UPDATE care_categories SET icon = '🩸', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan de coagulation' AND type = 'blood_test';
UPDATE care_categories SET icon = '💊', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan vitaminique' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔬', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Sérologie' AND type = 'blood_test';
UPDATE care_categories SET icon = '🎯', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Marqueurs tumoraux' AND type = 'blood_test';
UPDATE care_categories SET icon = '🏥', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan pré-opératoire' AND type = 'blood_test';
UPDATE care_categories SET icon = '💤', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan d''anesthésie' AND type = 'blood_test';
UPDATE care_categories SET icon = '🔬', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Examen des selles' AND type = 'blood_test';
UPDATE care_categories SET icon = '🚽', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Examen des urines' AND type = 'blood_test';
UPDATE care_categories SET icon = '🤰', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Grossesse' AND type = 'blood_test';
UPDATE care_categories SET icon = '🧫', image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement bactériologique' AND type = 'blood_test';
