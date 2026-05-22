package com.filora.dms.repository;

import com.filora.dms.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyEntityRepository extends JpaRepository<CompanyEntity, Integer> {
    Optional<CompanyEntity> findByName(String name);
    Optional<CompanyEntity> findByEmail(String email);
    List<CompanyEntity> findAllByIsActive(Boolean isActive);
    
    @Query("SELECT COUNT(c) FROM CompanyEntity c WHERE c.isActive = true")
    long countActiveEntities();
}
