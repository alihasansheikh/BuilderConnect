package com.builderconnect.service;

import com.builderconnect.dto.request.TicketResponseRequest;
import com.builderconnect.dto.response.SupportTicketResponse;
import com.builderconnect.entity.SupportTicket;
import com.builderconnect.entity.SupportTicket.TicketCategory;
import com.builderconnect.entity.SupportTicket.TicketStatus;
import com.builderconnect.entity.TicketResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.SupportTicketRepository;
import com.builderconnect.repository.TicketResponseRepository;
import com.builderconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupportTicketServiceTest {

    private static final long TICKET_ID = 5L;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private TicketResponseRepository ticketResponseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private SupportTicketService supportTicketService;

    private User owner;
    private User agent;
    private SupportTicket ticket;

    @BeforeEach
    void setUp() {
        owner = user(2L, "client1@example.com", UserRole.CLIENT);
        agent = user(1L, "support@builderconnect.pk", UserRole.SUPPORT_AGENT);
        ticket = SupportTicket.builder()
                .ticketNumber("TKT-2026-00005")
                .user(owner)
                .category(TicketCategory.TECHNICAL)
                .subject("App broken")
                .description("Something is wrong")
                .build();
        ticket.setId(TICKET_ID);
    }

    @Test
    @DisplayName("Agent reply on an OPEN ticket flips it to IN_PROGRESS and notifies the owner")
    void addResponse_agentReplyOnOpen_flipsToInProgressAndNotifiesOwner() {
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        stubResponseSave();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        supportTicketService.addResponse(agent, TICKET_ID,
                TicketResponseRequest.builder().message("We are looking into it").build());

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        verify(notificationService).createNotification(eq(owner), eq(NotificationType.TICKET_UPDATED),
                anyString(), anyString(), eq("support_ticket"), eq(TICKET_ID),
                eq("/client/support/tickets/" + TICKET_ID));
        verify(emailService).sendTicketResponseEmail(owner, "TKT-2026-00005", "App broken");
    }

    @Test
    @DisplayName("Internal agent note still flips OPEN to IN_PROGRESS but does not notify the owner")
    void addResponse_internalNote_noOwnerNotification() {
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        stubResponseSave();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        supportTicketService.addResponse(agent, TICKET_ID,
                TicketResponseRequest.builder().message("Checking logs").isInternal(true).build());

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        verify(notificationService, never()).createNotification(any(), any(), any(), any(),
                any(), any(), any());
        verify(emailService, never()).sendTicketResponseEmail(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Owner reply flips WAITING_CUSTOMER to WAITING_INTERNAL and notifies support agents")
    void addResponse_ownerReply_notifiesSupportAgents() {
        ticket.updateStatus(TicketStatus.WAITING_CUSTOMER);
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        stubResponseSave();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        supportTicketService.addResponse(owner, TICKET_ID,
                TicketResponseRequest.builder().message("Still broken").build());

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.WAITING_INTERNAL);
        verify(notificationService).notifySupportAgents(eq(NotificationType.TICKET_UPDATED),
                anyString(), anyString(), eq("support_ticket"), eq(TICKET_ID),
                eq("/support/tickets/" + TICKET_ID));
    }

    @Test
    @DisplayName("escalateTicket sets the flag and notifies admins")
    void escalateTicket_setsFlagAndNotifiesAdmins() {
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketResponseRepository.countByTicketId(TICKET_ID)).thenReturn(0L);

        SupportTicketResponse response = supportTicketService.escalateTicket(agent, TICKET_ID);

        assertThat(ticket.isEscalated()).isTrue();
        assertThat(response.isEscalated()).isTrue();
        verify(notificationService).notifyAdmins(eq(NotificationType.TICKET_UPDATED),
                anyString(), anyString(), eq("support_ticket"), eq(TICKET_ID),
                eq("/support/tickets/" + TICKET_ID));
    }

    @Test
    @DisplayName("escalateTicket on an already-escalated ticket is rejected")
    void escalateTicket_alreadyEscalated_throwsBadRequest() {
        ticket.escalate();
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> supportTicketService.escalateTicket(agent, TICKET_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already escalated");

        verify(notificationService, never()).notifyAdmins(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("resolveTicket notifies the owner and sends the ticket_resolved email")
    void resolveTicket_notifiesOwnerAndSendsEmail() {
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        supportTicketService.resolveTicket(agent, TICKET_ID, "Cleared the cache");

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.RESOLVED);
        verify(notificationService).createNotification(eq(owner), eq(NotificationType.TICKET_UPDATED),
                anyString(), anyString(), eq("support_ticket"), eq(TICKET_ID),
                eq("/client/support/tickets/" + TICKET_ID));
        verify(emailService).sendTicketResolvedEmail(owner, "TKT-2026-00005", "App broken", "Cleared the cache");
    }

    @Test
    @DisplayName("reopenTicket notifies support agents")
    void reopenTicket_notifiesSupportAgents() {
        ticket.resolve(agent.getId(), "Done");
        when(supportTicketRepository.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        supportTicketService.reopenTicket(owner, TICKET_ID);

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.REOPENED);
        verify(notificationService).notifySupportAgents(eq(NotificationType.TICKET_UPDATED),
                anyString(), anyString(), eq("support_ticket"), eq(TICKET_ID),
                eq("/support/tickets/" + TICKET_ID));
    }

    @Test
    @DisplayName("getUserTickets honors the status filter")
    void getUserTickets_statusFilter_usesFilteredQuery() {
        Pageable pageable = PageRequest.of(0, 10);
        when(supportTicketRepository.findByUserIdAndStatusOrderByCreatedAtDesc(
                owner.getId(), TicketStatus.OPEN, pageable))
                .thenReturn(new PageImpl<>(List.of(ticket), pageable, 1));
        when(ticketResponseRepository.countByTicketId(TICKET_ID)).thenReturn(0L);

        Page<SupportTicketResponse> result = supportTicketService.getUserTickets(owner, "OPEN", pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(supportTicketRepository, never()).findByUserIdOrderByCreatedAtDesc(anyLong(), any());
    }

    @Test
    @DisplayName("getUserTickets rejects an invalid status")
    void getUserTickets_invalidStatus_throwsBadRequest() {
        assertThatThrownBy(() -> supportTicketService.getUserTickets(owner, "NOT_A_STATUS",
                PageRequest.of(0, 10)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid status");
    }

    private void stubResponseSave() {
        when(ticketResponseRepository.save(any(TicketResponse.class))).thenAnswer(inv -> {
            TicketResponse r = inv.getArgument(0);
            r.setId(9L);
            return r;
        });
    }

    private User user(Long id, String email, UserRole role) {
        User u = User.builder()
                .email(email)
                .name("User " + id)
                .role(role)
                .build();
        u.setId(id);
        return u;
    }
}
