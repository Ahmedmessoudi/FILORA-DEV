package com.filora.dms.dto;

import com.filora.dms.entity.Partner;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerDto {
    private Integer id;

    @NotBlank(message = "Company name is required")
    private String companyName;

    private String tradeName;

    @NotBlank(message = "Unique identifier is required")
    private String uniqueIdentifier;

    @NotBlank(message = "Mailing address is required")
    private String mailingAddress;

    private String billingAddress;

    @NotBlank(message = "Phone 1 is required")
    private String phone1;

    private String phone2;
    private String phone3;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String paymentTerms;
    private String billingTerms;
    private String bankAccountNumber;
    private String bankName;
    private String notes;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;

    // Associated properties for response/request
    private List<Integer> assignedCompanyIds;
    private List<Integer> partnerTypeIds;

    public static PartnerDto fromEntity(Partner partner, List<Integer> assignedCompanyIds, List<Integer> partnerTypeIds) {
        return PartnerDto.builder()
                .id(partner.getId())
                .companyName(partner.getCompanyName())
                .tradeName(partner.getTradeName())
                .uniqueIdentifier(partner.getUniqueIdentifier())
                .mailingAddress(partner.getMailingAddress())
                .billingAddress(partner.getBillingAddress())
                .phone1(partner.getPhone1())
                .phone2(partner.getPhone2())
                .phone3(partner.getPhone3())
                .email(partner.getEmail())
                .paymentTerms(partner.getPaymentTerms())
                .billingTerms(partner.getBillingTerms())
                .bankAccountNumber(partner.getBankAccountNumber())
                .bankName(partner.getBankName())
                .notes(partner.getNotes())
                .isActive(partner.getIsActive())
                .createdAt(partner.getCreatedAt())
                .updatedAt(partner.getUpdatedAt())
                .assignedCompanyIds(assignedCompanyIds)
                .partnerTypeIds(partnerTypeIds)
                .build();
    }

    public Partner toEntity() {
        return Partner.builder()
                .id(this.id)
                .companyName(this.companyName)
                .tradeName(this.tradeName)
                .uniqueIdentifier(this.uniqueIdentifier)
                .mailingAddress(this.mailingAddress)
                .billingAddress(this.billingAddress)
                .phone1(this.phone1)
                .phone2(this.phone2)
                .phone3(this.phone3)
                .email(this.email)
                .paymentTerms(this.paymentTerms)
                .billingTerms(this.billingTerms)
                .bankAccountNumber(this.bankAccountNumber)
                .bankName(this.bankName)
                .notes(this.notes)
                .isActive(this.isActive != null ? this.isActive : true)
                .build();
    }
}
