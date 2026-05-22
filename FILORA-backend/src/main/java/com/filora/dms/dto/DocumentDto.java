package com.filora.dms.dto;

import com.filora.dms.entity.Document;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDto {
    private Integer id;
    private String originalFilename;
    private String filename;
    private Integer ownerId;
    private String ownerName;
    private Integer companyId;
    private String companyName;
    private Integer docTypeId;
    private String docTypeName;
    private Integer partnerId;
    private String partnerName;
    private String filePath;
    private Integer fileSize;
    private String fileType;
    private String mimeType;

    // OCR Fields
    private String ocrStatus;
    private String ocrText;
    private String extractedText;
    private Map<String, Object> extractedData;
    private String rapport;

    // Invoice Fields
    private Boolean isInvoice;
    private String invoiceNumber;
    private LocalDate documentDate;
    private LocalDate dueDate;
    private BigDecimal totalHt;
    private BigDecimal tvaRate;
    private BigDecimal tva;
    private BigDecimal totalTtc;
    private String currency;

    private Boolean isDeleted;
    private Instant createdAt;
    private Instant updatedAt;

    public static DocumentDto fromEntity(Document doc) {
        if (doc == null) return null;
        return DocumentDto.builder()
                .id(doc.getId())
                .originalFilename(doc.getOriginalFilename())
                .filename(doc.getFilename())
                .ownerId(doc.getOwner() != null ? doc.getOwner().getId() : null)
                .ownerName(doc.getOwner() != null ? doc.getOwner().getUsername() : null)
                .companyId(doc.getCompany() != null ? doc.getCompany().getId() : null)
                .companyName(doc.getCompany() != null ? doc.getCompany().getName() : null)
                .docTypeId(doc.getDocType() != null ? doc.getDocType().getId() : null)
                .docTypeName(doc.getDocType() != null ? doc.getDocType().getName() : null)
                .partnerId(doc.getPartner() != null ? doc.getPartner().getId() : null)
                .partnerName(doc.getPartner() != null ? doc.getPartner().getCompanyName() : null)
                .filePath(doc.getFilePath())
                .fileSize(doc.getFileSize())
                .fileType(doc.getFileType())
                .mimeType(doc.getMimeType())
                .ocrStatus(doc.getOcrStatus())
                .ocrText(doc.getOcrText())
                .extractedText(doc.getExtractedText())
                .extractedData(doc.getExtractedData())
                .rapport(doc.getRapport())
                .isInvoice(doc.getIsInvoice())
                .invoiceNumber(doc.getInvoiceNumber())
                .documentDate(doc.getDocumentDate())
                .dueDate(doc.getDueDate())
                .totalHt(doc.getTotalHt())
                .tvaRate(doc.getTvaRate())
                .tva(doc.getTva())
                .totalTtc(doc.getTotalTtc())
                .currency(doc.getCurrency())
                .isDeleted(doc.getIsDeleted())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }
}
