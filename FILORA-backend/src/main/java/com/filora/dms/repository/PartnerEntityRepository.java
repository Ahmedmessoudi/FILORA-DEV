package com.filora.dms.repository;

import com.filora.dms.entity.PartnerEntity;
import com.filora.dms.entity.Partner;
import com.filora.dms.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerEntityRepository extends JpaRepository<PartnerEntity, Integer> {
    List<PartnerEntity> findAllByPartner(Partner partner);
    List<PartnerEntity> findAllByCompany(CompanyEntity company);
    Optional<PartnerEntity> findByPartnerAndCompany(Partner partner, CompanyEntity company);
    boolean existsByPartnerAndCompany(Partner partner, CompanyEntity company);
    void deleteByPartner(Partner partner);
    void deleteByCompany(CompanyEntity company);
}
