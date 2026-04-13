<?php
/**
 * Taille max des fichiers uploadés (documents médicaux, dossiers patients).
 *
 * Sur le serveur, aligner aussi :
 * - nginx : client_max_body_size 25m; (ou supérieur) dans le server/location PHP
 * - PHP : upload_max_filesize >= 25M, post_max_size >= 28M (légèrement > au fichier max)
 */
if (!defined('ONEANDLAB_MAX_UPLOAD_BYTES')) {
    define('ONEANDLAB_MAX_UPLOAD_BYTES', 25 * 1024 * 1024);
}
