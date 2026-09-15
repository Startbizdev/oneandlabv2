<?php

declare(strict_types=1);

/** Tracks only new files created by one booking attempt, never its source documents. */
final class BookingFileJournal
{
    private array $paths = [];

    public function commit(): void
    {
        $this->paths = [];
    }

    public function trackNewFile(string $path): void
    {
        if (file_exists($path) || is_link($path)) {
            throw new LogicException('Un fichier existant ne peut pas appartenir à une nouvelle tentative.');
        }
        $directory = realpath(dirname($path));
        if ($directory === false) throw new LogicException('Répertoire de document absent');
        $this->paths[] = $directory . DIRECTORY_SEPARATOR . basename($path);
    }

    public function rollback(PDO $db): void
    {
        if ($db->inTransaction()) throw new LogicException('Annuler la transaction avant les fichiers.');
        foreach (array_reverse($this->paths) as $path) {
            if (is_file($path) && !unlink($path)) {
                error_log('BookingFileJournal: nettoyage d’un fichier de tentative impossible');
            }
            // This directory was generated for one file; never delete a nonempty directory.
            if (is_dir(dirname($path)) && count(scandir(dirname($path)) ?: []) === 2) {
                rmdir(dirname($path));
            }
        }
        $this->paths = [];
    }
}
