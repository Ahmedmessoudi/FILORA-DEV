package com.filora.dms.repository;

import com.filora.dms.entity.DatatypeEntity;
import com.filora.dms.entity.DocType;
import com.filora.dms.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DatatypeEntityRepository extends JpaRepository<DatatypeEntity, Integer> {
    List<DatatypeEntity> findAllByDocType(DocType docType);
    List<DatatypeEntity> findAllByCompany(CompanyEntity company);
    Optional<DatatypeEntity> findByDocTypeAndCompany(DocType docType, CompanyEntity company);
    boolean existsByDocTypeAndCompany(DocType docType, CompanyEntity company);
    void deleteByDocType(DocType docType);
}
