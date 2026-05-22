package com.filora.dms.repository;

import com.filora.dms.entity.Partner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PartnerRepository extends JpaRepository<Partner, Integer> {
    Optional<Partner> findByCompanyName(String companyName);
    Optional<Partner> findByCompanyNameContainingIgnoreCase(String companyName);
    Optional<Partner> findByUniqueIdentifier(String uniqueIdentifier);
    Optional<Partner> findByEmail(String email);
}
