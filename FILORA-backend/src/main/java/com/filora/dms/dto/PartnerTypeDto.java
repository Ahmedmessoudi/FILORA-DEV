package com.filora.dms.dto;

import com.filora.dms.entity.PartnerType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerTypeDto {
    private Integer id;

    @NotBlank(message = "Partner Type name is required")
    private String name;

    private Boolean status;
    private Instant createdAt;

    public static PartnerTypeDto fromEntity(PartnerType partnerType) {
        return PartnerTypeDto.builder()
                .id(partnerType.getId())
                .name(partnerType.getName())
                .status(partnerType.getStatus())
                .createdAt(partnerType.getCreatedAt())
                .build();
    }

    public PartnerType toEntity() {
        return PartnerType.builder()
                .id(this.id)
                .name(this.name)
                .status(this.status != null ? this.status : true)
                .build();
    }
}
