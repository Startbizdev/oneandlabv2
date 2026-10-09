<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiEmergencyDetector.php';

/**
 * Détecteur d'urgence déterministe, appliqué avant tout appel au modèle (chat, flux, voix).
 */
final class AiEmergencyDetectorTest extends TestCase
{
    /** @return array<string, array{0: string, 1: string}> */
    public static function emergencies(): array
    {
        return [
            'douleur poitrine en cours' => ["J'ai une douleur dans la poitrine depuis 20 minutes", 'cardiac'],
            'fautes de frappe' => ['j ai mal a la poitrinne ca serre', 'cardiac'],
            'thoracique mal orthographié' => ['douleur toracique intense', 'cardiac'],
            'aggravation' => ["j'ai de plus en plus mal à la poitrine", 'cardiac'],
            'réponse négative puis symptôme' => ["non, j'ai mal à la poitrine", 'cardiac'],
            'infarctus redouté' => ['je crois que je fais un infarctus', 'cardiac'],
            'épisode très récent' => ["J'ai eu une douleur thoracique il y a 10 minutes", 'cardiac'],
            'bouche de travers' => ["Mon père a la bouche de travers et n'arrive plus à parler", 'stroke'],
            'paralysie' => ['ma mère est paralysée du bras droit depuis ce matin', 'stroke'],
            'AVC' => ['je pense faire un AVC', 'stroke'],
            'ne respire plus' => ["je n'arrive plus à respirer", 'respiratory'],
            'étouffe' => ["j'étouffe", 'respiratory'],
            'suicide' => ['je veux me suicider', 'suicide'],
            'en finir' => ["j'ai envie d'en finir", 'suicide'],
            'plus envie de vivre' => ["je n'ai plus envie de vivre", 'suicide'],
            'hémorragie' => ['il saigne énormément', 'bleeding'],
            'vomit du sang' => ['je vomis du sang', 'bleeding'],
            'javel' => ['mon fils a bu de la javel', 'poisoning'],
            'surdosage' => ["j'ai pris toute la boîte de doliprane", 'poisoning'],
            'perte de connaissance' => ['elle a perdu connaissance', 'other'],
            'allergie grave' => ['sa gorge gonfle après une piqûre de guêpe', 'other'],
        ];
    }

    /** @return array<string, array{0: string}> */
    public static function nonEmergencies(): array
    {
        return [
            'question AVC' => ["c'est quoi un AVC ?"],
            'symptômes infarctus' => ["quels sont les symptômes d'un infarctus"],
            'négation' => ["je n'ai pas de douleur thoracique"],
            'aucune douleur' => ['aucune douleur à la poitrine'],
            'en finir avec un traitement' => ['je veux en finir avec ce traitement'],
            'expression' => ['ce boulot va me tuer'],
            'prise de sang' => ['je voudrais une prise de sang demain'],
            'parler en public' => ["j'ai du mal à parler en public"],
            'mal au cœur' => ["j'ai mal au coeur depuis ce matin"],
            'gencives' => ['mes gencives saignent beaucoup'],
            'intoxication légère passée' => ['intoxication alimentaire légère hier'],
            'stress' => ['je suis paralysé par le stress avant la prise de sang'],
            'antécédents soignant' => ["mon patient a des antécédents d'infarctus, il faut une injection"],
            'post AVC' => ['patient post AVC pour pansement'],
            'chaleur' => ["on étouffe de chaleur dans la salle d'attente"],
            'technique' => ['le site ne répond plus'],
            'salutation' => ['bonjour'],
        ];
    }

    /** @dataProvider emergencies */
    public function testDetectsEmergency(string $message, string $kind): void
    {
        $emergency = AiEmergencyDetector::detect($message);
        $this->assertNotNull($emergency, $message);
        $this->assertSame($kind, $emergency['kind']);
        $this->assertNotSame('', $emergency['title']);
        $this->assertNotSame('', $emergency['body']);
        $this->assertNotEmpty($emergency['actions']);
    }

    /** @dataProvider nonEmergencies */
    public function testIgnoresNonEmergency(string $message): void
    {
        $this->assertNull(AiEmergencyDetector::detect($message), $message);
    }

    /**
     * Cas signalé : un épisode ancien raconté au passé (« il y a 3 ans ») n'est pas traité comme une urgence.
     * Choix assumé pour éviter de bloquer la conversation sur un antécédent ; si le patient décrit des symptômes
     * actuels dans le même message, la détection s'applique (voir testDetectsEmergency).
     */
    public function testPastChestPainThreeYearsAgoIsNotAnEmergency(): void
    {
        $this->assertNull(AiEmergencyDetector::detect("J'ai eu une douleur thoracique il y a 3 ans"));
    }

    /** Toute évocation de suicide, même passée, déclenche l'orientation vers le 3114. */
    public function testPastSuicideAttemptStillPointsTo3114(): void
    {
        $emergency = AiEmergencyDetector::detect("j'ai fait une tentative de suicide il y a 5 ans");
        $this->assertSame('suicide', $emergency['kind'] ?? null);
        $this->assertContains('3114', array_column($emergency['actions'], 'phone'));
    }

    public function testMedicalEmergencyOffers15And112(): void
    {
        $emergency = AiEmergencyDetector::detect('je n\'arrive plus à respirer');
        $phones = array_column($emergency['actions'] ?? [], 'phone');
        $this->assertContains('15', $phones);
        $this->assertContains('112', $phones);
        foreach ($emergency['actions'] as $action) {
            $this->assertNotSame('', $action['label']);
        }
    }

    public function testResponseShapeMatchesContractForEveryKind(): void
    {
        foreach (AiEmergencyDetector::KINDS as $kind) {
            $response = AiEmergencyDetector::response($kind);
            $this->assertSame(['kind', 'title', 'body', 'actions'], array_keys($response), $kind);
            $this->assertSame($kind, $response['kind']);
            $this->assertNotSame('', AiEmergencyDetector::messageContent($response));
        }
    }
}
