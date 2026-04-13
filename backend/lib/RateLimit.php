<?php

/**
 * Limitation simple par fenêtre glissante (fichier + flock), clé = bucket + identifiant (IP, user…).
 */
class RateLimit
{
    /**
     * @return bool true si la requête est autorisée, false si la limite est dépassée
     */
    public static function allow(string $bucket, string $key, int $maxPerWindow, int $windowSeconds): bool
    {
        $dir = __DIR__ . '/../uploads/rate-limit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $path = $dir . '/' . hash('sha256', $bucket . ':' . $key) . '.json';
        $now = time();
        $fp = @fopen($path, 'c+');
        if ($fp === false) {
            return true;
        }
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            return true;
        }
        rewind($fp);
        $raw = stream_get_contents($fp);
        $data = $raw ? json_decode($raw, true) : null;
        if (!is_array($data) || !isset($data['start'], $data['count'])) {
            $data = ['start' => $now, 'count' => 0];
        }
        $start = (int) $data['start'];
        $count = (int) $data['count'];
        if ($now - $start >= $windowSeconds) {
            $data = ['start' => $now, 'count' => 1];
        } elseif ($count >= $maxPerWindow) {
            flock($fp, LOCK_UN);
            fclose($fp);
            return false;
        } else {
            $data['count'] = $count + 1;
        }
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
}
