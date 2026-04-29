<?php

declare(strict_types=1);

/**
 * Résolution des membres d'équipe lab (lab, sous-comptes, préleveurs) pour les contrôles d'accès.
 * Sous-compte et préleveur : assigned_lab_id côté RDV pointe souvent vers le lab parent ;
 * il faut inclure profiles.lab_id dans la racine d'équipe.
 */
class LabTeamAccess
{
    /**
     * @return list<string>
     */
    public static function teamMemberIds(PDO $db, string $userId, string $role): array
    {
        $roots = [$userId];
        if ($role === 'subaccount' || $role === 'preleveur') {
            $plStmt = $db->prepare('SELECT lab_id FROM profiles WHERE id = ? LIMIT 1');
            $plStmt->execute([$userId]);
            $lr = $plStmt->fetch(PDO::FETCH_ASSOC);
            if (!empty($lr['lab_id'])) {
                $roots[] = (string) $lr['lab_id'];
            }
        }
        $roots = array_values(array_unique(array_filter($roots)));
        if ($roots === []) {
            return [];
        }
        $n = count($roots);
        $ph = implode(',', array_fill(0, $n, '?'));
        $params = array_merge($roots, $roots);
        $teamStmt = $db->prepare("SELECT id FROM profiles WHERE role IN ('lab', 'subaccount', 'preleveur') AND (id IN ($ph) OR lab_id IN ($ph))");
        $teamStmt->execute($params);

        return array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
    }
}
