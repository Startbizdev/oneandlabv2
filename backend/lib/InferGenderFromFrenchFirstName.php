<?php

/**
 * Infère male / female à partir d'un prénom français (heuristique + listes courantes).
 * Retourne null si indécis (prénom absent des listes ou ambigu).
 */
class InferGenderFromFrenchFirstName
{
    /** Prénoms masculins courants (sans accents, minuscules) */
    private const MALE = [
        'abdel', 'adam', 'adrien', 'alexandre', 'alexis', 'alfred', 'alain', 'albert', 'andre', 'antoine',
        'arthur', 'augustin', 'axel', 'baptiste', 'benjamin', 'benoit', 'bernard', 'bertrand', 'bruno',
        'cyril', 'cedric', 'charles', 'christian', 'christophe', 'clement', 'damien', 'daniel', 'david',
        'denis', 'didier', 'dylan', 'edouard', 'eliot', 'emmanuel', 'eric', 'etienne', 'fabien', 'fabrice',
        'felix', 'florent', 'florian', 'francis', 'francois', 'frederic', 'gabriel', 'gael', 'georges',
        'gilles', 'gregory', 'guillaume', 'henri', 'hugo', 'ibrahim', 'isaac', 'jacques', 'jean', 'jeremie',
        'jeremy', 'jerome', 'joel', 'jonathan', 'jordan', 'joseph', 'jules', 'julien', 'kevin', 'laurent',
        'leo', 'leon', 'lionel', 'loic', 'louis', 'luc', 'lucas', 'ludovic', 'mael', 'marc', 'marcel',
        'matteo', 'matthieu', 'maurice', 'maxence', 'maxime', 'mehdi', 'michel', 'mohamed', 'mohammed',
        'morgan', 'moussa', 'nathan', 'nicolas', 'noah', 'noe', 'olivier', 'patrick', 'pascal', 'paul',
        'philippe', 'pierre', 'quentin', 'raphael', 'raymond', 'remi', 'renaud', 'richard', 'robert',
        'robin', 'roger', 'roland', 'romain', 'ronan', 'samuel', 'sebastien', 'serge', 'simon', 'stephane',
        'sylvain', 'theo', 'thibault', 'thibaut', 'thierry', 'thomas', 'timothee', 'tom', 'tristan',
        'valentin', 'vincent', 'victor', 'william', 'xavier', 'yann', 'yannick', 'yohan', 'yves', 'youssef',
        'zakaria',
    ];

    /** Prénoms féminins courants */
    private const FEMALE = [
        'adele', 'adeline', 'agathe', 'agnes', 'aicha', 'alexandra', 'alice', 'alicia', 'aline', 'amelie',
        'anais', 'angela', 'angelique', 'anna', 'anne', 'annie', 'audrey', 'aurelie', 'beatrice',
        'bernadette', 'brigitte', 'camille', 'carine', 'caroline', 'catherine', 'cecile', 'celine',
        'chantal', 'charlotte', 'chloe', 'christine', 'claire', 'clara', 'claudine', 'colette', 'coralie',
        'danielle', 'delphine', 'diane', 'edith', 'eliane', 'elise', 'elodie', 'elsa', 'emilie', 'emma',
        'estelle', 'esther', 'eva', 'eve', 'fabienne', 'fanny', 'fatima', 'florence', 'francine',
        'francoise', 'frederique', 'gabrielle', 'genevieve', 'geraldine', 'gisele', 'gwenaelle', 'helene',
        'hortense', 'ines', 'isabelle', 'jade', 'jennifer', 'jessica', 'joelle', 'josephine', 'julie',
        'juliette', 'justine', 'karine', 'laetitia', 'laura', 'lea', 'leila', 'leonie', 'liliane', 'lisa',
        'lise', 'lola', 'louise', 'lucie', 'ludivine', 'lydie', 'madeleine', 'manon', 'margot',
        'marguerite', 'marianne', 'marie', 'marine', 'marion', 'martine', 'maryse', 'mathilde', 'melanie',
        'melissa', 'michele', 'michelle', 'mireille', 'monique', 'morgane', 'muriel', 'murielle', 'nadine',
        'nadia', 'nathalie', 'nicole', 'noemie', 'oceane', 'odile', 'ophelie', 'patricia', 'pascale',
        'pauline', 'rachel', 'rebecca', 'regine', 'rose', 'roxane', 'sabine', 'sandra', 'sandrine',
        'sarah', 'severine', 'simone', 'solene', 'sophie', 'stephanie', 'suzanne', 'sylvie', 'sylviane',
        'therese', 'valerie', 'vanessa', 'veronique', 'virginie', 'viviane', 'yasmine', 'yvette', 'yvonne',
        'zoe',
    ];

    public static function infer(string $firstName): ?string
    {
        $token = trim((string) preg_split('/[\s\-]/u', $firstName, 2)[0]);
        if ($token === '') {
            return null;
        }
        $n = self::normalize($token);
        if ($n === '') {
            return null;
        }
        $maleSet = [];
        foreach (self::MALE as $m) {
            $maleSet[self::normalize($m)] = true;
        }
        $femaleSet = [];
        foreach (self::FEMALE as $f) {
            $femaleSet[self::normalize($f)] = true;
        }
        $inM = isset($maleSet[$n]);
        $inF = isset($femaleSet[$n]);
        if ($inM && !$inF) {
            return 'male';
        }
        if ($inF && !$inM) {
            return 'female';
        }
        return null;
    }

    private static function normalize(string $s): string
    {
        $s = mb_strtolower(trim($s), 'UTF-8');
        $map = [
            'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'ñ' => 'n', 'œ' => 'oe', 'æ' => 'ae',
        ];
        $s = strtr($s, $map);
        if (class_exists('Normalizer')) {
            $s = Normalizer::normalize($s, Normalizer::FORM_D);
            $s = preg_replace('/\pM/u', '', $s);
        }
        return $s;
    }
}
