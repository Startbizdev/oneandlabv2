-- Migration 044 : Seed des sous-choix pour les catégories existantes (Analyses + Soins à domicile)
-- Insère les options par nom de catégorie (name + type)

-- ========== ANALYSES (blood_test) ==========

-- Bilan sanguin : type_bilan + a_jeun
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type_bilan', 'Type de bilan', 'select',
  '[{"value":"bilan_complet","label":"Bilan complet"},{"value":"nfs","label":"NFS"},{"value":"glycemie","label":"Glycémie"},{"value":"bilan_lipidique","label":"Bilan lipidique"},{"value":"bilan_thyroidien","label":"Bilan thyroïdien"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Bilan sanguin' AND type = 'blood_test' LIMIT 1;

INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'a_jeun', 'À jeun', 'select',
  '[{"value":"oui","label":"Oui"},{"value":"non","label":"Non"}]',
  0, 2 FROM care_categories WHERE name = 'Bilan sanguin' AND type = 'blood_test' LIMIT 1;

-- Dépistages infections
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"vih","label":"VIH"},{"value":"hepatites_b_c","label":"Hépatites B/C"},{"value":"serologie_autre","label":"Sérologie autre"}]',
  0, 1 FROM care_categories WHERE name = 'Dépistages infections' AND type = 'blood_test' LIMIT 1;

-- Examen des selles
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"coproculture","label":"Coproculture"},{"value":"parasitologie","label":"Parasitologie"},{"value":"recherche_sang_occulte","label":"Recherche sang occulte"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Examen des selles' AND type = 'blood_test' LIMIT 1;

-- Examen des urines
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"ecbu","label":"ECBU"},{"value":"bandelette","label":"Bandelette"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Examen des urines' AND type = 'blood_test' LIMIT 1;

-- Grossesse
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"suivi_grossesse","label":"Suivi grossesse"},{"value":"dosage_hcg","label":"Dosage HCG"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Grossesse' AND type = 'blood_test' LIMIT 1;

-- Prélèvement bactériologique
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"gorge","label":"Gorge"},{"value":"urines","label":"Urines"},{"value":"crachats","label":"Crachats"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Prélèvement bactériologique' AND type = 'blood_test' LIMIT 1;

-- ========== SOINS À DOMICILE (nursing) ==========

-- Autre
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'preciser', 'Précisez', 'text', NULL, 1, 1 FROM care_categories WHERE name = 'Autre' AND type = 'nursing' LIMIT 1;

-- Injection
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"intramusculaire","label":"Intramusculaire"},{"value":"sous_cutanee","label":"Sous-cutanée"},{"value":"intradermique","label":"Intradermique"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Injection' AND type = 'nursing' LIMIT 1;

-- Pansement-plaie
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'wound_type', 'Type de plaie', 'select',
  '[{"value":"simple","label":"Simple"},{"value":"complexe","label":"Complexe"},{"value":"chronique","label":"Chronique"},{"value":"escarre","label":"Escarre"},{"value":"brulure","label":"Brûlure"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Pansement-plaie' AND type = 'nursing' LIMIT 1;

INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'location', 'Localisation', 'select',
  '[{"value":"jambe","label":"Jambe"},{"value":"pied","label":"Pied"},{"value":"abdomen","label":"Abdomen"},{"value":"dos","label":"Dos"},{"value":"autre","label":"Autre"}]',
  0, 2 FROM care_categories WHERE name = 'Pansement-plaie' AND type = 'nursing' LIMIT 1;

-- Perfusion
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"pose","label":"Pose"},{"value":"surveillance","label":"Surveillance"},{"value":"chimiotherapie","label":"Chimiothérapie"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Perfusion' AND type = 'nursing' LIMIT 1;

-- Retrait de points / agrafes
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"points","label":"Points de suture"},{"value":"agrafes","label":"Agrafes"},{"value":"les_deux","label":"Les deux"}]',
  0, 1 FROM care_categories WHERE name = 'Retrait de points / agrafes' AND type = 'nursing' LIMIT 1;

INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'location', 'Localisation', 'select',
  '[{"value":"visage","label":"Visage"},{"value":"membre","label":"Membre"},{"value":"tronc","label":"Tronc"},{"value":"autre","label":"Autre"}]',
  0, 2 FROM care_categories WHERE name = 'Retrait de points / agrafes' AND type = 'nursing' LIMIT 1;

-- Soins d'hygiène
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"toilette_complete","label":"Toilette complète"},{"value":"toilette_partielle","label":"Toilette partielle"},{"value":"aide_habillage","label":"Aide à l''habillage"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Soins d''hygiène' AND type = 'nursing' LIMIT 1;

-- Soins de stomie
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"colostomie","label":"Colostomie"},{"value":"ileostomie","label":"Iléostomie"},{"value":"urostomie","label":"Urostomie"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Soins de stomie' AND type = 'nursing' LIMIT 1;

-- Soins palliatifs
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"accompagnement","label":"Accompagnement"},{"value":"soins_confort","label":"Soins de confort"},{"value":"surveillance","label":"Surveillance"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Soins palliatifs' AND type = 'nursing' LIMIT 1;

-- Soins respiratoires
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"aerosol","label":"Aérosolthérapie"},{"value":"oxygenotherapie","label":"Oxygénothérapie"},{"value":"kine_respi","label":"Kiné respiratoire"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Soins respiratoires' AND type = 'nursing' LIMIT 1;

-- Sonde urinaire
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"pose","label":"Pose"},{"value":"soins","label":"Soins de sonde"},{"value":"ablation","label":"Ablation"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Sonde urinaire' AND type = 'nursing' LIMIT 1;

-- Suivi diabète
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"surveillance_glycemie","label":"Surveillance glycémie"},{"value":"injection_insuline","label":"Injection insuline"},{"value":"education","label":"Éducation thérapeutique"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Suivi diabète' AND type = 'nursing' LIMIT 1;

-- Suivi post-hospitalisation
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"pansements","label":"Pansements"},{"value":"injections","label":"Injections"},{"value":"surveillance","label":"Surveillance"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Suivi post-hospitalisation' AND type = 'nursing' LIMIT 1;

-- Surveillance constante
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"tension_pouls","label":"Tension/pouls"},{"value":"temperature","label":"Température"},{"value":"glycemie","label":"Glycémie"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Surveillance constante' AND type = 'nursing' LIMIT 1;

-- Traitement
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"distribution","label":"Distribution médicaments"},{"value":"surveillance_prise","label":"Surveillance de la prise"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Traitement' AND type = 'nursing' LIMIT 1;

-- Vaccination
INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
SELECT UUID(), id, 'type', 'Type', 'select',
  '[{"value":"rappel","label":"Rappel vaccinal"},{"value":"grippe","label":"Grippe"},{"value":"covid19","label":"Covid-19"},{"value":"autre","label":"Autre"}]',
  0, 1 FROM care_categories WHERE name = 'Vaccination' AND type = 'nursing' LIMIT 1;
