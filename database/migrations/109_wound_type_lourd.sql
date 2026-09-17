-- Migration 109 : ajoute le type de plaie « Lourd » au catalogue Pansement-plaie.
-- Additive et rejouable : les choix existants restent intacts et « lourd » n'est jamais dupliqué.

UPDATE care_category_options AS cco
INNER JOIN care_categories AS cc ON cc.id = cco.care_category_id
SET cco.options = CASE
    WHEN JSON_SEARCH(
        COALESCE(cco.options, JSON_ARRAY()),
        'one',
        'lourd',
        NULL,
        '$[*].value'
    ) IS NULL
    THEN JSON_ARRAY_APPEND(
        COALESCE(cco.options, JSON_ARRAY()),
        '$',
        JSON_OBJECT('value', 'lourd', 'label', 'Lourd')
    )
    ELSE cco.options
END
WHERE cc.name = 'Pansement-plaie'
  AND cc.type = 'nursing'
  AND cco.option_key = 'wound_type';
