package com.filora.dms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filora.dms.entity.Document;
import com.filora.dms.entity.User;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.DocType;
import com.filora.dms.entity.Partner;
import com.filora.dms.repository.DocumentRepository;
import com.filora.dms.repository.CompanyEntityRepository;
import com.filora.dms.repository.DocTypeRepository;
import com.filora.dms.repository.PartnerRepository;
import com.filora.dms.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final CompanyEntityRepository companyEntityRepository;
    private final DocTypeRepository docTypeRepository;
    private final PartnerRepository partnerRepository;
    private final FileStorageService fileStorageService;
    private final OcrIntegrationService ocrIntegrationService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Page<Document> searchDocuments(Integer companyId, Integer docTypeId, String query, Pageable pageable) {
        return documentRepository.searchDocuments(companyId, docTypeId, query, pageable);
    }

    public Page<Document> searchDocumentsAcrossCompanies(List<Integer> companyIds, String query, Pageable pageable) {
        if (companyIds == null || companyIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return documentRepository.searchDocumentsAcrossCompanies(companyIds, query, pageable);
    }

    public Page<Document> searchDocumentsAll(String query, Pageable pageable) {
        return documentRepository.searchDocumentsAll(query, pageable);
    }

    public Optional<Document> getDocumentById(Integer id) {
        return documentRepository.findById(id).filter(doc -> !doc.getIsDeleted());
    }

    public Document getDocumentOrThrow(Integer id) {
        return getDocumentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));
    }

    @Transactional
    public Document uploadDocumentDirectly(MultipartFile file, Integer companyId, Integer docTypeId, User owner, String ipAddress) throws IOException {
        CompanyEntity company = companyEntityRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + companyId));
        DocType docType = docTypeRepository.findById(docTypeId)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + docTypeId));

        String targetPath = fileStorageService.saveDocumentFile(file, companyId, docTypeId);

        Document doc = Document.builder()
                .filename(file.getOriginalFilename())
                .originalFilename(file.getOriginalFilename())
                .owner(owner)
                .company(company)
                .docType(docType)
                .filePath(targetPath)
                .fileSize((int) file.getSize())
                .fileType(getFileExtension(file.getOriginalFilename()))
                .mimeType(file.getContentType())
                .ocrStatus("pending")
                .isInvoice(false)
                .isDeleted(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Document savedDoc = documentRepository.save(doc);

        // Trigger OCR processing asynchronously
        ocrIntegrationService.triggerOcrProcessing(savedDoc.getFilePath(), savedDoc.getId());

        Map<String, Object> details = new HashMap<>();
        details.put("filename", savedDoc.getFilename());
        details.put("company_name", company.getName());
        details.put("doctype_name", docType.getName());
        auditService.log("UPLOAD_DOCUMENT", "Document", savedDoc.getId(), details, ipAddress);

        return savedDoc;
    }

    @Transactional
    public Document updateDocument(Integer id, Document updated, Integer partnerId, String ipAddress) {
        Document existing = getDocumentOrThrow(id);

        if (updated.getFilename() != null && !updated.getFilename().isBlank()) {
            existing.setFilename(updated.getFilename());
        }
        if (updated.getOriginalFilename() != null && !updated.getOriginalFilename().isBlank()) {
            existing.setOriginalFilename(updated.getOriginalFilename());
        }
        if (updated.getIsInvoice() != null) {
            existing.setIsInvoice(updated.getIsInvoice());
            if (!updated.getIsInvoice()) {
                existing.setInvoiceNumber(null);
                existing.setPartner(null);
                existing.setTotalHt(null);
                existing.setTvaRate(null);
                existing.setTva(null);
                existing.setTotalTtc(null);
                existing.setCurrency(null);
                existing.setExtractedData(null);
            }
        }
        if (updated.getInvoiceNumber() != null) existing.setInvoiceNumber(updated.getInvoiceNumber());
        if (updated.getDocumentDate() != null) existing.setDocumentDate(updated.getDocumentDate());
        if (updated.getDueDate() != null) existing.setDueDate(updated.getDueDate());
        if (updated.getTotalHt() != null) existing.setTotalHt(updated.getTotalHt());
        if (updated.getTvaRate() != null) existing.setTvaRate(updated.getTvaRate());
        if (updated.getTva() != null) existing.setTva(updated.getTva());
        if (updated.getTotalTtc() != null) existing.setTotalTtc(updated.getTotalTtc());
        if (updated.getCurrency() != null && !updated.getCurrency().isBlank()) existing.setCurrency(updated.getCurrency());
        if (updated.getOcrStatus() != null && !updated.getOcrStatus().isBlank()) existing.setOcrStatus(updated.getOcrStatus());
        if (updated.getExtractedText() != null) existing.setExtractedText(updated.getExtractedText());
        if (updated.getExtractedData() != null) existing.setExtractedData(updated.getExtractedData());
        if (updated.getRapport() != null) existing.setRapport(updated.getRapport());

        if (partnerId != null) {
            Partner partner = partnerRepository.findById(partnerId)
                    .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
            existing.setPartner(partner);
        } else {
            existing.setPartner(null);
        }

        Document saved = documentRepository.save(existing);

        Map<String, Object> details = new HashMap<>();
        details.put("filename", saved.getFilename());
        auditService.log("UPDATE_DOCUMENT", "Document", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deleteDocument(Integer id, String ipAddress) {
        Document doc = getDocumentOrThrow(id);
        doc.setIsDeleted(true);
        documentRepository.save(doc);

        Map<String, Object> details = new HashMap<>();
        details.put("filename", doc.getFilename());
        auditService.log("SOFT_DELETE_DOCUMENT", "Document", id, details, ipAddress);
    }

    @Transactional
    public void bulkDeleteDocuments(List<Integer> ids, String ipAddress) {
        for (Integer id : ids) {
            deleteDocument(id, ipAddress);
        }
    }

    @Transactional
    public void reprocessOcr(Integer id, String ipAddress) {
        Document doc = getDocumentOrThrow(id);
        doc.setOcrStatus("pending");
        documentRepository.save(doc);

        ocrIntegrationService.triggerOcrProcessing(doc.getFilePath(), doc.getId());

        Map<String, Object> details = new HashMap<>();
        details.put("filename", doc.getFilename());
        auditService.log("REPROCESS_OCR", "Document", id, details, ipAddress);
    }

    @Transactional
    public void shareDocumentByEmail(
            Integer id,
            String recipientEmail,
            String subject,
            String body,
            boolean attachOriginal,
            boolean attachOcrText,
            boolean attachOcrJson,
            String ipAddress) throws IOException {

        Document doc = getDocumentOrThrow(id);
        List<File> attachments = new ArrayList<>();

        // 1. Attach Original File
        if (attachOriginal && doc.getFilePath() != null) {
            File originalFile = new File(doc.getFilePath());
            if (originalFile.exists()) {
                attachments.add(originalFile);
            }
        }

        // 2. Attach OCR Text
        if (attachOcrText && doc.getExtractedText() != null) {
            File txtFile = Files.createTempFile("ocr-" + doc.getId(), ".txt").toFile();
            txtFile.deleteOnExit();
            try (FileWriter writer = new FileWriter(txtFile)) {
                writer.write(doc.getExtractedText());
            }
            attachments.add(txtFile);
        }

        // 3. Attach OCR JSON
        if (attachOcrJson && doc.getExtractedData() != null) {
            File jsonFile = Files.createTempFile("ocr-data-" + doc.getId(), ".json").toFile();
            jsonFile.deleteOnExit();
            try (FileWriter writer = new FileWriter(jsonFile)) {
                writer.write(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(doc.getExtractedData()));
            }
            attachments.add(jsonFile);
        }

        emailService.sendEmail(recipientEmail, subject, body, attachments);

        Map<String, Object> details = new HashMap<>();
        details.put("recipient", recipientEmail);
        details.put("filename", doc.getFilename());
        auditService.log("SHARE_DOCUMENT_BY_EMAIL", "Document", id, details, ipAddress);
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
