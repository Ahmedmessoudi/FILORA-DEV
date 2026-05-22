package com.filora.dms.dto;

import com.filora.dms.entity.DocType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocTypeDto {
    private Integer id;

    @NotBlank(message = "Document Type name is required")
    private String name;

    private Boolean status;
    private Instant createdAt;

    public static DocTypeDto fromEntity(DocType docType) {
        return DocTypeDto.builder()
                .id(docType.getId())
                .name(docType.getName())
                .status(docType.getStatus())
                .createdAt(docType.getCreatedAt())
                .build();
    }

    public DocType toEntity() {
        return DocType.builder()
                .id(this.id)
                .name(this.name)
                .status(this.status != null ? this.status : true)
                .build();
    }
}
