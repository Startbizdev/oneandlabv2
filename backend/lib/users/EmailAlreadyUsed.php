<?php

declare(strict_types=1);

/** E-mail déjà porté par un autre compte (contrainte uq_profiles_email_hash). */
final class EmailAlreadyUsed extends DomainException
{
    public const CODE = 'EMAIL_ALREADY_USED';

    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('Un compte existe déjà avec cet email', 0, $previous);
    }
}
