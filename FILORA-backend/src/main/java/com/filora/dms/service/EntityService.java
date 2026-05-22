package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.User;
import com.filora.dms.repository.CompanyEntityRepository;
import com.filora.dms.repository.DatatypeEntityRepository;
import com.filora.dms.repository.PartnerEntityRepository;
import com.filora.dms.repository.UserEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EntityService {

    private final CompanyEntityRepository companyEntityRepository;
    private final UserEntityRepository userEntityRepository;
    private final DatatypeEntityRepository datatypeEntityRepository;
    private final PartnerEntityRepository partnerEntityRepository;
    private final AppProperties appProperties;
    private final AuditService auditService;

    public List<CompanyEntity> getAllEntities() {
        return companyEntityRepository.findAll();
    }

    public List<CompanyEntity> getActiveEntities() {
        return companyEntityRepository.findAllByIsActive(true);
    }

    public Optional<CompanyEntity> getEntityById(Integer id) {
        return companyEntityRepository.findById(id);
    }

    @Transactional
    public CompanyEntity createEntity(CompanyEntity company, String ipAddress) {
        long activeCount = companyEntityRepository.countActiveEntities();
        if (activeCount >= appProperties.getSystem().getMaxEntities()) {
            throw new IllegalStateException("Maximum limit of active entities reached (" + 
                    appProperties.getSystem().getMaxEntities() + ").");
        }

        company.setCreatedAt(Instant.now());
        company.setIsActive(true);
        CompanyEntity saved = companyEntityRepository.save(company);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("email", saved.getEmail());
        auditService.log("CREATE_ENTITY", "CompanyEntity", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public CompanyEntity updateEntity(Integer id, CompanyEntity updated, String ipAddress) {
        CompanyEntity existing = companyEntityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + id));

        existing.setName(updated.getName());
        existing.setAddress(updated.getAddress());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setDescription(updated.getDescription());
        existing.setIsActive(updated.getIsActive());

        CompanyEntity saved = companyEntityRepository.save(existing);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("is_active", saved.getIsActive());
        auditService.log("UPDATE_ENTITY", "CompanyEntity", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deleteEntity(Integer id, String ipAddress) {
        CompanyEntity company = companyEntityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + id));

        userEntityRepository.deleteByCompany(company);
        datatypeEntityRepository.deleteByCompany(company);
        partnerEntityRepository.deleteByCompany(company);
        companyEntityRepository.delete(company);

        Map<String, Object> details = new HashMap<>();
        details.put("name", company.getName());
        auditService.log("DELETE_ENTITY", "CompanyEntity", id, details, ipAddress);
    }
}
