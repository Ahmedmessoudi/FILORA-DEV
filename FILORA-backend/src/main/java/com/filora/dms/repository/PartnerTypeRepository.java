package com.filora.dms.repository;

import com.filora.dms.entity.PartnerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PartnerTypeRepository extends JpaRepository<PartnerType, Integer> {
    Optional<PartnerType> findByName(String name);
}
