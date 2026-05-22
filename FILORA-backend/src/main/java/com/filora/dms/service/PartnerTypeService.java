package com.filora.dms.service;

import com.filora.dms.entity.PartnerType;
import com.filora.dms.repository.PartnerTypeRepository;
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
public class PartnerTypeService {

    private final PartnerTypeRepository partnerTypeRepository;
    private final com.filora.dms.repository.PartnerPartnerTypeRepository partnerPartnerTypeRepository;
    private final AuditService auditService;

    public List<PartnerType> getAllPartnerTypes() {
        return partnerTypeRepository.findAll();
    }

    public Optional<PartnerType> getPartnerTypeById(Integer id) {
        return partnerTypeRepository.findById(id);
    }

    @Transactional
    public PartnerType createPartnerType(PartnerType type, String ipAddress) {
        type.setCreatedAt(Instant.now());
        type.setStatus(true);
        PartnerType saved = partnerTypeRepository.save(type);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        auditService.log("CREATE_PARTNER_TYPE", "PartnerType", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public PartnerType updatePartnerType(Integer id, PartnerType updated, String ipAddress) {
        PartnerType existing = partnerTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("PartnerType not found: " + id));

        existing.setName(updated.getName());
        existing.setStatus(updated.getStatus());

        PartnerType saved = partnerTypeRepository.save(existing);

        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("status", saved.getStatus());
        auditService.log("UPDATE_PARTNER_TYPE", "PartnerType", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deletePartnerType(Integer id, String ipAddress) {
        PartnerType type = partnerTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("PartnerType not found: " + id));

        partnerPartnerTypeRepository.deleteByPartnerType(type);
        partnerTypeRepository.delete(type);

        Map<String, Object> details = new HashMap<>();
        details.put("name", type.getName());
        auditService.log("DELETE_PARTNER_TYPE", "PartnerType", id, details, ipAddress);
    }
}
