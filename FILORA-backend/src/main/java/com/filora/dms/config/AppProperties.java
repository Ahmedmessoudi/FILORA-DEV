package com.filora.dms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "filora")
@Getter @Setter
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Security security = new Security();
    private final Storage storage = new Storage();
    private final Ocr ocr = new Ocr();
    private final SystemSettings system = new SystemSettings();
    private final Frontend frontend = new Frontend();
    private final Mail mail = new Mail();

    @Getter @Setter
    public static class Jwt {
        private String secret = "c29tZVN1cGVyU2VjcmV0S2V5VGhhdElzQXRMZWFzdDMyQnl0ZXNMb25n";
        private int expiryMinutes = 60;
    }

    @Getter @Setter
    public static class Security {
        private boolean twoFactorEnabled = true;
        private String twoFactorMethod = "EMAIL"; // EMAIL or TOTP
        private int maxLoginAttempts = 5;
        private int lockoutDurationMinutes = 15;
    }

    @Getter @Setter
    public static class Storage {
        private String dataPath = "/app/dms-data/upload";
        private String logsPath = "/app/logs";
    }

    @Getter @Setter
    public static class Ocr {
        private String serviceUrl = "http://localhost:8000";
        private double confidenceThreshold = 0.75;
    }

    @Getter @Setter
    public static class SystemSettings {
        private String name = "FiloraDEV";
        private boolean enabled = true;
        private int maxUsers = 12;
        private int maxEntities = 4;
        private int maxExternalEntities = 4;
        private int maxFileSize = 1024; // KB
        private String currency = "TND";
        private String defaultLanguage = "fr";
        private List<String> supportedLanguages = List.of("fr", "en");
    }

    @Getter @Setter
    public static class Frontend {
        private String url = "http://localhost:4200";
    }

    @Getter @Setter
    public static class Mail {
        private String host = "smtp.gmail.com";
        private int port = 587;
        private String username = "";
        private String password = "";
    }
}
