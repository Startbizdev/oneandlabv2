<?php

declare(strict_types=1);

final class PatientUrgencyConfig
{
    /** Montant TTC affiché en centimes pour le supplément Horaire VIP RDV patient (lab). */
    public const URGENCY_AMOUNT_CENTS = 890;

    public const CHECKOUT_METADATA_KIND = 'patient_booking_urgency';

    public static function productName(): string
    {
        return 'Supplément Horaire VIP — prise de sang à domicile';
    }
}
