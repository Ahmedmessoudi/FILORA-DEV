package com.filora.dms.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class OcrCallbackPayload {
    private Integer document_id;
    private String ocr_status;
    private Boolean is_invoice;
    private Double confidence;
    private String extracted_text;
    private ExtractedDataDto extracted_data;
    private String search_index;
    private String language_detected;

    @Data
    public static class ExtractedDataDto {
        private String invoice_number;
        private String document_date;
        private String due_date;
        private String supplier_name;
        private String supplier_address;
        private String client_name;
        private List<LineItemDto> line_items;
        private Double total_ht;
        private Double tva_rate;
        private Double tva;
        private Double total_ttc;
        private String currency;
        private String payment_terms;
    }

    @Data
    public static class LineItemDto {
        private String description;
        private Double qty;
        private Double unit_price;
        private Double total;
    }
}
