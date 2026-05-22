package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.entity.AppSetting;
import com.filora.dms.entity.User;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.service.SettingsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERUSER')")
public class SettingsController {

    private final SettingsService settingsService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppSetting>>> getAllSettings() {
        List<AppSetting> settings = settingsService.getAllSettings();
        return ResponseEntity.ok(ApiResponse.success("Settings retrieved successfully", settings));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateSettings(
            @RequestBody Map<String, String> settingsMap,
            Principal principal,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        User currentUser = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));

        settingsMap.forEach((key, value) -> {
            settingsService.updateSetting(key, value, currentUser, ipAddress);
        });

        return ResponseEntity.ok(ApiResponse.success("Settings updated successfully"));
    }
}
