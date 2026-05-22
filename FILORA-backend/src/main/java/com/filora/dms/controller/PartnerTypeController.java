package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.PartnerTypeDto;
import com.filora.dms.entity.PartnerType;
import com.filora.dms.service.PartnerTypeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/partner-types")
@RequiredArgsConstructor
public class PartnerTypeController {

    private final PartnerTypeService partnerTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PartnerTypeDto>>> getAllPartnerTypes() {
        List<PartnerTypeDto> types = partnerTypeService.getAllPartnerTypes().stream()
                .map(PartnerTypeDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Partner types retrieved successfully", types));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PartnerTypeDto>> getPartnerTypeById(@PathVariable Integer id) {
        PartnerType type = partnerTypeService.getPartnerTypeById(id)
                .orElseThrow(() -> new IllegalArgumentException("PartnerType not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Partner type retrieved successfully", PartnerTypeDto.fromEntity(type)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PartnerTypeDto>> createPartnerType(
            @Valid @RequestBody PartnerTypeDto dto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        PartnerType created = partnerTypeService.createPartnerType(dto.toEntity(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner type created successfully", PartnerTypeDto.fromEntity(created)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PartnerTypeDto>> updatePartnerType(
            @PathVariable Integer id,
            @Valid @RequestBody PartnerTypeDto dto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        PartnerType updated = partnerTypeService.updatePartnerType(id, dto.toEntity(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner type updated successfully", PartnerTypeDto.fromEntity(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePartnerType(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        partnerTypeService.deletePartnerType(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner type deleted successfully"));
    }
}
