package com.builderconnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * BuilderConnect v2 - Smart Construction Marketplace & Project Lifecycle Management Platform
 *
 * Main application entry point.
 *
 * @author BuilderConnect Team
 * @version 2.0.0
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class BuilderConnectApplication {

    public static void main(String[] args) {
        SpringApplication.run(BuilderConnectApplication.class, args);
    }
}
