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
        private String secret;
        private int expiryMinutes;
    }

    @Getter @Setter
    public static class Security {
        private boolean twoFactorEnabled;
        private String twoFactorMethod; // EMAIL or TOTP
        private int maxLoginAttempts;
        private int lockoutDurationMinutes;
    }

    @Getter @Setter
    public static class Storage {
        private String dataPath;
        private String logsPath;
    }

    @Getter @Setter
    public static class Ocr {
        private String serviceUrl;
        private double confidenceThreshold;
    }

    @Getter @Setter
    public static class SystemSettings {
        private String name;
        private boolean enabled;
        private int maxUsers;
        private int maxEntities;
        private int maxExternalEntities;
        private int maxFileSize; // KB
        private int tablePageSize;
        private String currency;
        private String defaultLanguage;
        private List<String> supportedLanguages;
    }

    @Getter @Setter
    public static class Frontend {
        private String url;
    }

    @Getter @Setter
    public static class Mail {
        private String host;
        private int port;
        private String username;
        private String password;
    }
}
