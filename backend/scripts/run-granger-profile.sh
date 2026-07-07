#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
ssh -o ConnectTimeout=15 -i "$KEY" "$HOST" "cd /var/www/oneandlab && php -r '
require \"backend/config/database.php\";
require \"backend/lib/Crypto.php\";
require \"backend/models/User.php\";
foreach (file(\".env\", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as \$line) {
  \$line=trim(\$line); if(\$line===\"\"||str_starts_with(\$line,\"#\")||!str_contains(\$line,\"=\"))continue;
  [\$k,\$v]=explode(\"=\", \$line, 2); \$_ENV[trim(\$k)]=trim(\$v);
}
\$u=new User();
\$p=\$u->getById(\"c4692000-2776-4d07-a234-e46c6936b58d\", \"63e11def-6ac4-45d4-9b97-4f25efe5fd99\", \"pro\");
echo json_encode([
  \"first_name\"=>\$p[\"first_name\"]??null,
  \"last_name\"=>\$p[\"last_name\"]??null,
  \"phone\"=>\$p[\"phone\"]??null,
  \"email\"=>\$p[\"email\"]??null,
  \"birth_date\"=>\$p[\"birth_date\"]??null,
  \"gender\"=>\$p[\"gender\"]??null,
  \"address\"=>\$p[\"address\"]??null,
  \"created_at\"=>\$p[\"created_at\"]??null,
  \"created_by\"=>\$p[\"created_by\"]??null,
], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
'"
