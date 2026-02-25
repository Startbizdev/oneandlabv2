<?php
/**
 * Remplit les champs publics (biographie, FAQ, ville) des profils infirmiers et labos
 * pour avoir des fiches à 100 % visibles sur /infirmiers et /laboratoires.
 *
 * Usage : php seed-public-profiles-full.php
 */

$envFile = __DIR__ . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

try {
    $config = require __DIR__ . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $hasCityPlain = $pdo->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'")->rowCount() > 0;

    $nurseBios = [
        "Infirmière libérale diplômée d'État, j'exerce à domicile depuis plus de 10 ans. Spécialisée dans les soins courants, les prises de sang et le suivi des patients fragiles, je m'engage à vous offrir un accompagnement personnalisé et une écoute bienveillante. Je me déplace dans un rayon de 15 km autour de mon cabinet pour vous garantir confort et sérénité.",
        "Infirmier libéral à Marseille, je propose des soins à domicile de qualité : pansements, injections, prélèvements sanguins, surveillance des traitements. Ancien cadre en milieu hospitalier, je privilégie une relation de confiance avec mes patients et leurs proches. Disponible du lundi au samedi sur rendez-vous.",
        "Professionnelle de santé à votre service à domicile. Soins infirmiers, prise de sang, surveillance des constantes, éducation thérapeutique. Je travaille en collaboration avec les médecins et les familles pour un suivi optimal. Secteur Marseille et environs.",
    ];

    $labBios = [
        "Laboratoire d'analyses médicales au cœur de Marseille. Nous réalisons tous types de prélèvements (sang, urines, PCR) et assurons des résultats rapides et fiables. Équipe de préleveurs expérimentés, déplacements à domicile sur rendez-vous. Agréé et contrôlé.",
        "Votre laboratoire de proximité pour les analyses de biologie médicale. Prélèvements à domicile dans tout le département, résultats sous 24 à 48 h pour la plupart des examens. Accueil personnalisé et conseils pour la préparation aux examens.",
        "Spécialistes des analyses biologiques et du prélèvement à domicile. Nous intervenons auprès des particuliers et des établissements de santé. Tarifs conventionnés, prise de rendez-vous en ligne simple et rapide.",
    ];

    $nurseFaq = [
        ['question' => "Quels sont vos horaires d'intervention ?", 'answer' => "Je suis disponible du lundi au vendredi de 8h à 18h, et le samedi matin de 9h à 13h sur rendez-vous."],
        ['question' => 'Intervenez-vous à domicile ?', 'answer' => "Oui, je me déplace à votre domicile pour tous les soins infirmiers et prélèvements."],
        ['question' => 'Acceptez-vous les nouveaux patients ?', 'answer' => "Oui, j'accepte les nouveaux patients. N'hésitez pas à prendre rendez-vous en ligne."],
        ['question' => 'Comment prendre rendez-vous ?', 'answer' => "Vous pouvez réserver directement sur cette plateforme ou par téléphone aux horaires d'ouverture."],
        ['question' => 'Quels types de soins proposez-vous ?', 'answer' => "Pansements, injections, prises de sang, perfusions, surveillance, éducation thérapeutique."],
    ];

    $labFaq = [
        ['question' => "Quels sont vos horaires d'ouverture ?", 'answer' => "Du lundi au vendredi 7h-19h, samedi 8h-12h. Prélèvements à domicile sur créneaux réservés."],
        ['question' => 'Proposez-vous des prélèvements à domicile ?', 'answer' => "Oui, nos préleveurs se déplacent à domicile sur rendez-vous dans notre zone de couverture."],
        ['question' => 'Faut-il être à jeun pour une prise de sang ?', 'answer' => "Cela dépend des analyses. Votre ordonnance ou le laboratoire vous indiquera la marche à suivre."],
        ['question' => 'Comment prendre rendez-vous ?', 'answer' => "En ligne sur cette page ou par téléphone. Confirmation par SMS ou email."],
        ['question' => "Quels types d'analyses proposez-vous ?", 'answer' => "Biologie courante, hématologie, biochimie, sérologie, PCR, examens spécialisés."],
    ];

    $cities = ['Marseille', 'Marseille', 'Aix-en-Provence', 'Marseille', 'Martigues', 'Aubagne'];

    $stmt = $pdo->query("SELECT id, role, public_slug FROM profiles WHERE role IN ('nurse', 'lab', 'subaccount') AND is_public_profile_enabled = TRUE AND public_slug IS NOT NULL AND public_slug != '' ORDER BY role, id");
    $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($profiles)) {
        echo "Aucun profil public (nurse / lab / subaccount) trouvé. Exécutez d'abord : php check-public-profiles.php --fix\n";
        exit(0);
    }

    echo "Remplissage des profils publics (biographie, FAQ, ville)\n\n";

    $nurseIdx = 0;
    $labIdx = 0;
    $cityIdx = 0;

    foreach ($profiles as $p) {
        $bio = null;
        $faqJson = null;
        $city = $cities[$cityIdx % count($cities)];
        $cityIdx++;

        if ($p['role'] === 'nurse') {
            $bio = $nurseBios[$nurseIdx % count($nurseBios)];
            $faqJson = json_encode($nurseFaq, JSON_UNESCAPED_UNICODE);
            $nurseIdx++;
        } else {
            $bio = $labBios[$labIdx % count($labBios)];
            $faqJson = json_encode($labFaq, JSON_UNESCAPED_UNICODE);
            $labIdx++;
        }

        $updates = ["biography = ?", "faq = ?"];
        $params = [$bio, $faqJson];
        if ($hasCityPlain) {
            $updates[] = "city_plain = ?";
            $params[] = $city;
        }
        $params[] = $p['id'];

        $sql = "UPDATE profiles SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $updated = $stmt->rowCount();

        if ($updated > 0) {
            echo "  [OK] {$p['id']} ({$p['role']}) {$p['public_slug']} → bio, FAQ, ville={$city}\n";
        }
    }

    echo "\nTerminé. Consultez /infirmiers et /laboratoires pour voir les fiches remplies.\n";
} catch (Exception $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    exit(1);
}
