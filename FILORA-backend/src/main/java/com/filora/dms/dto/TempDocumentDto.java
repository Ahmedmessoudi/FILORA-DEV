package com.filora.dms.dto;

import com.filora.dms.entity.TempDocument;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TempDocumentDto {
    private Integer id;
    private String filename;
    private String filePath;
    private Integer fileSize;
    private String fileType;
    private String mimeType;
    private Integer ownerId;
    private String ownerName;
    private Instant createdAt;

    public static TempDocumentDto fromEntity(TempDocument doc) {
        if (doc == null) return null;
        return TempDocumentDto.builder()
                .id(doc.getId())
                .filename(doc.getFilename())
                .filePath(doc.getFilePath())
                .fileSize(doc.getFileSize())
                .fileType(doc.getFileType())
                .mimeType(doc.getMimeType())
                .ownerId(doc.getOwner() != null ? doc.getOwner().getId() : null)
                .ownerName(doc.getOwner() != null ? doc.getOwner().getUsername() : null)
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
