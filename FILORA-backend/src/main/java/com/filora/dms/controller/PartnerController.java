package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.PartnerDto;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.Partner;
import com.filora.dms.entity.PartnerType;
import com.filora.dms.service.PartnerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/partners")
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PartnerDto>>> getAllPartners() {
        List<PartnerDto> partners = partnerService.getAllPartners().stream()
                .map(partner -> {
                    List<Integer> assignedCompanyIds = partnerService.getAssignedEntities(partner.getId())
                            .stream().map(CompanyEntity::getId).collect(Collectors.toList());
                    List<Integer> partnerTypeIds = partnerService.getAssignedPartnerTypes(partner.getId())
                            .stream().map(PartnerType::getId).collect(Collectors.toList());
                    return PartnerDto.fromEntity(partner, assignedCompanyIds, partnerTypeIds);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Partners retrieved successfully", partners));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PartnerDto>> getPartnerById(@PathVariable Integer id) {
        Partner partner = partnerService.getPartnerById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + id));
        List<Integer> assignedCompanyIds = partnerService.getAssignedEntities(partner.getId())
                .stream().map(CompanyEntity::getId).collect(Collectors.toList());
        List<Integer> partnerTypeIds = partnerService.getAssignedPartnerTypes(partner.getId())
                .stream().map(PartnerType::getId).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Partner retrieved successfully", PartnerDto.fromEntity(partner, assignedCompanyIds, partnerTypeIds)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PartnerDto>> createPartner(
            @Valid @RequestBody PartnerDto dto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        Partner partner = dto.toEntity();
        Partner created = partnerService.createPartner(partner, dto.getAssignedCompanyIds(), dto.getPartnerTypeIds(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner created successfully", PartnerDto.fromEntity(created, dto.getAssignedCompanyIds(), dto.getPartnerTypeIds())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PartnerDto>> updatePartner(
            @PathVariable Integer id,
            @Valid @RequestBody PartnerDto dto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        Partner partner = dto.toEntity();
        Partner updated = partnerService.updatePartner(id, partner, dto.getAssignedCompanyIds(), dto.getPartnerTypeIds(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner updated successfully", PartnerDto.fromEntity(updated, dto.getAssignedCompanyIds(), dto.getPartnerTypeIds())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePartner(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        partnerService.deletePartner(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Partner deleted successfully"));
    }
}
