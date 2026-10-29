<?php

declare(strict_types=1);

require_once __DIR__ . '/storage/MedicalFileStore.php';

/** Tracks only new files created by one booking attempt, never its source documents. */
final class BookingFileJournal
{
    private array $paths = [];

    public function commit(): void
    {
        $this->paths = [];
    }

    /** $path : chemin de document (medical_documents.file_path) pas encore écrit. */
    public function trackNewFile(string $path): void
    {
        if (MedicalFileStore::exists($path)) {
            throw new LogicException('Un fichier existant ne peut pas appartenir à une nouvelle tentative.');
        }
        $this->paths[] = $path;
    }

    public function rollback(PDO $db): void
    {
        if ($db->inTransaction()) throw new LogicException('Annuler la transaction avant les fichiers.');
        foreach (array_reverse($this->paths) as $path) {
            try {
                if (!MedicalFileStore::delete($path)) {
                    error_log('BookingFileJournal: nettoyage d’un fichier de tentative impossible');
                }
            } catch (Throwable $e) {
                error_log('BookingFileJournal: nettoyage d’un fichier de tentative impossible : ' . $e->getMessage());
            }
        }
        $this->paths = [];
    }
}
