package com.filora.dms.repository;

import com.filora.dms.entity.Document;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.DocType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer>, JpaSpecificationExecutor<Document> {
    
    List<Document> findAllByCompanyAndIsDeletedFalse(CompanyEntity company);
    
    List<Document> findAllByCompanyAndDocTypeAndIsDeletedFalse(CompanyEntity company, DocType docType);
    
        @Query(value = "SELECT * FROM documents d WHERE d.company_id = :companyId AND d.is_deleted = false " +
                       "AND (:docTypeId IS NULL OR d.doctype_id = :docTypeId) " +
                       "AND ( :query IS NULL OR :query = '' OR (to_tsvector('french', COALESCE(d.extracted_text, '')) @@ websearch_to_tsquery('french', :query)) " +
                       "OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%')) " +
                       "ORDER BY d.created_at DESC", 
           countQuery = "SELECT count(*) FROM documents d WHERE d.company_id = :companyId AND d.is_deleted = false " +
                "AND (:docTypeId IS NULL OR d.doctype_id = :docTypeId) " +
                            "AND ( :query IS NULL OR :query = '' OR (to_tsvector('french', COALESCE(d.extracted_text, '')) @@ websearch_to_tsquery('french', :query)) " +
                            "OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%'))",
           nativeQuery = true)
    Page<Document> searchDocuments(@Param("companyId") Integer companyId, 
                                   @Param("docTypeId") Integer docTypeId, 
                                   @Param("query") String query, 
                                   Pageable pageable);

            @Query(value = "SELECT * FROM documents d WHERE d.company_id IN (:companyIds) AND d.is_deleted = false " +
                   "AND ( :query IS NULL OR :query = '' OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%')) " +
                   "ORDER BY d.created_at DESC",
               countQuery = "SELECT count(*) FROM documents d WHERE d.company_id IN (:companyIds) AND d.is_deleted = false " +
                   "AND ( :query IS NULL OR :query = '' OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%'))",
               nativeQuery = true)
            Page<Document> searchDocumentsAcrossCompanies(@Param("companyIds") List<Integer> companyIds,
                                  @Param("query") String query,
                                  Pageable pageable);

            @Query(value = "SELECT * FROM documents d WHERE d.is_deleted = false " +
                   "AND ( :query IS NULL OR :query = '' OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%')) " +
                   "ORDER BY d.created_at DESC",
               countQuery = "SELECT count(*) FROM documents d WHERE d.is_deleted = false " +
                   "AND ( :query IS NULL OR :query = '' OR d.filename ILIKE ('%' || :query || '%') OR d.original_filename ILIKE ('%' || :query || '%'))",
               nativeQuery = true)
            Page<Document> searchDocumentsAll(@Param("query") String query, Pageable pageable);
}
