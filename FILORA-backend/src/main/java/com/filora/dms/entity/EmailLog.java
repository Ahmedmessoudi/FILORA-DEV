package com.filora.dms.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "email_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Type(JsonType.class)
    @Column(name = "recipients", columnDefinition = "jsonb")
    private Map<String, Object> recipients;

    @Type(JsonType.class)
    @Column(name = "email_type", columnDefinition = "jsonb")
    private Map<String, Object> emailType;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(name = "sent_at", updatable = false)
    @Builder.Default
    private Instant sentAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) sentAt = Instant.now();
    }
}
