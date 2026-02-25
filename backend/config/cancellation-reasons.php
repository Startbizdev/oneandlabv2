<?php

/**
 * Raisons d'annulation d'un RDV par un pro (lab, sous-compte, infirmier, préleveur).
 * Même liste pour tous. Commentaire obligatoire pour toutes les raisons.
 * Photo optionnelle uniquement pour wrong_address et access_impossible.
 */

return [
    'reschedule' => 'Modification du rendez-vous (report, autre créneau)',
    'patient_unreachable' => 'Patient injoignable (ne répond pas au téléphone)',
    'patient_absent' => 'Patient absent au moment du passage',
    'wrong_address' => 'Adresse incorrecte ou introuvable',
    'patient_request' => 'Demande du patient',
    'access_impossible' => 'Accès impossible (domicile inaccessible, refus d\'accès)',
    'booking_error' => 'Erreur de prise de rendez-vous (doublon, mauvaise date)',
    'other' => 'Autre',
];
