package com.fitbitepal.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling  // 启用定时任务
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
        System.out.println("\n" +
                "╔═══════════════════════════════════════════╗\n" +
                "║   FitBitePal Backend Started Successfully ║\n" +
                "║   API Base URL: http://localhost:8080/api ║\n" +
                "║   Swagger UI: http://localhost:8080/api/swagger-ui.html ║\n" +
                "╚═══════════════════════════════════════════╝\n");
    }
}

