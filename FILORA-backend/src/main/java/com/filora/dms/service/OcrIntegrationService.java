package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;

@Service
@RequiredArgsConstructor
@Slf4j
public class OcrIntegrationService {

    private final AppProperties appProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void triggerOcrProcessing(String filePath, Integer documentId) {
        log.info("Triggering async OCR processing for document id: {} at path: {}", documentId, filePath);
        
        try {
            String ocrUrl = appProperties.getOcr().getServiceUrl() + "/ocr/process";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(new File(filePath)));
            body.add("document_id", documentId);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            log.info("Sending HTTP POST request to OCR agent: {}", ocrUrl);
            ResponseEntity<String> response = restTemplate.postForEntity(ocrUrl, requestEntity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("OCR agent successfully accepted document id: {}", documentId);
            } else {
                log.error("OCR agent returned status code: {} for document id: {}", response.getStatusCode(), documentId);
            }
        } catch (Exception e) {
            log.error("Failed to trigger OCR processing for document id: {}. Error: {}", documentId, e.getMessage());
            // In a real system, we'd transition document status to "failed" in the DB.
            // That will be handled by the document service if needed.
        }
    }
}
