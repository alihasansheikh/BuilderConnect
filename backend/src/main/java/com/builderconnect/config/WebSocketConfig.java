package com.builderconnect.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time messaging.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:5174}")
    private String allowedOriginsStr;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple memory-based message broker to send messages to clients
        // on destinations prefixed with /topic and /queue.
        // Advertise 10s/10s heartbeats so client-side heartbeats actually engage
        // (a 0,0 server value collapses the negotiated interval to none).
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(webSocketHeartbeatScheduler());

        // Prefix for messages bound for @MessageMapping annotated methods
        config.setApplicationDestinationPrefixes("/app");

        // Prefix for user-specific destinations
        config.setUserDestinationPrefix("/user");
    }

    @Bean
    public ThreadPoolTaskScheduler webSocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOriginsStr.split(",");

        // Register STOMP endpoint with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins)
                .withSockJS();

        // Also register without SockJS for native WebSocket clients
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor);
    }
}
