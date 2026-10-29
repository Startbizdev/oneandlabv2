<?php

declare(strict_types=1);

/** Stockage d'objets binaires par clé relative (ex. uploads/medical/{id}/{nom}.encrypted). */
interface ObjectStore
{
    public function put(string $key, string $bytes): void;

    /** null si l'objet n'existe pas */
    public function get(string $key): ?string;

    public function exists(string $key): bool;

    /** @return bool true si l'objet n'existe plus */
    public function delete(string $key): bool;
}
