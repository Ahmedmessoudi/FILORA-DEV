package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.DocumentDto;
import com.filora.dms.dto.TempDocumentDto;
import com.filora.dms.entity.Document;
import com.filora.dms.entity.TempDocument;
import com.filora.dms.entity.User;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.service.TempDocumentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/temp-documents")
@RequiredArgsConstructor
public class TempDocumentController {

    private final TempDocumentService tempDocumentService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TempDocumentDto>>> getMyTempDocuments(Principal principal) {
        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));
        List<TempDocumentDto> docs = tempDocumentService.getTempDocumentsByUser(currentUser).stream()
                .map(TempDocumentDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Temp documents retrieved successfully", docs));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<TempDocumentDto>> uploadTempDocument(
            @RequestParam("file") MultipartFile file,
            Principal principal,
            HttpServletRequest request) throws IOException {
        
        String ipAddress = request.getRemoteAddr();
        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));

        TempDocument tempDoc = tempDocumentService.uploadTempDocument(file, currentUser, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Temporary document uploaded successfully", TempDocumentDto.fromEntity(tempDoc)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTempDocument(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        tempDocumentService.deleteTempDocument(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Temporary document deleted successfully"));
    }

    @PostMapping("/{id}/promote")
    public ResponseEntity<ApiResponse<DocumentDto>> promoteToDocument(
            @PathVariable Integer id,
            @RequestParam Integer companyId,
            @RequestParam Integer docTypeId,
            HttpServletRequest request) throws IOException {
        
        String ipAddress = request.getRemoteAddr();
        Document doc = tempDocumentService.promoteToDocument(id, companyId, docTypeId, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Document promoted and queued for OCR processing", DocumentDto.fromEntity(doc)));
    }
}
