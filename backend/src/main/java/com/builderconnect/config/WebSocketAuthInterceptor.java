package com.builderconnect.config;

import com.builderconnect.entity.User;
import com.builderconnect.repository.ChatRoomParticipantRepository;
import com.builderconnect.security.JwtTokenProvider;
import com.builderconnect.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import org.springframework.messaging.MessageDeliveryException;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern CHAT_TOPIC_PATTERN = Pattern.compile("^/topic/chat/(\\d+)(/.*)?$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsServiceImpl userDetailsService;
    private final ChatRoomParticipantRepository participantRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);

            if (token == null) {
                log.warn("WebSocket CONNECT rejected: no token provided");
                throw new MessageDeliveryException("Authentication token required");
            }

            if (!jwtTokenProvider.validateToken(token)) {
                log.warn("WebSocket CONNECT rejected: invalid or expired token");
                throw new MessageDeliveryException("Invalid or expired authentication token");
            }

            Long userId = jwtTokenProvider.getUserIdFromToken(token);
            User user = (User) userDetailsService.loadUserById(userId);

            // Suspension must also cut off the WebSocket path: the access token stays
            // cryptographically valid for up to 30 minutes after an admin suspends the user.
            if (Boolean.TRUE.equals(user.getSuspended())) {
                log.warn("WebSocket CONNECT rejected: suspended user {}", userId);
                throw new MessageDeliveryException("Account is suspended");
            }

            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            accessor.setUser(auth);

            log.debug("WebSocket authenticated for user: {}", user.getEmail());
        }

        if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }

        return message;
    }

    /**
     * Chat room topics are member-only: any authenticated user could otherwise subscribe to
     * /topic/chat/{roomId} (and its /edit, /delete, /typing sub-destinations) and eavesdrop.
     * User queues (/user/queue/*) are per-principal and other destinations carry no
     * room-scoped data, so they remain open to any authenticated principal.
     */
    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Matcher matcher = CHAT_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            return;
        }

        Long userId = resolveUserId(accessor.getUser());
        if (userId == null) {
            log.warn("WebSocket SUBSCRIBE rejected: no authenticated principal for {}", destination);
            throw new MessageDeliveryException("Authentication required");
        }

        Long roomId = Long.valueOf(matcher.group(1));
        if (!participantRepository.existsByChatRoomIdAndUserIdAndIsActiveTrue(roomId, userId)) {
            log.warn("WebSocket SUBSCRIBE rejected: user {} is not a participant of chat room {}", userId, roomId);
            throw new MessageDeliveryException("You are not a participant in this chat room");
        }
    }

    private Long resolveUserId(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        // Try Authorization header first
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (header.startsWith("Bearer ")) {
                return header.substring(7);
            }
            return header;
        }

        // Try token header as fallback
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return tokenHeaders.get(0);
        }

        return null;
    }
}
