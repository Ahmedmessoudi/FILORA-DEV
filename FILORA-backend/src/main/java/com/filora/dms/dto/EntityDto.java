package com.filora.dms.dto;

import com.filora.dms.entity.CompanyEntity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityDto {
    private Integer id;

    @NotBlank(message = "Entity name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phone;

    private Boolean isActive;
    private String description;
    private Instant createdAt;

    public static EntityDto fromEntity(CompanyEntity company) {
        return EntityDto.builder()
                .id(company.getId())
                .name(company.getName())
                .address(company.getAddress())
                .email(company.getEmail())
                .phone(company.getPhone())
                .isActive(company.getIsActive())
                .description(company.getDescription())
                .createdAt(company.getCreatedAt())
                .build();
    }

    public CompanyEntity toEntity() {
        return CompanyEntity.builder()
                .id(this.id)
                .name(this.name)
                .address(this.address)
                .email(this.email)
                .phone(this.phone)
                .isActive(this.isActive != null ? this.isActive : true)
                .description(this.description)
                .build();
    }
}
