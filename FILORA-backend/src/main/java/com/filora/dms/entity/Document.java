package com.filora.dms.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "documents", indexes = {
    @Index(name = "idx_documents_company", columnList = "company_id"),
    @Index(name = "idx_documents_doctype", columnList = "doctype_id"),
    @Index(name = "idx_documents_owner", columnList = "owner_id"),
    @Index(name = "idx_documents_is_invoice", columnList = "is_invoice"),
    @Index(name = "idx_documents_ocr_status", columnList = "ocr_status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(nullable = false)
    private String filename;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private CompanyEntity company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctype_id")
    private DocType docType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id")
    private Partner partner;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size")
    @Builder.Default
    private Integer fileSize = 0;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    // ─── OCR Fields ───
    @Column(name = "ocr_status", length = 20)
    @Builder.Default
    private String ocrStatus = "pending";

    @Column(name = "ocr_text", columnDefinition = "TEXT")
    private String ocrText;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Type(JsonType.class)
    @Column(name = "extracted_data", columnDefinition = "jsonb")
    private Map<String, Object> extractedData;

    @Column(columnDefinition = "TEXT")
    private String rapport;

    // ─── Invoice Fields ───
    @Column(name = "is_invoice")
    @Builder.Default
    private Boolean isInvoice = false;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "document_date")
    private LocalDate documentDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "total_ht", precision = 12, scale = 2)
    private BigDecimal totalHt;

    @Column(name = "tva_rate", precision = 5, scale = 2)
    private BigDecimal tvaRate;

    @Column(precision = 12, scale = 2)
    private BigDecimal tva;

    @Column(name = "total_ttc", precision = 12, scale = 2)
    private BigDecimal totalTtc;

    @Column(length = 10)
    private String currency;

    // ─── Soft Delete & Timestamps ───
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
