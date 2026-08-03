package com.builderconnect.repository;

import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for User entity operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndDeletedFalse(String email);

    Optional<User> findByIdAndDeletedFalse(Long id);

    boolean existsByEmailAndDeletedFalse(String email);

    Page<User> findByDeletedFalse(Pageable pageable);

    Page<User> findByRoleAndDeletedFalse(UserRole role, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.role = :role AND u.city = :city")
    Page<User> findByRoleAndCity(@Param("role") UserRole role, @Param("city") String city, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.role = :role AND u.active = true")
    List<User> findActiveUsersByRole(@Param("role") UserRole role);

    Optional<User> findByEmailVerificationTokenAndDeletedFalse(String token);

    Optional<User> findByPasswordResetTokenAndDeletedFalse(String token);

    Optional<User> findByRefreshTokenAndDeletedFalse(String refreshToken);

    @Query("SELECT COUNT(u) FROM User u WHERE u.deleted = false AND u.role = :role")
    long countByRole(@Param("role") UserRole role);

    @Query("SELECT u.city, COUNT(u) FROM User u WHERE u.deleted = false AND u.role = :role GROUP BY u.city")
    List<Object[]> countByRoleGroupedByCity(@Param("role") UserRole role);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.role = :role AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsersByRole(@Param("role") UserRole role, @Param("search") String search, Pageable pageable);

    List<User> findByRoleInAndDeletedFalseOrderByCreatedAtDesc(List<UserRole> roles);
}
