package com.filora.dms.repository;

import com.filora.dms.entity.TempDocument;
import com.filora.dms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TempDocumentRepository extends JpaRepository<TempDocument, Integer> {
    List<TempDocument> findAllByOwner(User owner);
    Page<TempDocument> findAllByOwner(User owner, Pageable pageable);
}
