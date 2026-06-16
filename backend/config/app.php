<?php

return [
    'site_url' => rtrim($_ENV['NUXT_PUBLIC_SITE_URL'] ?? $_ENV['SITE_URL'] ?? 'https://cary.bio', '/'),
];
