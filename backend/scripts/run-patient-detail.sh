#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
PID="${1:-7b83cb70-b19d-4228-94d2-2d8e47d905d8}"
ssh -o ConnectTimeout=15 -i "$KEY" "$HOST" "cd /var/www/oneandlab && php -r '
require \"backend/config/database.php\";
require \"backend/models/User.php\";
foreach (file(\".env\", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as \$line) {
  \$line=trim(\$line); if(\$line===\"\"||str_starts_with(\$line,\"#\")||!str_contains(\$line,\"=\"))continue;
  [\$k,\$v]=explode(\"=\", \$line, 2); \$_ENV[trim(\$k)]=trim(\$v);
}
\$config=require \"backend/config/database.php\";
\$pdo=new PDO(sprintf(\"mysql:host=%s;port=%d;dbname=%s;charset=%s\", \$config[\"host\"], \$config[\"port\"], \$config[\"database\"], \$config[\"charset\"]), \$config[\"username\"], \$config[\"password\"], \$config[\"options\"]??[]);
\$u=new User();
\$p=\$u->getById(\"'"$PID"'\", \"f25ca089-beed-0839-c30f-973648f2ca71\", \"super_admin\");
\$s=\$pdo->prepare(\"SELECT id,type,status,assigned_to,assigned_nurse_id,assigned_lab_id,created_by,created_by_role,scheduled_at,created_at,creation_batch_id FROM appointments WHERE patient_id=? ORDER BY scheduled_at\");
\$s->execute([\"'"$PID"'\"]);
\$appts=\$s->fetchAll(PDO::FETCH_ASSOC);
\$a=\$pdo->prepare(\"SELECT patient_id,professional_id,source,appointment_id,created_at FROM patient_professional_access WHERE patient_id=?\");
\$a->execute([\"'"$PID"'\"]);
echo json_encode([\"profile\"=>[\"id\"=>\$p[\"id\"]??null,\"name\"=>trim((\$p[\"first_name\"]??\"\").\" \".(\$p[\"last_name\"]??\"\")),\"phone\"=>\$p[\"phone\"]??null,\"email\"=>\$p[\"email\"]??null,\"birth_date\"=>\$p[\"birth_date\"]??null,\"address\"=>\$p[\"address\"]??null,\"created_at\"=>\$p[\"created_at\"]??null,\"created_by\"=>\$p[\"created_by\"]??null],\"appointments\"=>\$appts,\"professional_access\"=>\$a->fetchAll(PDO::FETCH_ASSOC)], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
'"
