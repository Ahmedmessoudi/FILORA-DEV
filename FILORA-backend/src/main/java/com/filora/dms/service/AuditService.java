package com.filora.dms.service;

import com.filora.dms.entity.AuditLog;
import com.filora.dms.entity.User;
import com.filora.dms.repository.AuditLogRepository;
import com.filora.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void log(String action, String entityType, Integer entityId, Map<String, Object> details, String ipAddress) {
        User currentUser = getCurrentUser();
        
        AuditLog log = AuditLog.builder()
                .user(currentUser)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .createdAt(Instant.now())
                .build();
                
        auditLogRepository.save(log);

        // Also append a human-readable line to ./logs/actions.log
        try {
            String username = currentUser != null ? currentUser.getUsername() : "anonymous";
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String ts = LocalDateTime.now().format(fmt);

            StringBuilder detailBuilder = new StringBuilder();
            detailBuilder.append("entityType=").append(entityType != null ? entityType : "");
            if (entityId != null) detailBuilder.append(" id=").append(entityId);
            if (details != null && !details.isEmpty()) {
                details.forEach((k, v) -> detailBuilder.append(" ").append(k).append("=").append(v));
            }
            if (ipAddress != null && !ipAddress.isBlank()) {
                detailBuilder.append(" ip=").append(ipAddress);
            }

            String line = String.format("[%s] [%s] [%s] %s", ts, username, action, detailBuilder.toString());

            Path logsDir = Paths.get("logs");
            if (!Files.exists(logsDir)) {
                try {
                    Files.createDirectories(logsDir);
                } catch (IOException e) {
                    // ignore directory creation failures
                }
            }

            Path logFile = logsDir.resolve("actions.log");
            try {
                Files.writeString(logFile, line + System.lineSeparator(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (IOException e) {
                // don't let logging to file break main flow
            }
        } catch (Exception ex) {
            // swallow any exceptions while trying to write logs to disk
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        
        String username = authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }
}
