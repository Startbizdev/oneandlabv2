-- Migration 056 : descriptions ≤ 53 caractères (espaces et ponctuation incluses).
-- Appliquer via database/scripts/apply-care-category-descriptions.sh (utf8mb4).

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========== SOINS INFIRMIERS (nursing) ==========
UPDATE care_categories SET description = 'Pansements techniques au domicile par IDE.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement' AND type = 'nursing';
UPDATE care_categories SET description = 'Injections IM et SC sur prescription médicale.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection' AND type = 'nursing';
UPDATE care_categories SET description = 'Prélèvements biologiques au domicile patient.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement' AND type = 'nursing';
UPDATE care_categories SET description = 'Pose et surveillance de perfusions IV.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Perfusion' AND type = 'nursing';
UPDATE care_categories SET description = 'Soins infirmiers de plaies aiguës ou chroniques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de plaies' AND type = 'nursing';
UPDATE care_categories SET description = 'Vaccins administrés selon calendrier vaccinal.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Vaccination' AND type = 'nursing';
UPDATE care_categories SET description = 'Soins après chirurgie ou hospitalisation.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins post-opératoires' AND type = 'nursing';
UPDATE care_categories SET description = 'Toilette et hygiène corporelle quotidienne.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Toilette / soins d''hygiène' AND type = 'nursing';
UPDATE care_categories SET description = 'Rééducation et mobilisation sous protocole.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Rééducation' AND type = 'nursing';
UPDATE care_categories SET description = 'Surveillance des constantes vitales.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Surveillance' AND type = 'nursing';
UPDATE care_categories SET description = 'Confort et accompagnement palliatif au lit.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins palliatifs' AND type = 'nursing';
UPDATE care_categories SET description = 'Pose et entretien de cathéters vasculaires.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Pose de cathéter' AND type = 'nursing';
UPDATE care_categories SET description = 'Collecte d''urines pour analyse laboratoire.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement urinaire' AND type = 'nursing';
UPDATE care_categories SET description = 'TA et glycémie capillaire sous encadrement.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Mesure tension / glycémie' AND type = 'nursing';
UPDATE care_categories SET description = 'Aide aux repas et hydratation encadrée.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Aide aux repas' AND type = 'nursing';
UPDATE care_categories SET description = 'Surveillance infirmière nocturne au domicile.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Garde / surveillance nuit' AND type = 'nursing';
UPDATE care_categories SET description = 'Soins du siège stomique et appareillage.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de stomie' AND type = 'nursing';
UPDATE care_categories SET description = 'Sondes urinaires ou gastriques : soins IDE.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins de sonde' AND type = 'nursing';
UPDATE care_categories SET description = 'Chimiothérapie injectable sous surveillance.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Chimiothérapie à domicile' AND type = 'nursing';
UPDATE care_categories SET description = 'Conseils prévention et hygiène de vie.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan de prévention' AND type = 'nursing';
UPDATE care_categories SET description = 'Bilan santé et prévention personnalisée.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Mon bilan prévention' AND type = 'nursing';
UPDATE care_categories SET description = 'Épilation laser sur prescription médicale.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Epilation laser' AND type = 'nursing';
UPDATE care_categories SET description = 'Soins infirmiers centrés sur la personne.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins à la personne' AND type = 'nursing';
UPDATE care_categories SET description = 'Injections sous-cutanées sur prescription.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection sous-cutanée' AND type = 'nursing';
UPDATE care_categories SET description = 'Injections intramusculaires au domicile.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Injection intramusculaire' AND type = 'nursing';
UPDATE care_categories SET description = 'Pansements pour plaies complexes ou chroniques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement complexe' AND type = 'nursing';
UPDATE care_categories SET description = 'Préciser la demande si hors catalogue.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Autre' AND type = 'nursing';
UPDATE care_categories SET description = 'Pansements selon prescription infirmière.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Pansement-plaie' AND type = 'nursing';
UPDATE care_categories SET description = 'Retrait fils ou agrafes si cicatrisation OK.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Retrait de points / agrafes' AND type = 'nursing';
UPDATE care_categories SET description = 'Hygiène corporelle et confort au lit.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins d''hygiène' AND type = 'nursing';
UPDATE care_categories SET description = 'Aérosols et surveillance respiratoire.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Soins respiratoires' AND type = 'nursing';
UPDATE care_categories SET description = 'Sonde vésicale : pose, entretien, contrôle.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Sonde urinaire' AND type = 'nursing';
UPDATE care_categories SET description = 'Suivi glycémique et éducation thérapeutique.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Suivi diabète' AND type = 'nursing';
UPDATE care_categories SET description = 'Relais des soins après hospitalisation.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Suivi post-hospitalisation' AND type = 'nursing';
UPDATE care_categories SET description = 'Surveillance rapprochée des constantes.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Surveillance constante' AND type = 'nursing';
UPDATE care_categories SET description = 'Traitements injectables ou perfus prescrits.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Traitement' AND type = 'nursing';

-- ========== ANALYSES / LABORATOIRE (blood_test) ==========
UPDATE care_categories SET description = 'NFS et ionogramme : bilan biologique standard.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan complet' AND type = 'blood_test';
UPDATE care_categories SET description = 'Dosage glycémie capillaire ou veineuse.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Glycémie' AND type = 'blood_test';
UPDATE care_categories SET description = 'Cholestérol total et fractions lipoproteiques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Cholestérol' AND type = 'blood_test';
UPDATE care_categories SET description = 'Dosages vitaminiques selon indication.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Vitamines' AND type = 'blood_test';
UPDATE care_categories SET description = 'Dosages hormonaux sur prescription.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Hormones' AND type = 'blood_test';
UPDATE care_categories SET description = 'Triglycérides sériques à jeun ou ponctuel.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Triglycérides' AND type = 'blood_test';
UPDATE care_categories SET description = 'Numération-formule sanguine complète.', updated_at = CURRENT_TIMESTAMP WHERE name = 'NFS' AND type = 'blood_test';
UPDATE care_categories SET description = 'Protéine C réactive ultra-sensible.', updated_at = CURRENT_TIMESTAMP WHERE name = 'CRP' AND type = 'blood_test';
UPDATE care_categories SET description = 'Foie : transaminases, bilirubine, bilan.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan hépatique' AND type = 'blood_test';
UPDATE care_categories SET description = 'Créatinine, urée et fonction rénale.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan rénal' AND type = 'blood_test';
UPDATE care_categories SET description = 'Fer, ferritine et transferrine sériques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Fer / Ferritine' AND type = 'blood_test';
UPDATE care_categories SET description = 'Exploration complète du fer et réserves.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan martial' AND type = 'blood_test';
UPDATE care_categories SET description = 'TSH et hormones thyroïdiennes sériques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan thyroïdien' AND type = 'blood_test';
UPDATE care_categories SET description = 'Cholestérol, HDL, LDL et triglycérides.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan lipidique' AND type = 'blood_test';
UPDATE care_categories SET description = 'Glycémie à jeun : diabète ou suivi.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Glycémie à jeun' AND type = 'blood_test';
UPDATE care_categories SET description = 'HbA1c : équilibre glycémique récent.', updated_at = CURRENT_TIMESTAMP WHERE name = 'HbA1c' AND type = 'blood_test';
UPDATE care_categories SET description = 'Marqueurs biologiques de l''inflammation.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan inflammatoire' AND type = 'blood_test';
UPDATE care_categories SET description = 'Sérologies VIH et hépatites B et C.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Dépistage (VIH, hépatites)' AND type = 'blood_test';
UPDATE care_categories SET description = 'TP, TCA ou INR si anticoagulation.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan de coagulation' AND type = 'blood_test';
UPDATE care_categories SET description = 'Vitamines D, B12 et folates sériques.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan vitaminique' AND type = 'blood_test';
UPDATE care_categories SET description = 'Anticorps spécifiques selon contexte.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Sérologie' AND type = 'blood_test';
UPDATE care_categories SET description = 'Marqueurs tumoraux sur indication.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Marqueurs tumoraux' AND type = 'blood_test';
UPDATE care_categories SET description = 'Biologie avant intervention chirurgicale.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan pré-opératoire' AND type = 'blood_test';
UPDATE care_categories SET description = 'Examens demandés par l''anesthésiste.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan d''anesthésie' AND type = 'blood_test';
UPDATE care_categories SET description = 'Panel biologique selon prescription.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Bilan sanguin' AND type = 'blood_test';
UPDATE care_categories SET description = 'Sérologies ou PCR : infections ciblées.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Dépistages infections' AND type = 'blood_test';
UPDATE care_categories SET description = 'Parasites et microbiologie des selles.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Examen des selles' AND type = 'blood_test';
UPDATE care_categories SET description = 'Bandelette, ECBU ou cytologie urinaire.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Examen des urines' AND type = 'blood_test';
UPDATE care_categories SET description = 'Bêta-HCG et bilans liés à grossesse.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Grossesse' AND type = 'blood_test';
UPDATE care_categories SET description = 'Hémocultures et prélèvements microbiologie.', updated_at = CURRENT_TIMESTAMP WHERE name = 'Prélèvement bactériologique' AND type = 'blood_test';
