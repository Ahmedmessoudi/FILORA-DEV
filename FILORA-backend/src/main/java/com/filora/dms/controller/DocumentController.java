package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.DocumentDto;
import com.filora.dms.entity.Document;
import com.filora.dms.entity.User;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.service.DocumentService;
import com.filora.dms.service.UserService;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<DocumentDto>>> searchDocuments(
            @RequestParam Integer companyId,
            @RequestParam(required = false) Integer docTypeId,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        // Use a simple pageable without applying Sort because the native query defines
        // the ORDER BY on the actual DB column (`created_at`). If we pass a Sort,
        // Spring Data appends property-based ORDER BY (e.g. d.createdAt) which fails
        // against the PostgreSQL column naming. Keep pageable unsorted and let the
        // native query control ordering.
        Pageable pageable = PageRequest.of(page, size);

        Page<DocumentDto> docs = documentService.searchDocuments(companyId, docTypeId, query, pageable)
                .map(DocumentDto::fromEntity);

        return ResponseEntity.ok(ApiResponse.success("Documents retrieved successfully", docs));
    }

    @GetMapping("/search/global")
    public ResponseEntity<ApiResponse<Page<DocumentDto>>> globalSearchDocuments(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal) {

        Pageable pageable = PageRequest.of(page, size);

        // Resolve current user and their assigned entities
        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));

        List<CompanyEntity> assigned = userService.getAssignedEntities(currentUser.getId());
        List<Integer> companyIds = assigned.stream().map(CompanyEntity::getId).collect(Collectors.toList());

        Page<DocumentDto> docs;
        if (companyIds.isEmpty()) {
            // If user has no assigned entities, allow admins/superusers to search globally
            String role = currentUser.getRole() != null ? currentUser.getRole().toLowerCase() : "";
            boolean isAdmin = role.contains("admin") || role.contains("superuser") || role.contains("super_admin") || role.contains("superadmin");
            if (isAdmin) {
                docs = documentService.searchDocumentsAll(query, pageable).map(DocumentDto::fromEntity);
            } else {
                docs = Page.<com.filora.dms.entity.Document>empty(pageable).map(DocumentDto::fromEntity);
            }
        } else {
            docs = documentService.searchDocumentsAcrossCompanies(companyIds, query, pageable)
                    .map(DocumentDto::fromEntity);
        }

        return ResponseEntity.ok(ApiResponse.success("Documents retrieved successfully", docs));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> getDocumentById(@PathVariable Integer id) {
        Document doc = documentService.getDocumentOrThrow(id);
        return ResponseEntity.ok(ApiResponse.success("Document retrieved successfully", DocumentDto.fromEntity(doc)));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<DocumentDto>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("companyId") Integer companyId,
            @RequestParam("docTypeId") Integer docTypeId,
            Principal principal,
            HttpServletRequest request) throws IOException {

        String ipAddress = request.getRemoteAddr();
        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));

        Document doc = documentService.uploadDocumentDirectly(file, companyId, docTypeId, currentUser, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document uploaded successfully", DocumentDto.fromEntity(doc)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> updateDocument(
            @PathVariable Integer id,
            @RequestBody DocumentDto dto,
            @RequestParam(required = false) Integer partnerId,
            HttpServletRequest request) {

        String ipAddress = request.getRemoteAddr();
        
        // Map DTO fields back to Document entity
        Document doc = Document.builder()
            .filename(dto.getFilename())
                .originalFilename(dto.getOriginalFilename())
                .isInvoice(dto.getIsInvoice())
                .invoiceNumber(dto.getInvoiceNumber())
                .documentDate(dto.getDocumentDate())
                .dueDate(dto.getDueDate())
                .totalHt(dto.getTotalHt())
                .tvaRate(dto.getTvaRate())
                .tva(dto.getTva())
                .totalTtc(dto.getTotalTtc())
                .currency(dto.getCurrency())
                .ocrStatus(dto.getOcrStatus())
                .extractedText(dto.getExtractedText())
                .extractedData(dto.getExtractedData())
                .rapport(dto.getRapport())
                .build();

        Document updated = documentService.updateDocument(id, doc, partnerId, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document updated successfully", DocumentDto.fromEntity(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable Integer id,
            HttpServletRequest request) {

        String ipAddress = request.getRemoteAddr();
        documentService.deleteDocument(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully"));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Void>> bulkDeleteDocuments(
            @RequestBody List<Integer> ids,
            HttpServletRequest request) {

        String ipAddress = request.getRemoteAddr();
        documentService.bulkDeleteDocuments(ids, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Documents deleted successfully"));
    }

    @PostMapping("/{id}/reprocess-ocr")
    public ResponseEntity<ApiResponse<Void>> reprocessOcr(
            @PathVariable Integer id,
            HttpServletRequest request) {

        String ipAddress = request.getRemoteAddr();
        documentService.reprocessOcr(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("OCR reprocessing queued"));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<ApiResponse<Void>> shareDocument(
            @PathVariable Integer id,
            @RequestParam String recipientEmail,
            @RequestParam(defaultValue = "Partage de document — Filora DMS") String subject,
            @RequestParam(defaultValue = "Veuillez trouver ci-joint le document demandé.") String body,
            @RequestParam(defaultValue = "true") boolean attachOriginal,
            @RequestParam(defaultValue = "false") boolean attachOcrText,
            @RequestParam(defaultValue = "false") boolean attachOcrJson,
            HttpServletRequest request) throws IOException {

        String ipAddress = request.getRemoteAddr();
        documentService.shareDocumentByEmail(id, recipientEmail, subject, body, attachOriginal, attachOcrText, attachOcrJson, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document shared successfully via email"));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewDocument(@PathVariable Integer id) throws IOException {
        Document doc = documentService.getDocumentOrThrow(id);
        Resource fileResource = fileStorageService.loadFileAsResource(doc.getFilePath());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getMimeType() != null ? doc.getMimeType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(fileResource);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Integer id) throws IOException {
        Document doc = documentService.getDocumentOrThrow(id);
        Resource fileResource = fileStorageService.loadFileAsResource(doc.getFilePath());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getMimeType() != null ? doc.getMimeType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(fileResource);
    }
}
