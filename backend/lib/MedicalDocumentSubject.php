<?php

declare(strict_types=1);

/** A patient's account can manage several people; their documents must stay separate. */
final class MedicalDocumentSubject
{
    public static function matches(?string $sourcePatient, ?string $sourceRelative, ?string $targetPatient, ?string $targetRelative): bool
    {
        return $sourcePatient !== null && $sourcePatient !== ''
            && $sourcePatient === $targetPatient
            && ($sourceRelative ?? '') === ($targetRelative ?? '');
    }
}
