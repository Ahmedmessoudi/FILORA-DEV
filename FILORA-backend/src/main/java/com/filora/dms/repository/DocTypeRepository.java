package com.filora.dms.repository;

import com.filora.dms.entity.DocType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocTypeRepository extends JpaRepository<DocType, Integer> {
    Optional<DocType> findByName(String name);
}
