package com.filora.dms.dto;

import com.filora.dms.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Integer id;

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Surname/Full name is required")
    private String surname;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    // Optional password, used during creation
    private String password;

    private String role;
    private Boolean isActive;
    private Boolean hasTemporaryPassword;
    private Boolean twoFaEnabled;
    private String language;
    private Instant createdAt;

    // Assigned companies/entities IDs
    private List<Integer> assignedCompanyIds;

    public static UserDto fromEntity(User user, List<Integer> assignedCompanyIds) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .surname(user.getSurname())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .hasTemporaryPassword(user.getHasTemporaryPassword())
                .twoFaEnabled(user.getTwoFaEnabled())
                .language(user.getLanguage())
                .createdAt(user.getCreatedAt())
                .assignedCompanyIds(assignedCompanyIds)
                .build();
    }

    public User toEntity() {
        return User.builder()
                .id(this.id)
                .username(this.username)
                .surname(this.surname)
                .email(this.email)
                .passwordHash(this.password) // Map password to passwordHash temporarily
                .role(this.role != null ? this.role : "user")
                .isActive(this.isActive != null ? this.isActive : true)
                .hasTemporaryPassword(this.hasTemporaryPassword != null ? this.hasTemporaryPassword : false)
                .twoFaEnabled(this.twoFaEnabled != null ? this.twoFaEnabled : false)
                .language(this.language != null ? this.language : "fr")
                .build();
    }
}
