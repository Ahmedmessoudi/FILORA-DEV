package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import com.filora.dms.entity.User;
import com.filora.dms.entity.UserEntity;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.repository.UserRepository;
import com.filora.dms.repository.UserEntityRepository;
import com.filora.dms.repository.CompanyEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserEntityRepository userEntityRepository;
    private final CompanyEntityRepository companyEntityRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final AuditService auditService;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Integer id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public User createUser(User user, List<Integer> companyIds, String ipAddress) {
        long activeCount = userRepository.countActiveUsers();
        if (activeCount >= appProperties.getSystem().getMaxUsers()) {
            throw new IllegalStateException("Maximum limit of active users reached (" + 
                    appProperties.getSystem().getMaxUsers() + ").");
        }

        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username is already taken: " + user.getUsername());
        }

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email is already registered: " + user.getEmail());
        }

        // Secure password hashing
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        user.setCreatedAt(Instant.now());
        user.setIsActive(true);
        
        User saved = userRepository.save(user);

        // Assign Entities
        Set<Integer> uniqueCompanyIds = normalizeCompanyIds(companyIds);
        if (!uniqueCompanyIds.isEmpty()) {
            for (Integer cid : uniqueCompanyIds) {
                CompanyEntity company = companyEntityRepository.findById(cid)
                        .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + cid));
                UserEntity ue = UserEntity.builder().user(saved).company(company).build();
                userEntityRepository.save(ue);
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("username", saved.getUsername());
        details.put("role", saved.getRole());
        auditService.log("CREATE_USER", "User", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public User updateUser(Integer id, User updated, List<Integer> companyIds, String ipAddress) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        existing.setSurname(updated.getSurname());
        existing.setEmail(updated.getEmail());
        existing.setRole(updated.getRole());
        existing.setIsActive(updated.getIsActive());
        existing.setLanguage(updated.getLanguage());
        existing.setTwoFaEnabled(updated.getTwoFaEnabled());

        User saved = userRepository.save(existing);

        // Sync Entity Assignments
        userEntityRepository.deleteByUser(saved);
        userEntityRepository.flush();
        Set<Integer> uniqueCompanyIds = normalizeCompanyIds(companyIds);
        if (!uniqueCompanyIds.isEmpty()) {
            for (Integer cid : uniqueCompanyIds) {
                CompanyEntity company = companyEntityRepository.findById(cid)
                        .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + cid));
                UserEntity ue = UserEntity.builder().user(saved).company(company).build();
                userEntityRepository.save(ue);
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("username", saved.getUsername());
        details.put("role", saved.getRole());
        auditService.log("UPDATE_USER", "User", saved.getId(), details, ipAddress);

        return saved;
    }

    @Transactional
    public void deleteUser(Integer id, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        userEntityRepository.deleteByUser(user);
        userRepository.delete(user);

        Map<String, Object> details = new HashMap<>();
        details.put("username", user.getUsername());
        auditService.log("DELETE_USER", "User", id, details, ipAddress);
    }

    @Transactional
    public void toggleUserActive(Integer id, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        user.setIsActive(!user.getIsActive());
        userRepository.save(user);

        Map<String, Object> details = new HashMap<>();
        details.put("username", user.getUsername());
        details.put("is_active", user.getIsActive());
        auditService.log("TOGGLE_USER_ACTIVE", "User", id, details, ipAddress);
    }

    @Transactional
    public void resetPassword(Integer id, String newRawPassword, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        user.setHasTemporaryPassword(true); // Forces user to change password on next login
        userRepository.save(user);

        Map<String, Object> details = new HashMap<>();
        details.put("username", user.getUsername());
        auditService.log("RESET_USER_PASSWORD", "User", id, details, ipAddress);
    }

    public List<CompanyEntity> getAssignedEntities(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return userEntityRepository.findAllByUser(user)
                .stream()
                .map(UserEntity::getCompany)
                .collect(Collectors.toList());
    }

    private Set<Integer> normalizeCompanyIds(List<Integer> companyIds) {
        if (companyIds == null || companyIds.isEmpty()) {
            return Collections.emptySet();
        }
        return companyIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
