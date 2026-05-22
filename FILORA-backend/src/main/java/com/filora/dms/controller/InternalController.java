package com.filora.dms.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.OcrCallbackPayload;
import com.filora.dms.entity.Document;
import com.filora.dms.entity.Partner;
import com.filora.dms.repository.DocumentRepository;
import com.filora.dms.repository.PartnerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalController {

    private final DocumentRepository documentRepository;
    private final PartnerRepository partnerRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/ocr-callback")
    public ResponseEntity<ApiResponse<Void>> ocrCallback(@RequestBody OcrCallbackPayload payload) {
        log.info("Received OCR callback for document ID: {}", payload.getDocument_id());

        if (payload.getDocument_id() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("document_id is required"));
        }

        Optional<Document> docOpt = documentRepository.findById(payload.getDocument_id());
        if (docOpt.isEmpty()) {
            log.error("Document not found for callback ID: {}", payload.getDocument_id());
            return ResponseEntity.notFound().build();
        }

        Document doc = docOpt.get();
        doc.setOcrStatus(payload.getOcr_status());
        doc.setExtractedText(payload.getExtracted_text());
        doc.setOcrText(payload.getExtracted_text()); // sync both fields
        doc.setIsInvoice(payload.getIs_invoice());

        // Process Extracted structured data
        if (payload.getExtracted_data() != null) {
            OcrCallbackPayload.ExtractedDataDto data = payload.getExtracted_data();
            doc.setInvoiceNumber(data.getInvoice_number());
            doc.setCurrency(data.getCurrency());
            
            if (data.getTotal_ht() != null) {
                doc.setTotalHt(BigDecimal.valueOf(data.getTotal_ht()));
            }
            if (data.getTva_rate() != null) {
                doc.setTvaRate(BigDecimal.valueOf(data.getTva_rate()));
            }
            if (data.getTva() != null) {
                doc.setTva(BigDecimal.valueOf(data.getTva()));
            }
            if (data.getTotal_ttc() != null) {
                doc.setTotalTtc(BigDecimal.valueOf(data.getTotal_ttc()));
            }

            // Safe parsing of Dates
            if (data.getDocument_date() != null) {
                try {
                    doc.setDocumentDate(LocalDate.parse(data.getDocument_date()));
                } catch (DateTimeParseException e) {
                    log.warn("Failed to parse document date '{}' for document ID: {}", data.getDocument_date(), doc.getId());
                }
            }
            if (data.getDue_date() != null) {
                try {
                    doc.setDueDate(LocalDate.parse(data.getDue_date()));
                } catch (DateTimeParseException e) {
                    log.warn("Failed to parse due date '{}' for document ID: {}", data.getDue_date(), doc.getId());
                }
            }

            // Convert to Map for the JSONB column
            try {
                Map<String, Object> dataMap = objectMapper.convertValue(data, new TypeReference<Map<String, Object>>() {});
                doc.setExtractedData(dataMap);
            } catch (Exception e) {
                log.error("Failed to convert extracted_data to Map for document ID: {}", doc.getId(), e);
            }

            // Associate Partner by name match (case-insensitive) if partner not already set
            if (doc.getPartner() == null && data.getSupplier_name() != null) {
                Optional<Partner> partnerOpt = partnerRepository.findByCompanyNameContainingIgnoreCase(data.getSupplier_name());
                partnerOpt.ifPresent(doc::setPartner);
            }
        }

        documentRepository.save(doc);
        log.info("Document ID: {} updated successfully from OCR callback.", doc.getId());

        return ResponseEntity.ok(ApiResponse.success("Callback processed successfully"));
    }
}
