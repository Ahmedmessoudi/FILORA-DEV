package com.filora.dms.controller;

import com.filora.dms.dto.ApiResponse;
import com.filora.dms.dto.UserDto;
import com.filora.dms.entity.CompanyEntity;
import com.filora.dms.entity.User;
import com.filora.dms.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers().stream()
                .map(user -> {
                    List<Integer> assignedIds = userService.getAssignedEntities(user.getId())
                            .stream().map(CompanyEntity::getId).collect(Collectors.toList());
                    return UserDto.fromEntity(user, assignedIds);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Integer id) {
        User user = userService.getUserById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        List<Integer> assignedIds = userService.getAssignedEntities(user.getId())
                .stream().map(CompanyEntity::getId).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", UserDto.fromEntity(user, assignedIds)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @Valid @RequestBody UserDto userDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        User user = userDto.toEntity();
        
        // Pass temporary raw password for BCrypt hashing inside the service
        user.setPasswordHash(userDto.getPassword()); 
        
        User created = userService.createUser(user, userDto.getAssignedCompanyIds(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("User created successfully", UserDto.fromEntity(created, userDto.getAssignedCompanyIds())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable Integer id,
            @Valid @RequestBody UserDto userDto,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        User updated = userService.updateUser(id, userDto.toEntity(), userDto.getAssignedCompanyIds(), ipAddress);
        return ResponseEntity.ok(ApiResponse.success("User updated successfully", UserDto.fromEntity(updated, userDto.getAssignedCompanyIds())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        userService.deleteUser(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

    @PostMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<Void>> toggleUserActive(
            @PathVariable Integer id,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        userService.toggleUserActive(id, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("User active state toggled"));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Integer id,
            @RequestParam String newPassword,
            HttpServletRequest request) {
        
        String ipAddress = request.getRemoteAddr();
        userService.resetPassword(id, newPassword, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("User password reset successfully"));
    }
}
