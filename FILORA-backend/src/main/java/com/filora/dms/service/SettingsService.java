package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import com.filora.dms.entity.AppSetting;
import com.filora.dms.entity.User;
import com.filora.dms.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    private final AppSettingRepository appSettingRepository;
    private final AppProperties appProperties;
    private final AuditService auditService;

    public List<AppSetting> getAllSettings() {
        return appSettingRepository.findAll();
    }

    public Optional<AppSetting> getSetting(String key) {
        return appSettingRepository.findById(key);
    }

    @Transactional
    public void updateSetting(String key, String value, User updater, String ipAddress) {
        AppSetting setting = appSettingRepository.findById(key)
            .orElseGet(() -> AppSetting.builder()
                .key(key)
                .description(defaultDescriptionFor(key))
                .build());

        String oldValue = setting.getValue();
        setting.setValue(value);
        setting.setUpdatedBy(updater);
        setting.setUpdatedAt(Instant.now());

        appSettingRepository.save(setting);

        // ─── Live runtime synchronization with AppProperties ───
        syncSettingToRuntime(key, value);

        // Audit Log
        Map<String, Object> details = new HashMap<>();
        details.put("old_value", oldValue);
        details.put("new_value", value);
        auditService.log("UPDATE_SETTING", "AppSetting", null, details, ipAddress);

        // Optional: Persist back to root .env file
        try {
            updateEnvFile(key, value);
        } catch (IOException e) {
            log.error("Failed to write updated settings back to root .env file: {}", e.getMessage());
        }
    }

    private String defaultDescriptionFor(String key) {
        return switch (key) {
            case "SYSTEM_NAME" -> "System instance name";
            case "SYSTEM_ENABLED" -> "Whether the system is active";
            case "SYSTEM_MAX_USERS" -> "Maximum allowable active users";
            case "SYSTEM_MAX_ENTITIES" -> "Maximum internal entities";
            case "SYSTEM_MAX_EXTERNAL_ENTITIES" -> "Maximum external entities";
            case "SYSTEM_MAX_FILE_SIZE" -> "Maximum upload size in KB";
            case "SYSTEM_TABLE_PAGE_SIZE" -> "Default documents page size for lazy loading";
            case "CURRENCY" -> "System default currency symbol/code";
            case "DEFAULT_LANGUAGE" -> "Default system language";
            case "SUPPORTED_LANGUAGES" -> "Comma-separated list of supported languages";
            case "TWO_FACTOR_ENABLED" -> "Whether two-factor authentication is globally enabled";
            case "TWO_FACTOR_METHOD" -> "Default 2FA method (EMAIL or TOTP)";
            case "SMTP_HOST" -> "SMTP server host";
            case "SMTP_PORT" -> "SMTP server port";
            case "SMTP_EMAIL" -> "SMTP username/email";
            case "SMTP_PASSWORD" -> "SMTP password or app password";
            case "OCR_SERVICE_URL" -> "OCR service endpoint";
            case "OCR_CONFIDENCE_THRESHOLD" -> "OCR confidence threshold";
            default -> null;
        };
    }

    private void syncSettingToRuntime(String key, String value) {
        switch (key) {
            case "SYSTEM_NAME":
                appProperties.getSystem().setName(value);
                break;
            case "SYSTEM_ENABLED":
                appProperties.getSystem().setEnabled(Boolean.parseBoolean(value));
                break;
            case "SYSTEM_MAX_USERS":
                appProperties.getSystem().setMaxUsers(Integer.parseInt(value));
                break;
            case "SYSTEM_MAX_ENTITIES":
                appProperties.getSystem().setMaxEntities(Integer.parseInt(value));
                break;
            case "SYSTEM_MAX_EXTERNAL_ENTITIES":
                appProperties.getSystem().setMaxExternalEntities(Integer.parseInt(value));
                break;
            case "SYSTEM_MAX_FILE_SIZE":
                appProperties.getSystem().setMaxFileSize(Integer.parseInt(value));
                break;
            case "SYSTEM_TABLE_PAGE_SIZE":
                appProperties.getSystem().setTablePageSize(Integer.parseInt(value));
                break;
            case "CURRENCY":
                appProperties.getSystem().setCurrency(value);
                break;
            case "DEFAULT_LANGUAGE":
                appProperties.getSystem().setDefaultLanguage(value);
                break;
            case "SUPPORTED_LANGUAGES":
                appProperties.getSystem().setSupportedLanguages(List.of(value.split(",")));
                break;
            case "TWO_FACTOR_ENABLED":
                appProperties.getSecurity().setTwoFactorEnabled(Boolean.parseBoolean(value));
                break;
            case "TWO_FACTOR_METHOD":
                appProperties.getSecurity().setTwoFactorMethod(value);
                break;
            case "SMTP_HOST":
                appProperties.getMail().setHost(value);
                break;
            case "SMTP_PORT":
                appProperties.getMail().setPort(Integer.parseInt(value));
                break;
            case "SMTP_EMAIL":
                appProperties.getMail().setUsername(value);
                break;
            case "SMTP_PASSWORD":
                appProperties.getMail().setPassword(value);
                break;
            case "OCR_SERVICE_URL":
                appProperties.getOcr().setServiceUrl(value);
                break;
            case "OCR_CONFIDENCE_THRESHOLD":
                appProperties.getOcr().setConfidenceThreshold(Double.parseDouble(value));
                break;
        }
    }

    private void updateEnvFile(String key, String value) throws IOException {
        Path envPath = Paths.get("../.env").toAbsolutePath().normalize();
        if (!Files.exists(envPath)) {
            envPath = Paths.get(".env").toAbsolutePath().normalize(); // fallback
        }
        
        if (!Files.exists(envPath)) {
            return; // no .env found to write back
        }

        List<String> lines = Files.readAllLines(envPath);
        boolean keyFound = false;
        
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i).strip();
            if (line.startsWith(key + "=")) {
                lines.set(i, key + "=" + value);
                keyFound = true;
                break;
            }
        }

        if (!keyFound) {
            lines.add(key + "=" + value);
        }

        Files.write(envPath, lines);
        log.info("Successfully updated root .env file for key: {}", key);
    }
}
