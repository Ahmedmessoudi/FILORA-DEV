package com.filora.dms.service;

import com.filora.dms.entity.DocType;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.DatatypeEntity;
import com.filora.dms.repository.DocTypeRepository;
import com.filora.dms.repository.CompanyEntityRepository;
import com.filora.dms.repository.DatatypeEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocTypeService {

    private final DocTypeRepository docTypeRepository;
    private final CompanyEntityRepository companyEntityRepository;
    private final DatatypeEntityRepository datatypeEntityRepository;
    private final AuditService auditService;

    public List<DocType> getAllDocTypes() {
        return docTypeRepository.findAll();
    }

    public Optional<DocType> getDocTypeById(Integer id) {
        return docTypeRepository.findById(id);
    }

    @Transactional
    public DocType createDocType(DocType docType, String ipAddress) {
        docType.setCreatedAt(Instant.now());
        docType.setStatus(true);
        DocType saved = docTypeRepository.save(docType);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        auditService.log("CREATE_DOCTYPE", "DocType", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public DocType updateDocType(Integer id, DocType updated, String ipAddress) {
        DocType existing = docTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + id));

        existing.setName(updated.getName());
        existing.setStatus(updated.getStatus());

        DocType saved = docTypeRepository.save(existing);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("status", saved.getStatus());
        auditService.log("UPDATE_DOCTYPE", "DocType", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deleteDocType(Integer id, String ipAddress) {
        DocType docType = docTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + id));

        datatypeEntityRepository.deleteByDocType(docType);
        docTypeRepository.delete(docType);

        Map<String, Object> details = new HashMap<>();
        details.put("name", docType.getName());
        auditService.log("DELETE_DOCTYPE", "DocType", id, details, ipAddress);
    }

    @Transactional
    public void assignEntity(Integer docTypeId, Integer entityId, String ipAddress) {
        DocType docType = docTypeRepository.findById(docTypeId)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + docTypeId));
        CompanyEntity company = companyEntityRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + entityId));

        if (datatypeEntityRepository.existsByDocTypeAndCompany(docType, company)) {
            return; // already assigned
        }

        DatatypeEntity mapping = DatatypeEntity.builder()
                .docType(docType)
                .company(company)
                .createdAt(Instant.now())
                .build();
        datatypeEntityRepository.save(mapping);

        Map<String, Object> details = new HashMap<>();
        details.put("doctype_name", docType.getName());
        details.put("entity_name", company.getName());
        auditService.log("ASSIGN_DOCTYPE_ENTITY", "DocType", docTypeId, details, ipAddress);
    }

    @Transactional
    public void unassignEntity(Integer docTypeId, Integer entityId, String ipAddress) {
        DocType docType = docTypeRepository.findById(docTypeId)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + docTypeId));
        CompanyEntity company = companyEntityRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + entityId));

        Optional<DatatypeEntity> mapping = datatypeEntityRepository.findByDocTypeAndCompany(docType, company);
        if (mapping.isPresent()) {
            datatypeEntityRepository.delete(mapping.get());

            Map<String, Object> details = new HashMap<>();
            details.put("doctype_name", docType.getName());
            details.put("entity_name", company.getName());
            auditService.log("UNASSIGN_DOCTYPE_ENTITY", "DocType", docTypeId, details, ipAddress);
        }
    }

    public List<CompanyEntity> getAssignedEntities(Integer docTypeId) {
        DocType docType = docTypeRepository.findById(docTypeId)
                .orElseThrow(() -> new IllegalArgumentException("DocType not found: " + docTypeId));
        return datatypeEntityRepository.findAllByDocType(docType)
                .stream()
                .map(DatatypeEntity::getCompany)
                .collect(Collectors.toList());
    }
}
