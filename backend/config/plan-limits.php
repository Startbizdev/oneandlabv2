<?php

/**
 * Limites par plan d'abonnement (infirmiers et laboratoires).
 * Infirmiers : discovery = gratuit (20 km, 3 types de soins), nurse_pro = 100 km, illimité.
 * Lab : free = sans abo (0 préleveurs, 0 sous-comptes), lab_starter, lab_pro.
 */

return [
    'nurse' => [
        'discovery' => [
            'max_radius_km' => 20,
            'max_care_types' => 3,
            'max_appointments_per_month' => 10,
        ],
        'nurse_pro' => [
            'max_radius_km' => 100,
            'max_care_types' => null,
            'max_appointments_per_month' => null,
        ],
    ],
    'lab' => [
        'free' => [
            'max_preleveurs' => 0,
            'max_subaccounts' => 0,
        ],
        'lab_starter' => [
            'max_preleveurs' => 2,
            'max_subaccounts' => 0,
        ],
        'lab_pro' => [
            'max_preleveurs' => null,
            'max_subaccounts' => null,
        ],
    ],
];
