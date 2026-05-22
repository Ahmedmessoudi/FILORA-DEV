package com.filora.dms.seeder;

import com.filora.dms.entity.User;
import com.filora.dms.entity.AppSetting;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Starting Filora DMS programmatic database seeding...");
        
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

        // 1. Seed Default Settings if table is empty
        if (appSettingRepository.count() == 0) {
            log.info("Seeding application settings...");
            
            Map<String, String[]> defaultSettings = new HashMap<>();
            defaultSettings.put("SYSTEM_NAME", new String[]{"FiloraDEV", "System instance name"});
            defaultSettings.put("SYSTEM_ENABLED", new String[]{"true", "Whether the system is active"});
            defaultSettings.put("SYSTEM_MAX_USERS", new String[]{"12", "Maximum allowable active users"});
            defaultSettings.put("SYSTEM_MAX_ENTITIES", new String[]{"4", "Maximum internal entities"});
            defaultSettings.put("SYSTEM_MAX_EXTERNAL_ENTITIES", new String[]{"4", "Maximum external entities"});
            defaultSettings.put("SYSTEM_MAX_FILE_SIZE", new String[]{"1024", "Maximum upload size in KB"});
            defaultSettings.put("CURRENCY", new String[]{"TND", "System default currency symbol/code"});
            defaultSettings.put("DEFAULT_LANGUAGE", new String[]{"fr", "Default system language"});
            defaultSettings.put("SUPPORTED_LANGUAGES", new String[]{"fr,en", "Comma-separated list of supported languages"});
            defaultSettings.put("TWO_FACTOR_ENABLED", new String[]{"true", "Whether two-factor authentication is globally enabled"});
            defaultSettings.put("TWO_FACTOR_METHOD", new String[]{"EMAIL", "Default 2FA method (EMAIL or TOTP)"});

            for (Map.Entry<String, String[]> entry : defaultSettings.entrySet()) {
                AppSetting setting = AppSetting.builder()
                        .key(entry.getKey())
                        .value(entry.getValue()[0])
                        .description(entry.getValue()[1])
                        .updatedAt(Instant.now())
                        .build();
                appSettingRepository.save(setting);
            }
            log.info("Successfully seeded application settings.");
        }

        // 2. Seed Default Users if table is empty
        if (userRepository.count() == 0) {
            log.info("Seeding default users (superuser and admin)...");

            // Superuser slim / slim123
            User superuser = User.builder()
                    .username("slim")
                    .surname("slim")
                    .email("slim@filora.com")
                    .passwordHash(encoder.encode("slim123"))
                    .role("superuser")
                    .isActive(true)
                    .language("fr")
                    .twoFaEnabled(false)
                    .hasTemporaryPassword(false)
                    .createdAt(Instant.now())
                    .build();
            userRepository.save(superuser);

            // Admin admin / admin123
            User admin = User.builder()
                    .username("admin")
                    .surname("admin")
                    .email("admin@filora.com")
                    .passwordHash(encoder.encode("admin123"))
                    .role("admin")
                    .isActive(true)
                    .language("fr")
                    .twoFaEnabled(false)
                    .hasTemporaryPassword(false)
                    .createdAt(Instant.now())
                    .build();
            userRepository.save(admin);

            // Superuser Ahmed Messoudi / ahmed123 (with 2FA enabled)
            User ahmed = User.builder()
                    .username("ahmed")
                    .surname("Messoudi")
                    .email("messoudiahmed07@gmail.com")
                    .passwordHash(encoder.encode("ahmed123"))
                    .role("superuser")
                    .isActive(true)
                    .language("fr")
                    .twoFaEnabled(true)
                    .hasTemporaryPassword(false)
                    .createdAt(Instant.now())
                    .build();
            userRepository.save(ahmed);

            log.info("Successfully seeded superuser (slim), admin (admin), and superuser (ahmed) accounts.");
        }

        log.info("Database seeding completed.");
    }
}
