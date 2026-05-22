package com.filora.dms;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class FiloraApplicationTests {

    @Test
    void generateBcryptHashes() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        System.out.println("=== BCRYPT HASHES FOR SEEDING ===");
        System.out.println("slim123 -> " + encoder.encode("slim123"));
        System.out.println("admin123 -> " + encoder.encode("admin123"));
        System.out.println("=================================");
    }
}
