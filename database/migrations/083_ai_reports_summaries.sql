-- Migration 083 : comptes rendus IA et résumés documents (Phase 3)

CREATE TABLE IF NOT EXISTS ai_summaries (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    medical_document_id CHAR(36) NULL,
    summary_type ENUM('document_ocr', 'document_analysis', 'conversation', 'report') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    title VARCHAR(255) NULL,
    summary_text MEDIUMTEXT NULL,
    structured_json JSON NULL,
    flags_json JSON NULL,
    ocr_text MEDIUMTEXT NULL,
    source_ai_audit_id CHAR(36) NULL,
    error_message VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_summaries_patient (patient_id, status),
    KEY idx_ai_summaries_doc (medical_document_id),
    KEY idx_ai_summaries_pending (status, created_at),
    CONSTRAINT fk_ai_summaries_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_summaries_doc FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_summaries_audit FOREIGN KEY (source_ai_audit_id) REFERENCES ai_audits(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_reports (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    appointment_id CHAR(36) NULL,
    created_by CHAR(36) NOT NULL,
    report_type ENUM(
        'consultation_summary', 'dossier_summary', 'lab_results_summary',
        'appointments_history_summary', 'ai_conversation_summary'
    ) NOT NULL,
    status ENUM('draft', 'validated', 'published', 'archived') NOT NULL DEFAULT 'draft',
    content_json JSON NULL,
    content_text MEDIUMTEXT NULL,
    source_ai_audit_id CHAR(36) NULL,
    published_medical_document_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_reports_patient (patient_id, status),
    KEY idx_ai_reports_creator (created_by, created_at),
    CONSTRAINT fk_ai_reports_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_reports_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_reports_creator FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_reports_audit FOREIGN KEY (source_ai_audit_id) REFERENCES ai_audits(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_reports_doc FOREIGN KEY (published_medical_document_id) REFERENCES medical_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
