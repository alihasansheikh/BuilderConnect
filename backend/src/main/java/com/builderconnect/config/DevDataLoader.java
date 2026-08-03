package com.builderconnect.config;

import com.builderconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Development data loader that ensures test users have correct passwords.
 * Only runs in dev profile.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String TEST_PASSWORD = "password";

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Running DevDataLoader - updating seed user passwords...");

        String encodedPassword = passwordEncoder.encode(TEST_PASSWORD);

        userRepository.findAll().forEach(user -> {
            // Only reset the seeded demo accounts — a runtime-registered user keeps the
            // password they chose across dev restarts.
            if (!isSeedAccount(user.getEmail())) {
                return;
            }
            user.setPassword(encodedPassword);
            userRepository.save(user);
            log.debug("Updated password for user: {}", user.getEmail());
        });

        log.info("DevDataLoader completed - seed users now have password: '{}'", TEST_PASSWORD);
    }

    private static boolean isSeedAccount(String email) {
        return email != null
            && (email.endsWith("@example.com")
                || email.endsWith("@builderconnect.pk")
                // Super-admin seed account was renamed to a personal address; keep it
                // in the demo-reset allow-list (specific email, not the whole @gmail.com
                // domain, so runtime-registered Gmail users keep their chosen password).
                || email.equals("alihasansheikh01@gmail.com"));
    }
}
