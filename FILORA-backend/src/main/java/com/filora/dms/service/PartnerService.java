package com.filora.dms.service;

import com.filora.dms.entity.*;
import com.filora.dms.repository.*;
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
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final CompanyEntityRepository companyEntityRepository;
    private final PartnerTypeRepository partnerTypeRepository;
    private final PartnerEntityRepository partnerEntityRepository;
    private final PartnerPartnerTypeRepository partnerPartnerTypeRepository;
    private final AuditService auditService;

    public List<Partner> getAllPartners() {
        return partnerRepository.findAll();
    }

    public Optional<Partner> getPartnerById(Integer id) {
        return partnerRepository.findById(id);
    }

    @Transactional
    public Partner createPartner(Partner partner, List<Integer> companyIds, List<Integer> partnerTypeIds, String ipAddress) {
        partner.setCreatedAt(Instant.now());
        partner.setUpdatedAt(Instant.now());
        partner.setIsActive(true);
        
        Partner saved = partnerRepository.save(partner);

        // Save Entity Assignments
        if (companyIds != null) {
            for (Integer cid : companyIds) {
                CompanyEntity company = companyEntityRepository.findById(cid)
                        .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + cid));
                PartnerEntity pe = PartnerEntity.builder().partner(saved).company(company).build();
                partnerEntityRepository.save(pe);
            }
        }

        // Save Partner Type Assignments
        if (partnerTypeIds != null) {
            for (Integer ptid : partnerTypeIds) {
                PartnerType type = partnerTypeRepository.findById(ptid)
                        .orElseThrow(() -> new IllegalArgumentException("PartnerType not found: " + ptid));
                PartnerPartnerType ppt = PartnerPartnerType.builder().partner(saved).partnerType(type).build();
                partnerPartnerTypeRepository.save(ppt);
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("company_name", saved.getCompanyName());
        details.put("identifier", saved.getUniqueIdentifier());
        auditService.log("CREATE_PARTNER", "Partner", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public Partner updatePartner(Integer id, Partner updated, List<Integer> companyIds, List<Integer> partnerTypeIds, String ipAddress) {
        Partner existing = partnerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + id));

        existing.setCompanyName(updated.getCompanyName());
        existing.setTradeName(updated.getTradeName());
        existing.setUniqueIdentifier(updated.getUniqueIdentifier());
        existing.setMailingAddress(updated.getMailingAddress());
        existing.setBillingAddress(updated.getBillingAddress());
        existing.setPhone1(updated.getPhone1());
        existing.setPhone2(updated.getPhone2());
        existing.setPhone3(updated.getPhone3());
        existing.setEmail(updated.getEmail());
        existing.setPaymentTerms(updated.getPaymentTerms());
        existing.setBillingTerms(updated.getBillingTerms());
        existing.setBankAccountNumber(updated.getBankAccountNumber());
        existing.setBankName(updated.getBankName());
        existing.setNotes(updated.getNotes());
        existing.setIsActive(updated.getIsActive());
        existing.setUpdatedAt(Instant.now());

        Partner saved = partnerRepository.save(existing);

        // Sync Entity Assignments
        partnerEntityRepository.deleteByPartner(saved);
        if (companyIds != null) {
            for (Integer cid : companyIds) {
                CompanyEntity company = companyEntityRepository.findById(cid)
                        .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + cid));
                PartnerEntity pe = PartnerEntity.builder().partner(saved).company(company).build();
                partnerEntityRepository.save(pe);
            }
        }

        // Sync Partner Type Assignments
        partnerPartnerTypeRepository.deleteByPartner(saved);
        if (partnerTypeIds != null) {
            for (Integer ptid : partnerTypeIds) {
                PartnerType type = partnerTypeRepository.findById(ptid)
                        .orElseThrow(() -> new IllegalArgumentException("PartnerType not found: " + ptid));
                PartnerPartnerType ppt = PartnerPartnerType.builder().partner(saved).partnerType(type).build();
                partnerPartnerTypeRepository.save(ppt);
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("company_name", saved.getCompanyName());
        details.put("is_active", saved.getIsActive());
        auditService.log("UPDATE_PARTNER", "Partner", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deletePartner(Integer id, String ipAddress) {
        Partner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + id));

        partnerEntityRepository.deleteByPartner(partner);
        partnerPartnerTypeRepository.deleteByPartner(partner);
        partnerRepository.delete(partner);

        Map<String, Object> details = new HashMap<>();
        details.put("company_name", partner.getCompanyName());
        auditService.log("DELETE_PARTNER", "Partner", id, details, ipAddress);
    }

    public List<CompanyEntity> getAssignedEntities(Integer partnerId) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
        return partnerEntityRepository.findAllByPartner(partner)
                .stream()
                .map(PartnerEntity::getCompany)
                .collect(Collectors.toList());
    }

    public List<PartnerType> getAssignedPartnerTypes(Integer partnerId) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
        return partnerPartnerTypeRepository.findAllByPartner(partner)
                .stream()
                .map(PartnerPartnerType::getPartnerType)
                .collect(Collectors.toList());
    }
}
