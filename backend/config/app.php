<?php

return [
    'site_url' => rtrim($_ENV['NUXT_PUBLIC_SITE_URL'] ?? $_ENV['SITE_URL'] ?? 'https://cary.bio', '/'),
    // Boîte du support : formulaire de contact et demandes de suppression de compte.
    'contact_email' => 'contact@cary.bio',
];
