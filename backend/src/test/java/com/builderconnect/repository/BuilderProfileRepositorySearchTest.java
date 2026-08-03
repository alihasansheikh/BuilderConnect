package com.builderconnect.repository;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

// Base yml pins hibernate.dialect to MySQL, which silently breaks Hibernate DDL on the
// embedded H2 test database — override so create-drop actually creates the schema.
@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect")
class BuilderProfileRepositorySearchTest {

    private static final Pageable PAGE = PageRequest.of(0, 20);

    @Autowired
    private BuilderProfileRepository builderProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        // Verified + available
        saveBuilder("ali@example.com", "Ali Raza", "Prime Builders", "Karachi", true, true);
        saveBuilder("bob@example.com", "Bob Khan", "Skyline Contractors", "Lahore", true, true);
        // Verified but NOT available
        saveBuilder("cara@example.com", "Cara Sheikh", "Nova Homes", "Karachi", true, false);
        // Unverified — must never appear in results
        saveBuilder("dan@example.com", "Dan Prime", "Ghost Co", "Karachi", false, true);
    }

    @Test
    @DisplayName("Text filter matches user name, case-insensitively")
    void searchBuilders_textMatchesName() {
        Page<BuilderProfile> result = builderProfileRepository.searchBuilders(
                null, null, null, null, null, null, "ALI", PAGE);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUser().getName()).isEqualTo("Ali Raza");
    }

    @Test
    @DisplayName("Text filter matches company name, case-insensitively")
    void searchBuilders_textMatchesCompanyName() {
        Page<BuilderProfile> result = builderProfileRepository.searchBuilders(
                null, null, null, null, null, null, "skyline", PAGE);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompanyName()).isEqualTo("Skyline Contractors");
    }

    @Test
    @DisplayName("Null availability defaults to available-only verified builders")
    void searchBuilders_nullAvailability_excludesUnavailableAndUnverified() {
        Page<BuilderProfile> result = builderProfileRepository.searchBuilders(
                null, null, null, null, null, null, null, PAGE);

        assertThat(result.getContent())
                .extracting(bp -> bp.getUser().getName())
                .containsExactlyInAnyOrder("Ali Raza", "Bob Khan");
    }

    @Test
    @DisplayName("isAvailable=false includes unavailable verified builders")
    void searchBuilders_availabilityFalse_includesUnavailable() {
        Page<BuilderProfile> result = builderProfileRepository.searchBuilders(
                null, null, null, null, false, null, null, PAGE);

        assertThat(result.getContent())
                .extracting(bp -> bp.getUser().getName())
                .containsExactlyInAnyOrder("Ali Raza", "Bob Khan", "Cara Sheikh");
    }

    @Test
    @DisplayName("Text and explicit availability=false combine to find an unavailable builder")
    void searchBuilders_textAndAvailabilityFalse_findsUnavailable() {
        Page<BuilderProfile> result = builderProfileRepository.searchBuilders(
                null, null, null, null, false, null, "nova", PAGE);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompanyName()).isEqualTo("Nova Homes");
    }

    private void saveBuilder(String email, String name, String companyName, String city,
                             boolean verified, boolean available) {
        User user = userRepository.save(User.builder()
                .email(email)
                .password("hashed")
                .name(name)
                .city(city)
                .role(UserRole.BUILDER)
                .build());

        builderProfileRepository.save(BuilderProfile.builder()
                .user(user)
                .companyName(companyName)
                .isVerified(verified)
                .isAvailable(available)
                .build());
    }
}
