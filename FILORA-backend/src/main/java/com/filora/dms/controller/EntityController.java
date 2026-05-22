package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.EntityDto;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.service.EntityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/entities")
@RequiredArgsConstructor
public class EntityController {

    private final EntityService entityService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EntityDto>>> getAllEntities() {
        List<EntityDto> entities = entityService.getAllEntities().stream()
                .map(EntityDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Entities retrieved successfully", entities));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<EntityDto>>> getActiveEntities() {
        List<EntityDto> entities = entityService.getActiveEntities().stream()
                .map(EntityDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Active entities retrieved successfully", entities));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EntityDto>> getEntityById(@PathVariable Integer id) {
        CompanyEntity company = entityService.getEntityById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Entity retrieved successfully", EntityDto.fromEntity(company)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EntityDto>> createEntity(
            @Valid @RequestBody EntityDto entityDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        CompanyEntity company = entityDto.toEntity();
        CompanyEntity created = entityService.createEntity(company, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Entity created successfully", EntityDto.fromEntity(created)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EntityDto>> updateEntity(
            @PathVariable Integer id,
            @Valid @RequestBody EntityDto entityDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        CompanyEntity company = entityDto.toEntity();
        CompanyEntity updated = entityService.updateEntity(id, company, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Entity updated successfully", EntityDto.fromEntity(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteEntity(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        entityService.deleteEntity(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Entity deleted successfully"));
    }
}
