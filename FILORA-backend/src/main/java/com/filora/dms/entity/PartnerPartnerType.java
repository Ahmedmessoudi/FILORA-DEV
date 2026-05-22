package com.filora.dms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "partner_partnertypes", uniqueConstraints = @UniqueConstraint(columnNames = {"partner_id", "partnertype_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PartnerPartnerType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private Partner partner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partnertype_id", nullable = false)
    private PartnerType partnerType;
}
