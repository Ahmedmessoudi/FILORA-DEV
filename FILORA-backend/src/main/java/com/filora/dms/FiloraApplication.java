package com.filora.dms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FiloraApplication {
    public static void main(String[] args) {
        SpringApplication.run(FiloraApplication.class, args);
    }
}
