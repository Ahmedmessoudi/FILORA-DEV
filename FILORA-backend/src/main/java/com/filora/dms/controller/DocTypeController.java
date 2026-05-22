package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.DocTypeDto;
import com.filora.dms.dto.EntityDto;
import com.filora.dms.entity.DocType;
import com.filora.dms.service.DocTypeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctypes")
@RequiredArgsConstructor
public class DocTypeController {

    private final DocTypeService docTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DocTypeDto>>> getAllDocTypes() {
        List<DocTypeDto> docTypes = docTypeService.getAllDocTypes().stream()
                .map(DocTypeDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Document types retrieved successfully", docTypes));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocTypeDto>> getDocTypeById(@PathVariable Integer id) {
        DocType docType = docTypeService.getDocTypeById(id)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Document type retrieved successfully", DocTypeDto.fromEntity(docType)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DocTypeDto>> createDocType(
            @Valid @RequestBody DocTypeDto docTypeDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        DocType docType = docTypeDto.toEntity();
        DocType created = docTypeService.createDocType(docType, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document type created successfully", DocTypeDto.fromEntity(created)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DocTypeDto>> updateDocType(
            @PathVariable Integer id,
            @Valid @RequestBody DocTypeDto docTypeDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        DocType docType = docTypeDto.toEntity();
        DocType updated = docTypeService.updateDocType(id, docType, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document type updated successfully", DocTypeDto.fromEntity(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDocType(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        docTypeService.deleteDocType(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document type deleted successfully"));
    }

    @GetMapping("/{id}/entities")
    public ResponseEntity<ApiResponse<List<EntityDto>>> getAssignedEntities(@PathVariable Integer id) {
        List<EntityDto> entities = docTypeService.getAssignedEntities(id).stream()
                .map(EntityDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Assigned entities retrieved successfully", entities));
    }

    @PostMapping("/{id}/assign/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignEntity(
            @PathVariable Integer id,
            @PathVariable Integer entityId,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        docTypeService.assignEntity(id, entityId, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Entity assigned to document type successfully"));
    }

    @PostMapping("/{id}/unassign/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unassignEntity(
            @PathVariable Integer id,
            @PathVariable Integer entityId,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        docTypeService.unassignEntity(id, entityId, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Entity unassigned from document type successfully"));
    }
}
