package com.filora.dms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "partners")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Partner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "company_name", nullable = false, unique = true)
    private String companyName;

    @Column(name = "trade_name")
    private String tradeName;

    @Column(name = "unique_identifier", nullable = false, unique = true, length = 100)
    private String uniqueIdentifier;

    @Column(name = "mailing_address", nullable = false, columnDefinition = "TEXT")
    private String mailingAddress;

    @Column(name = "billing_address", columnDefinition = "TEXT")
    private String billingAddress;

    @Column(nullable = false, unique = true, length = 20)
    private String phone1;

    @Column(length = 20)
    private String phone2;

    @Column(length = 20)
    private String phone3;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "payment_terms")
    private String paymentTerms;

    @Column(name = "billing_terms")
    private String billingTerms;

    @Column(name = "bank_account_number", unique = true, length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
