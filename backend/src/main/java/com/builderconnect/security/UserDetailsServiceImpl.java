package com.builderconnect.security;

import com.builderconnect.entity.User;
import com.builderconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of UserDetailsService for Spring Security.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    // noRollbackFor: when called within AuthService.login's transaction (a login with a
    // non-existent email), a plain UsernameNotFoundException would mark that shared
    // transaction rollback-only, turning login's subsequent UnauthorizedException (declared
    // noRollbackFor) into an UnexpectedRollbackException (HTTP 500) instead of a clean 401.
    @Override
    @Transactional(readOnly = true, noRollbackFor = UsernameNotFoundException.class)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndDeletedFalse(email)
            .orElseThrow(() -> new UsernameNotFoundException(
                "User not found with email: " + email
            ));

        return user;
    }

    @Transactional(readOnly = true, noRollbackFor = UsernameNotFoundException.class)
    public UserDetails loadUserById(Long id) throws UsernameNotFoundException {
        User user = userRepository.findByIdAndDeletedFalse(id)
            .orElseThrow(() -> new UsernameNotFoundException(
                "User not found with id: " + id
            ));

        return user;
    }
}
