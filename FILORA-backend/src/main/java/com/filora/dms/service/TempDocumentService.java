package com.filora.dms.service;

import com.filora.dms.entity.TempDocument;
import com.filora.dms.entity.Document;
import com.filora.dms.entity.User;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.DocType;
import com.filora.dms.repository.TempDocumentRepository;
import com.filora.dms.repository.DocumentRepository;
import com.filora.dms.repository.CompanyEntityRepository;
import com.filora.dms.repository.DocTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TempDocumentService {

    private final TempDocumentRepository tempDocumentRepository;
    private final DocumentRepository documentRepository;
    private final CompanyEntityRepository companyEntityRepository;
    private final DocTypeRepository docTypeRepository;
    private final FileStorageService fileStorageService;
    private final OcrIntegrationService ocrIntegrationService;
    private final AuditService auditService;

    public List<TempDocument> getTempDocumentsByUser(User owner) {
        return tempDocumentRepository.findAllByOwner(owner);
    }

    public Page<TempDocument> getTempDocumentsByUser(User owner, Pageable pageable) {
        return tempDocumentRepository.findAllByOwner(owner, pageable);
    }

    public Optional<TempDocument> getTempDocumentById(Integer id) {
        return tempDocumentRepository.findById(id);
    }

    @Transactional
    public TempDocument uploadTempDocument(MultipartFile file, User owner, String ipAddress) throws IOException {
        String standardizedName = fileStorageService.saveTempFile(file, owner.getId());
        
        TempDocument tempDoc = TempDocument.builder()
                .filename(file.getOriginalFilename())
                .filePath(standardizedName)
                .fileSize((int) file.getSize())
                .fileType(getFileExtension(file.getOriginalFilename()))
                .mimeType(file.getContentType())
                .owner(owner)
                .createdAt(Instant.now())
                .build();

        TempDocument saved = tempDocumentRepository.save(tempDoc);

        Map<String, Object> details = new HashMap<>();
        details.put("filename", saved.getFilename());
        details.put("size_bytes", saved.getFileSize());
        auditService.log("UPLOAD_TEMP_DOCUMENT", "TempDocument", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deleteTempDocument(Integer id, String ipAddress) {
        TempDocument tempDoc = tempDocumentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Temp document not found: " + id));

        // Delete physical file
        fileStorageService.deleteFile(tempDoc.getFilePath());
        
        tempDocumentRepository.delete(tempDoc);

        Map<String, Object> details = new HashMap<>();
        details.put("filename", tempDoc.getFilename());
        auditService.log("DELETE_TEMP_DOCUMENT", "TempDocument", id, details, ipAddress);
    }

    @Transactional
    public Document promoteToDocument(Integer tempDocId, Integer companyId, Integer docTypeId, String ipAddress) throws IOException {
        TempDocument tempDoc = tempDocumentRepository.findById(tempDocId)
                .orElseThrow(() -> new IllegalArgumentException("Temp document not found: " + tempDocId));
        CompanyEntity company = companyEntityRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + companyId));
        DocType docType = docTypeRepository.findById(docTypeId)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + docTypeId));

        // Move physical file to target entity/doctype directory
        String targetPath = fileStorageService.promoteTempFile(tempDoc.getFilePath(), companyId, docTypeId);

        // Save new Document record
        Document doc = Document.builder()
                .filename(tempDoc.getFilename())
                .originalFilename(tempDoc.getFilename())
                .owner(tempDoc.getOwner())
                .company(company)
                .docType(docType)
                .filePath(targetPath)
                .fileSize(tempDoc.getFileSize())
                .fileType(tempDoc.getFileType())
                .mimeType(tempDoc.getMimeType())
                .ocrStatus("pending")
                .isInvoice(false)
                .isDeleted(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Document savedDoc = documentRepository.save(doc);

        // Delete the temp record
        tempDocumentRepository.delete(tempDoc);

        // Trigger OCR Integration asynchronously
        ocrIntegrationService.triggerOcrProcessing(savedDoc.getFilePath(), savedDoc.getId());

        Map<String, Object> details = new HashMap<>();
        details.put("filename", savedDoc.getFilename());
        details.put("company_name", company.getName());
        details.put("doctype_name", docType.getName());
        auditService.log("PROMOTE_TEMP_DOCUMENT", "Document", savedDoc.getId(), details, ipAddress);

        return savedDoc;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
