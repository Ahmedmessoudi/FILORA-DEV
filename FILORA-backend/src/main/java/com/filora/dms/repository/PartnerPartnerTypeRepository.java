package com.filora.dms.repository;

import com.filora.dms.entity.PartnerPartnerType;
import com.filora.dms.entity.Partner;
import com.filora.dms.entity.PartnerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerPartnerTypeRepository extends JpaRepository<PartnerPartnerType, Integer> {
    List<PartnerPartnerType> findAllByPartner(Partner partner);
    List<PartnerPartnerType> findAllByPartnerType(PartnerType partnerType);
    Optional<PartnerPartnerType> findByPartnerAndPartnerType(Partner partner, PartnerType partnerType);
    boolean existsByPartnerAndPartnerType(Partner partner, PartnerType partnerType);
    void deleteByPartner(Partner partner);
}
