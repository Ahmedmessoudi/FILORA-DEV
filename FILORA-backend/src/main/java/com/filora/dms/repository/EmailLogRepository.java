package com.filora.dms.repository;

import com.filora.dms.entity.EmailLog;
import com.filora.dms.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Integer> {
    List<EmailLog> findAllByDocument(Document document);
}
