package com.builderconnect.service;

import com.builderconnect.entity.Dispute;
import com.builderconnect.entity.SupportTicket;
import com.builderconnect.repository.AuditLogRepository;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.DisputeRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SubscriptionPaymentRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.SupportTicketRepository;
import com.builderconnect.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceMetricsTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BuilderProfileRepository builderProfileRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private BidRepository bidRepository;

    @Mock
    private SubscriptionPaymentRepository subscriptionPaymentRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private ReviewService reviewService;

    @Mock
    private BadgeService badgeService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AdminService adminService;

    @Test
    @DisplayName("getMetrics reports support ticket and dispute counts including escalations")
    void getMetrics_includesTicketAndDisputeCounts() {
        when(subscriptionPaymentRepository.findByPaidAtAfterOrderByPaidAtDesc(any())).thenReturn(List.of());
        when(supportTicketRepository.countByStatus(SupportTicket.TicketStatus.OPEN)).thenReturn(4L);
        when(supportTicketRepository.countByStatus(SupportTicket.TicketStatus.IN_PROGRESS)).thenReturn(2L);
        when(supportTicketRepository.countByEscalatedTrue()).thenReturn(3L);
        when(disputeRepository.countByStatus(Dispute.DisputeStatus.FILED)).thenReturn(1L);
        when(disputeRepository.countByStatus(Dispute.DisputeStatus.UNDER_REVIEW)).thenReturn(0L);
        when(disputeRepository.countByStatus(Dispute.DisputeStatus.ESCALATED)).thenReturn(5L);

        Map<String, Object> metrics = adminService.getMetrics();

        @SuppressWarnings("unchecked")
        Map<String, Long> tickets = (Map<String, Long>) metrics.get("tickets");
        assertThat(tickets.get("open")).isEqualTo(4L);
        assertThat(tickets.get("inProgress")).isEqualTo(2L);
        assertThat(tickets.get("escalated")).isEqualTo(3L);

        @SuppressWarnings("unchecked")
        Map<String, Long> disputes = (Map<String, Long>) metrics.get("disputes");
        assertThat(disputes.get("filed")).isEqualTo(1L);
        assertThat(disputes.get("escalated")).isEqualTo(5L);
    }
}
