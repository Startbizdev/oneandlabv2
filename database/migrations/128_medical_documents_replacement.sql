-- Migration 128 : remplacement d'une ordonnance. L'ancienne est archivée (jamais supprimée) : elle pointe vers
-- la nouvelle et disparaît des listes, mais reste lisible par son id.
-- Si la nouvelle ordonnance est supprimée par son auteur, l'ancienne redevient visible (SET NULL).
ALTER TABLE medical_documents
    ADD COLUMN replaced_by_document_id CHAR(36) NULL,
    ADD COLUMN replaced_at DATETIME NULL,
    ADD COLUMN replaced_by_user_id CHAR(36) NULL,
    ADD KEY idx_medical_documents_replaced_by (replaced_by_document_id),
    ADD CONSTRAINT fk_medical_documents_replaced_by FOREIGN KEY (replaced_by_document_id) REFERENCES medical_documents(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_medical_documents_replaced_by_user FOREIGN KEY (replaced_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
