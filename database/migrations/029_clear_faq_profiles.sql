-- Migration 029 : Effacer les FAQ personnalisées (les pages publiques utilisent désormais une FAQ générée)
UPDATE profiles SET faq = NULL WHERE 1=1;
