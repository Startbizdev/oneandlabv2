<?php

/**
 * Configuration du chiffrement HDS
 * KEK (Key Encryption Key) stockée en variable d'environnement
 */

return [
    'kek_hex' => $_ENV['BACKEND_KEK_HEX'] ?? '',
    'algorithm' => 'aes-256-gcm',
    'key_length' => 32, // 256 bits
];




