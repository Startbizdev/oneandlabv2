<?php

declare(strict_types=1);

/**
 * Prompts d'analyse rigoureuse des bilans biologiques (valeur vs référence, ligne par ligne).
 */
final class LabResultAnalysisPrompt
{
    public const ANALYSIS_VERSION = 4;

    /**
     * @param array<string, mixed> $doc
     */
    public static function isLabDocument(array $doc, string $intentKind, string $ocrExcerpt = ''): bool
    {
        $documentType = strtolower(trim((string) ($doc['document_type'] ?? '')));
        if (in_array($documentType, ['resultats', 'lab_results'], true)) {
            return true;
        }
        if (in_array($intentKind, ['resultats', 'medical_other'], true)) {
            return true;
        }
        $haystack = strtolower(
            (string) ($doc['file_name'] ?? '') . ' ' . mb_substr($ocrExcerpt, 0, 6000),
        );

        return (bool) preg_match(
            '/bilan|analyse\s+sangu|h[ée]mogram|nfs\b|ionogram|crp|glyc[ée]mie|cholest[ée]rol|'
            . 'cr[ée]atinine|alat|asat|ggt|tsh|ferritine|h[ée]moglobine|plaquet|leucocyt|'
            . 'laboratoire|biolog|pr[ée]l[èe]vement\s+sangu/i',
            $haystack,
        );
    }

    public static function buildUserMessage(string $title, string $intentLabel, string $ocrExcerpt): string
    {
        return <<<PROMPT
Analyse ce {$intentLabel} « {$title} » pour un patient en français.

RÈGLES STRICTES — bilans biologiques :
1. NE TE FIE PAS aux conclusions du laboratoire (« tout est normal », « satisfaisant », « RAS », « aucune anomalie »). Vérifie CHAQUE paramètre numérique toi-même contre son intervalle de référence.
2. Parcours TOUTES les lignes du tableau / liste de résultats. Ne résume pas seulement les grandes familles sans avoir comparé chaque valeur.
3. Pour chaque paramètre avec une valeur chiffrée, compare explicitement :
   - nom du paramètre ;
   - valeur mesurée + unité ;
   - intervalle de référence tel qu'indiqué sur le document ;
   - verdict : dans les normes | au-dessus | en-dessous ;
   - calcul court si utile (ex. « ALAT 58 UI/L, réf. < 45 → au-dessus de la norme »).
4. SECTION OBLIGATOIRE en début de réponse — titre seul sur une ligne (texte brut, sans ** ni #) :
   Valeurs hors normes (vérification ligne par ligne)
   Puis liste avec tirets « - » pour chaque paramètre hors intervalle.
   - Si vraiment aucun : « Aucune valeur hors norme détectée après contrôle de chaque ligne. »
5. Ensuite : résumé vulgarisé par familles (NFS, foie, rein, lipides, métabolisme, thyroïde…) — une famille par paragraphe, séparés par une ligne vide (pas un seul bloc).
6. Pas de diagnostic. Pas de prescription. Pas de markdown (** # _). Texte brut lisible sur mobile uniquement.
7. En cas d'écart isolé ou multiple : rappeler qu'un professionnel interprète dans le contexte clinique.

Texte extrait du document :
{$ocrExcerpt}
PROMPT;
    }

    public static function buildVisionInstruction(string $intentLabel, string $fileName, string $kind): string
    {
        $kindLabel = $kind === 'pdf' ? 'document PDF' : 'photo';

        return "Tu analyses un {$kindLabel} de {$intentLabel} (« {$fileName} »). "
            . 'Extrais TOUTES les valeurs numériques visibles avec unités et intervalles de référence. '
            . 'Compare chaque valeur à sa référence — ignore les conclusions globales « tout est normal » du labo. '
            . 'Liste d\'abord les paramètres hors normes (ex. ALAT 58 si réf. < 45), puis un résumé patient en français. '
            . 'Pas de diagnostic.';
    }
}
