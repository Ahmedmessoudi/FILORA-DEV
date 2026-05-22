package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final AppProperties appProperties;

    public Path getUploadPath() {
        return Paths.get(appProperties.getStorage().getDataPath()).toAbsolutePath().normalize();
    }

    public String saveTempFile(MultipartFile file, Integer ownerId) throws IOException {
        Path tempDir = getUploadPath().resolve("temp").resolve(String.valueOf(ownerId));
        Files.createDirectories(tempDir);

        // Standardize filename
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String standardizedName = UUID.randomUUID().toString() + extension;
        Path targetLocation = tempDir.resolve(standardizedName);
        
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        return targetLocation.toString();
    }

    public String promoteTempFile(String tempFilePath, Integer companyId, Integer docTypeId) throws IOException {
        Path sourcePath = Paths.get(tempFilePath);
        if (!Files.exists(sourcePath)) {
            throw new FileNotFoundException("Temp file not found: " + tempFilePath);
        }

        Path targetDir = getUploadPath()
                .resolve(String.valueOf(companyId))
                .resolve(String.valueOf(docTypeId));
        Files.createDirectories(targetDir);

        String filename = sourcePath.getFileName().toString();
        Path targetPath = targetDir.resolve(filename);

        Files.move(sourcePath, targetPath, StandardCopyOption.REPLACE_EXISTING);
        return targetPath.toString();
    }

    public String saveDocumentFile(MultipartFile file, Integer companyId, Integer docTypeId) throws IOException {
        Path targetDir = getUploadPath()
                .resolve(String.valueOf(companyId))
                .resolve(String.valueOf(docTypeId));
        Files.createDirectories(targetDir);

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String standardizedName = UUID.randomUUID().toString() + extension;
        Path targetLocation = targetDir.resolve(standardizedName);
        
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        return targetLocation.toString();
    }

    public Resource loadFileAsResource(String filePath) throws MalformedURLException, FileNotFoundException {
        Path path = Paths.get(filePath).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            throw new FileNotFoundException("File not found: " + filePath);
        }
        
        Resource resource = new UrlResource(path.toUri());
        if (resource.exists() || resource.isReadable()) {
            return resource;
        } else {
            throw new FileNotFoundException("File is not readable: " + filePath);
        }
    }

    public void deleteFile(String filePath) {
        if (filePath == null) return;
        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // Log warning, don't fail the operation
        }
    }
}
