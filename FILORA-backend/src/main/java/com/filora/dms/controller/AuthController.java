package com.filora.dms.controller;

import com.filora.dms.dto.*;
import com.filora.dms.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String ipAddress = request.getRemoteAddr();
        Map<String, Object> session = authService.login(loginRequest.getUsername(), loginRequest.getPassword(), ipAddress);

        if ("SUCCESS".equals(session.get("status"))) {
            String token = (String) session.get("token");
            // Set JWT as httpOnly cookie
            Cookie jwtCookie = new Cookie("jwt", token);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false); // Set to true in production
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(60 * 60); // 1 hour
            response.addCookie(jwtCookie);
        }

        return ResponseEntity.ok(ApiResponse.success("Login request processed", session));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verify2Fa(
            @Valid @RequestBody TwoFactorRequest tfaRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String ipAddress = request.getRemoteAddr();
        Map<String, Object> session = authService.verify2Fa(tfaRequest.getUsername(), tfaRequest.getCode(), ipAddress);

        if ("SUCCESS".equals(session.get("status"))) {
            String token = (String) session.get("token");
            Cookie jwtCookie = new Cookie("jwt", token);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(60 * 60);
            response.addCookie(jwtCookie);
        }

        return ResponseEntity.ok(ApiResponse.success("2FA verified successfully", session));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refresh(
            @RequestParam String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String ipAddress = request.getRemoteAddr();
        Map<String, Object> session = authService.refresh(refreshToken, ipAddress);

        String token = (String) session.get("token");
        Cookie jwtCookie = new Cookie("jwt", token);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(false);
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(60 * 60);
        response.addCookie(jwtCookie);

        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", session));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        authService.forgotPassword(forgotPasswordRequest.getEmail(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Password reset email sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest resetPasswordRequest,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        authService.resetPassword(resetPasswordRequest.getToken(), resetPasswordRequest.getPassword(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestParam String refreshToken,
            HttpServletResponse response) {
        
        authService.logout(refreshToken);

        // Clear Cookie
        Cookie jwtCookie = new Cookie("jwt", null);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(false);
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(0);
        response.addCookie(jwtCookie);

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<String>> me(HttpServletRequest request) {
        // Return username of current logged in user
        String username = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
        return ResponseEntity.ok(ApiResponse.success("Current user retrieved", username));
    }
}
