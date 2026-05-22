package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import com.filora.dms.config.JwtTokenProvider;
import com.filora.dms.entity.User;
import com.filora.dms.entity.RefreshToken;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AppProperties appProperties;
    private final AuditService auditService;

    // In-memory OTP storage for simplicity in development: username -> (OTP, Expiry)
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    private static class OtpData {
        final String otp;
        final Instant expiry;
        OtpData(String otp, Instant expiry) {
            this.otp = otp;
            this.expiry = expiry;
        }
    }

    @Transactional
    public Map<String, Object> login(String usernameOrEmail, String password, String ipAddress) {
        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        // 1. Check Brute-force Lockout
        if (user.getLockedUntil() != null && Instant.now().isBefore(user.getLockedUntil())) {
            long remainingMinutes = ChronoUnit.MINUTES.between(Instant.now(), user.getLockedUntil()) + 1;
            throw new IllegalStateException("Account is temporarily locked. Try again in " + remainingMinutes + " minutes.");
        }

        // 2. Validate Password
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            handleFailedLogin(user, ipAddress);
            throw new IllegalArgumentException("Invalid username or password");
        }

        // 3. Reset login attempts on successful password verification
        user.setLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        Map<String, Object> result = new HashMap<>();

        // 4. Check 2FA condition
        boolean is2faRequired = appProperties.getSecurity().isTwoFactorEnabled() && user.getTwoFaEnabled();
        if (is2faRequired) {
            String otp = generateOtp();
            Instant expiry = Instant.now().plus(5, ChronoUnit.MINUTES);
            otpStorage.put(user.getUsername(), new OtpData(otp, expiry));

            // Send OTP via SMTP asynchronously
            String subject = "[" + appProperties.getSystem().getName() + "] Double facteur d'authentification";
            String body = "<h3>Authentification Filora DMS</h3>" +
                    "<p>Votre code de validation temporaire est : <strong>" + otp + "</strong></p>" +
                    "<p>Ce code expirera dans 5 minutes.</p>";
            emailService.sendEmail(user.getEmail(), subject, body, null);

            result.put("status", "2FA_REQUIRED");
            result.put("username", user.getUsername());
            
            Map<String, Object> auditDetails = new HashMap<>();
            auditDetails.put("username", user.getUsername());
            auditService.log("LOGIN_2FA_TRIGGERED", "User", user.getId(), auditDetails, ipAddress);
            return result;
        }

        // 5. Normal Flow (No 2FA) - Generate Session
        return generateAuthSession(user, ipAddress);
    }

    @Transactional
    public Map<String, Object> verify2Fa(String username, String code, String ipAddress) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        OtpData otpData = otpStorage.get(username);
        if (otpData == null || Instant.now().isAfter(otpData.expiry) || !otpData.otp.equals(code)) {
            Map<String, Object> auditDetails = new HashMap<>();
            auditDetails.put("username", username);
            auditService.log("LOGIN_2FA_FAILED", "User", user.getId(), auditDetails, ipAddress);
            throw new IllegalArgumentException("Code OTP invalide ou expiré.");
        }

        // Clear OTP once verified
        otpStorage.remove(username);

        return generateAuthSession(user, ipAddress);
    }

    @Transactional
    public Map<String, Object> refresh(String refreshTokenStr, String ipAddress) {
        RefreshToken token = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (token.getRevoked() || Instant.now().isAfter(token.getExpiryDate())) {
            refreshTokenRepository.delete(token);
            throw new IllegalArgumentException("Expired or revoked refresh token");
        }

        User user = token.getUser();
        
        // Generate new JWT
        String jwt = jwtTokenProvider.generateToken(
                user.getUsername(), 
                user.getId(), 
                user.getRole(), 
                user.getLanguage()
        );

        Map<String, Object> result = new HashMap<>();
        result.put("token", jwt);
        result.put("refreshToken", token.getToken());
        result.put("role", user.getRole());
        result.put("username", user.getUsername());

        return result;
    }

    @Transactional
    public void forgotPassword(String email, String ipAddress) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No user found with email: " + email));

        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetExpires(Instant.now().plus(24, ChronoUnit.HOURS)); // token valid for 24h
        userRepository.save(user);

        // Send reset link
        String resetLink = appProperties.getFrontend().getUrl() + "/reset-password?token=" + token;
        String subject = "[" + appProperties.getSystem().getName() + "] Réinitialisation de votre mot de passe";
        String body = "<h3>Réinitialisation du mot de passe</h3>" +
                "<p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>" +
                "<p><a href=\"" + resetLink + "\">Réinitialiser mon mot de passe</a></p>" +
                "<p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce mail.</p>";
        
        emailService.sendEmail(user.getEmail(), subject, body, null);

        Map<String, Object> details = new HashMap<>();
        details.put("email", email);
        auditService.log("FORGOT_PASSWORD_REQUESTED", "User", user.getId(), details, ipAddress);
    }

    @Transactional
    public void resetPassword(String token, String newPassword, String ipAddress) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Jeton de réinitialisation invalide."));

        if (user.getPasswordResetExpires() == null || Instant.now().isAfter(user.getPasswordResetExpires())) {
            throw new IllegalArgumentException("Le jeton de réinitialisation a expiré.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);
        user.setHasTemporaryPassword(false);
        userRepository.save(user);

        Map<String, Object> details = new HashMap<>();
        details.put("username", user.getUsername());
        auditService.log("PASSWORD_RESET_SUCCESSFUL", "User", user.getId(), details, ipAddress);
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.findByToken(refreshTokenStr).ifPresent(refreshTokenRepository::delete);
    }

    private void handleFailedLogin(User user, String ipAddress) {
        int attempts = user.getLoginAttempts() + 1;
        user.setLoginAttempts(attempts);

        Map<String, Object> details = new HashMap<>();
        details.put("attempts", attempts);

        if (attempts >= appProperties.getSecurity().getMaxLoginAttempts()) {
            Instant lockTime = Instant.now().plus(appProperties.getSecurity().getLockoutDurationMinutes(), ChronoUnit.MINUTES);
            user.setLockedUntil(lockTime);
            userRepository.save(user);
            
            details.put("locked_until", lockTime);
            auditService.log("USER_LOCKED_OUT", "User", user.getId(), details, ipAddress);
        } else {
            userRepository.save(user);
            auditService.log("LOGIN_FAILED", "User", user.getId(), details, ipAddress);
        }
    }

    private Map<String, Object> generateAuthSession(User user, String ipAddress) {
        // Generate JWT
        String jwt = jwtTokenProvider.generateToken(
                user.getUsername(), 
                user.getId(), 
                user.getRole(), 
                user.getLanguage()
        );

        // Generate Refresh Token
        String refreshStr = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshStr)
                .user(user)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS)) // Refresh token lasts 7 days
                .revoked(false)
                .createdAt(Instant.now())
                .build();
        
        refreshTokenRepository.save(refreshToken);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "SUCCESS");
        result.put("token", jwt);
        result.put("refreshToken", refreshStr);
        result.put("role", user.getRole());
        result.put("username", user.getUsername());
        result.put("hasTemporaryPassword", user.getHasTemporaryPassword());

        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("username", user.getUsername());
        auditService.log("LOGIN_SUCCESSFUL", "User", user.getId(), auditDetails, ipAddress);

        return result;
    }

    private String generateOtp() {
        // Generate robust 6-digit verification code
        java.security.SecureRandom random = new java.security.SecureRandom();
        int num = 100000 + random.nextInt(900000);
        return String.valueOf(num);
    }
}
