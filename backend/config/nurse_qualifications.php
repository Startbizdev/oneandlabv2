<?php

/**
 * Liste des diplômes et formations pour infirmiers libéraux (IDEL).
 * Utilisé pour le multi-select profil et l'affichage sur la page publique.
 * Sources : formations universitaires (DU/DIU), diplômes d'État spécialisés, formations reconnues.
 */
return [
    // Diplôme d'État de base
    'DEI' => 'Diplôme d\'État d\'Infirmier',

    // Diplômes d'État spécialisés
    'DE_IADE' => 'Diplôme d\'État d\'Infirmier Anesthésiste (IADE)',
    'DE_IBODE' => 'Diplôme d\'État d\'Infirmier de Bloc Opératoire (IBODE)',
    'DE_PUERICULTURE' => 'Diplôme d\'État de Puéricultrice / Puériculteur',

    // DU / DIU – Plaies, douleur, palliatif
    'DU_PLAIES' => 'DU Plaies et cicatrisation',
    'DIU_DOULEUR' => 'DIU Prise en charge de la douleur',
    'DIU_PALLIATIF' => 'DIU Soins palliatifs et accompagnement',

    // DU / DIU – Spécialités médicales
    'DU_DIU_CARDIO' => 'DU / DIU Cardiologie',
    'DU_PEDIATRIE' => 'DU Pédiatrie',
    'DU_DIABETO' => 'DU Diabétologie',
    'DU_PIED_DIABETIQUE' => 'DU Pied diabétique',
    'DU_PRELEVEMENTS' => 'DU Prélèvements et analyses',
    'DIU_PSYCHIATRIE' => 'DIU Soins en psychiatrie',
    'DU_GERIATRIE' => 'DU Gériatrie',
    'DU_URGENCES' => 'DU Médecine d\'urgence',
    'DU_REANIMATION' => 'DU Réanimation et soins intensifs',

    // DU / DIU – Autres champs courants
    'DU_ADDICTO' => 'DU / DIU Addictologie',
    'DU_DIU_CANCERO' => 'DU / DIU Cancérologie',
    'DU_ETP' => 'DU Éducation thérapeutique du patient',
    'DU_NUTRITION' => 'DU Nutrition clinique / Nutrition du sujet âgé',

    // Formations reconnues (hors DU/DIU)
    'FORMATION_PRADO' => 'Formation PRADO (suivi patients à domicile)',

    'AUTRE' => 'Autre formation',
];
