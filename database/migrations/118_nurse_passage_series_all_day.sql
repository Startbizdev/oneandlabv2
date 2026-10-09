-- Migration 118 : créneau « Toute la journée » (all_day) pour les séries de passages infirmier

ALTER TABLE nurse_passage_series
    MODIFY time_slot ENUM(
        'morning',
        'noon',
        'afternoon',
        'evening',
        'night',
        'custom',
        'all_day'
    ) NOT NULL DEFAULT 'morning';
