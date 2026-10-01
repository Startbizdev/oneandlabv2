<?php

declare(strict_types=1);

final class PatientDeletionDenied extends DomainException
{
    public function __construct(string $message, public readonly int $httpStatus, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}
