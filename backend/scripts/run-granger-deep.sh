#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
ssh -o ConnectTimeout=15 -i "$KEY" "$HOST" "cd /var/www/oneandlab && php -r '
require \"backend/config/database.php\";
require \"backend/lib/Crypto.php\";
\$envFile = \".env\";
foreach (file(\$envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as \$line) {
  \$line = trim(\$line);
  if (\$line === \"\" || str_starts_with(\$line, \"#\") || !str_contains(\$line, \"=\")) continue;
  [\$k,\$v]=explode(\"=\", \$line, 2); \$_ENV[trim(\$k)]=trim(\$v);
}
\$c = require \"backend/config/database.php\";
\$pdo = new PDO(sprintf(\"mysql:host=%s;port=%d;dbname=%s;charset=%s\", \$c[\"host\"], \$c[\"port\"], \$c[\"database\"], \$c[\"charset\"]), \$c[\"username\"], \$c[\"password\"], \$c[\"options\"] ?? []);
\$crypto = new Crypto();
function d(\$c,\$e,\$k){ if(!\$e||!\$k)return\"\"; try{return \$c->decryptField(\$e,\$k)?:\"\";}catch(Throwable \$x){return\"\";}}

echo \"=== PRO Ron Azogui ===\\n\";
\$s=\$pdo->prepare(\"SELECT id, role, created_at FROM profiles WHERE id=?\"); \$s->execute([\"63e11def-6ac4-45d4-9b97-4f25efe5fd99\"]); print_r(\$s->fetch(PDO::FETCH_ASSOC));

echo \"\\n=== RDV créés par Ron (7 j) ===\\n\";
\$s=\$pdo->prepare(\"SELECT id,type,status,patient_id,scheduled_at,created_at,creation_batch_id FROM appointments WHERE created_by=? AND created_at>=DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC LIMIT 20\");
\$s->execute([\"63e11def-6ac4-45d4-9b97-4f25efe5fd99\"]);
print_r(\$s->fetchAll(PDO::FETCH_ASSOC));

echo \"\\n=== RDV globaux autour 15h aujourd hui ===\\n\";
\$s=\$pdo->query(\"SELECT id,type,status,patient_id,created_by,created_by_role,scheduled_at,created_at FROM appointments WHERE created_at BETWEEN \\\"2026-07-02 14:00:00\\\" AND \\\"2026-07-02 18:00:00\\\" ORDER BY created_at DESC LIMIT 30\");
print_r(\$s->fetchAll(PDO::FETCH_ASSOC));

echo \"\\n=== Recherche Granger dans form_data (7 j) ===\\n\";
\$s=\$pdo->query(\"SELECT id,patient_id,status,created_by,created_at,form_data_encrypted,form_data_dek FROM appointments WHERE created_at>=DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC LIMIT 120\");
\$hits=[];
while(\$r=\$s->fetch(PDO::FETCH_ASSOC)){
  \$fd=d(\$crypto,\$r[\"form_data_encrypted\"]??null,\$r[\"form_data_dek\"]??null);
  if(stripos(\$fd,\"granger\")!==false||stripos(\$fd,\"jean remi\")!==false||str_contains(preg_replace(\"/\\D/\",\"\",\$fd)??\"\",\"0626010728\")){
    \$hits[]=[\"id\"=>\$r[\"id\"],\"patient_id\"=>\$r[\"patient_id\"],\"status\"=>\$r[\"status\"],\"created_by\"=>\$r[\"created_by\"],\"created_at\"=>\$r[\"created_at\"],\"preview\"=>substr(\$fd,0,300)];
  }
}
print_r(\$hits);

echo \"\\n=== Patient access / relatives ===\\n\";
\$s=\$pdo->prepare(\"SELECT * FROM patient_professional_access WHERE patient_id=? OR professional_id=? LIMIT 10\");
\$s->execute([\"c4692000-2776-4d07-a234-e46c6936b58d\",\"63e11def-6ac4-45d4-9b97-4f25efe5fd99\"]);
print_r(\$s->fetchAll(PDO::FETCH_ASSOC));
'"
