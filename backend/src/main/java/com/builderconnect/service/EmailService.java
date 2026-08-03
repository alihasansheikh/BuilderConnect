package com.builderconnect.service;

import com.builderconnect.entity.NotificationPreference;
import com.builderconnect.entity.User;
import com.builderconnect.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.function.Function;

/**
 * Domain-level email entry points. Each method maps a business event to a
 * template key and delegates to EmailTemplateRenderer, keeping the previous
 * hardcoded wording as fallback for when the template row is missing.
 * Only plain strings cross into the async renderer — never lazy entities.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailTemplateRenderer emailTemplateRenderer;
    private final NotificationPreferenceRepository notificationPreferenceRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public void sendVerificationEmail(User user) {
        String verificationUrl = frontendUrl + "/verify-email?token=" + user.getEmailVerificationToken();
        emailTemplateRenderer.sendTemplated("email_verification", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "verificationUrl", verificationUrl),
                "Verify your BuilderConnect account",
                """
                <p>Hello {{name}},</p>
                <p>Welcome to BuilderConnect! Please verify your email address by clicking the link below:</p>
                <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not create an account, please ignore this email.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendPasswordResetEmail(User user, String resetToken) {
        String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;
        emailTemplateRenderer.sendTemplated("password_reset", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "resetLink", resetUrl),
                "Reset your BuilderConnect password",
                """
                <p>Hello {{name}},</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <p><a href="{{resetLink}}">{{resetLink}}</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendWelcomeEmail(User user) {
        emailTemplateRenderer.sendTemplated("welcome", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "email", user.getEmail()),
                "Welcome to BuilderConnect!",
                """
                <p>Hello {{name}},</p>
                <p>Your email is verified and your BuilderConnect account is ready to use.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendProjectAwardedEmail(User builder, String projectTitle, String clientName) {
        if (blocksEmail(builder, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("project_awarded", builder.getEmail(),
                Map.of(
                        "builderName", builder.getName(),
                        "projectTitle", projectTitle,
                        "clientName", clientName,
                        "projectsUrl", frontendUrl + "/builder/projects"),
                "Congratulations! You've been awarded a project",
                """
                <p>Hello {{builderName}},</p>
                <p>Great news! You have been awarded the project "{{projectTitle}}" by {{clientName}}.</p>
                <p>Please log in to your BuilderConnect account to review the project details and start work.</p>
                <p><a href="{{projectsUrl}}">{{projectsUrl}}</a></p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendMilestoneCompletedEmail(User client, String projectTitle, String milestoneName) {
        if (blocksEmail(client, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("milestone_completed", client.getEmail(),
                Map.of(
                        "clientName", client.getName(),
                        "milestoneTitle", milestoneName,
                        "projectTitle", projectTitle,
                        "milestoneUrl", frontendUrl + "/client/projects"),
                "Milestone completed - Review required",
                """
                <p>Hello {{clientName}},</p>
                <p>The milestone "{{milestoneTitle}}" for your project "{{projectTitle}}" has been marked as complete.</p>
                <p>Please log in to review the work and approve the milestone:</p>
                <p><a href="{{milestoneUrl}}">{{milestoneUrl}}</a></p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendNewBidEmail(User client, Long projectId, String projectTitle,
                                String builderName, String bidAmount, String duration) {
        if (blocksEmail(client, NotificationPreference::getEmailNewBid)) {
            return;
        }
        String bidUrl = frontendUrl + "/client/projects/" + projectId;
        emailTemplateRenderer.sendTemplated("new_bid_notification", client.getEmail(),
                Map.of(
                        "clientName", client.getName(),
                        "projectTitle", projectTitle,
                        "builderName", builderName,
                        "bidAmount", bidAmount,
                        "duration", duration,
                        "bidUrl", bidUrl),
                "New bid received for " + projectTitle,
                """
                <p>Hello {{clientName}},</p>
                <p>A new bid has been submitted for your project "{{projectTitle}}".</p>
                <p><strong>Builder:</strong> {{builderName}}<br/><strong>Amount:</strong> PKR {{bidAmount}}<br/><strong>Duration:</strong> {{duration}} days</p>
                <p><a href="{{bidUrl}}">View Bid Details</a></p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendAccountSuspendedEmail(User user, String reason) {
        emailTemplateRenderer.sendTemplated("account_suspended", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "reason", nullToEmpty(reason)),
                "Your BuilderConnect account has been suspended",
                """
                <p>Hello {{name}},</p>
                <p>Your BuilderConnect account has been suspended for the following reason:</p>
                <p><strong>{{reason}}</strong></p>
                <p>If you believe this was a mistake, please contact our support team.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendAccountUnsuspendedEmail(User user) {
        emailTemplateRenderer.sendTemplated("account_unsuspended", user.getEmail(),
                Map.of("name", user.getName()),
                "Your BuilderConnect account has been restored",
                """
                <p>Hello {{name}},</p>
                <p>Good news! Your BuilderConnect account has been restored. You can now log in and resume using the platform.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendBuilderVerifiedEmail(User user, String companyName) {
        emailTemplateRenderer.sendTemplated("builder_verified", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "companyName", companyName != null ? companyName : user.getName()),
                "Congratulations! Your builder profile is now verified",
                """
                <p>Hello {{name}},</p>
                <p>Congratulations! {{companyName}} has been verified on BuilderConnect.</p>
                <p>Your profile now carries a verified badge, giving clients more confidence when awarding projects.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendSupplierVerifiedEmail(User user, String companyName) {
        emailTemplateRenderer.sendTemplated("supplier_verified", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "companyName", companyName != null ? companyName : user.getName()),
                "Congratulations! Your supplier profile is now verified",
                """
                <p>Hello {{name}},</p>
                <p>Congratulations! {{companyName}} has been verified on BuilderConnect.</p>
                <p>Your storefront now carries a verified badge, giving buyers more confidence when ordering your materials.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendVerificationRejectedEmail(User user, String reason) {
        emailTemplateRenderer.sendTemplated("verification_rejected", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "reason", nullToEmpty(reason)),
                "Your BuilderConnect verification request was not approved",
                """
                <p>Hello {{name}},</p>
                <p>Unfortunately, your verification request was not approved for the following reason:</p>
                <p><strong>{{reason}}</strong></p>
                <p>You can update your details and submit a new request at any time from your dashboard.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendSubscriptionReceiptEmail(User user, String planName, String amount, String periodEnd) {
        emailTemplateRenderer.sendTemplated("subscription_receipt", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "planName", nullToEmpty(planName),
                        "amount", nullToEmpty(amount),
                        "periodEnd", nullToEmpty(periodEnd)),
                "Payment received for your " + planName + " subscription",
                """
                <p>Hello {{name}},</p>
                <p>We have received your payment of <strong>PKR {{amount}}</strong> for the <strong>{{planName}}</strong> plan.</p>
                <p>Your subscription is active until <strong>{{periodEnd}}</strong>.</p>
                <p>Thank you for choosing BuilderConnect!</p>
                """);
    }

    public void sendMilestonePaymentMarkedEmail(User builder, String milestoneName,
                                                String projectTitle, String amount) {
        if (blocksEmail(builder, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("milestone_payment_marked", builder.getEmail(),
                Map.of(
                        "builderName", builder.getName(),
                        "milestoneName", milestoneName,
                        "projectTitle", projectTitle,
                        "amount", nullToEmpty(amount)),
                "Payment marked for milestone " + milestoneName,
                """
                <p>Hello {{builderName}},</p>
                <p>The client has marked a payment of <strong>PKR {{amount}}</strong> for milestone <strong>{{milestoneName}}</strong> on project <strong>{{projectTitle}}</strong>.</p>
                <p>Please review the payment proof and confirm receipt from your dashboard.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendMilestoneRejectedEmail(User builder, String milestoneName, String projectTitle, String reason) {
        if (blocksEmail(builder, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("milestone_rejected", builder.getEmail(),
                Map.of(
                        "builderName", builder.getName(),
                        "milestoneName", milestoneName,
                        "projectTitle", projectTitle,
                        "reason", nullToEmpty(reason)),
                "Changes requested for milestone " + milestoneName,
                """
                <p>Hello {{builderName}},</p>
                <p>The client has requested changes on milestone <strong>{{milestoneName}}</strong> for project <strong>{{projectTitle}}</strong>:</p>
                <p><strong>{{reason}}</strong></p>
                <p>Please review the feedback, make the necessary changes, and mark the milestone complete again.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendProjectCompletedEmail(User user, String projectTitle) {
        if (blocksEmail(user, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("project_completed", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "projectTitle", projectTitle),
                "Your project " + projectTitle + " is complete",
                """
                <p>Hello {{name}},</p>
                <p>Congratulations! All milestones on <strong>{{projectTitle}}</strong> have been paid and the project is now complete.</p>
                <p>Thank you for using BuilderConnect.</p>
                """);
    }

    public void sendMilestonePaymentConfirmedEmail(User client, String milestoneName, String projectTitle) {
        if (blocksEmail(client, NotificationPreference::getEmailProjectUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("milestone_payment_confirmed", client.getEmail(),
                Map.of(
                        "clientName", client.getName(),
                        "milestoneName", milestoneName,
                        "projectTitle", projectTitle),
                "Payment confirmed for milestone " + milestoneName,
                """
                <p>Hello {{clientName}},</p>
                <p>The builder has confirmed receipt of your payment for milestone <strong>{{milestoneName}}</strong> on project <strong>{{projectTitle}}</strong>.</p>
                <p>The project can now move on to the next stage.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendOrderPlacedEmail(User supplier, String orderNumber, String buyerName,
                                     String itemCount, String total) {
        if (blocksEmail(supplier, NotificationPreference::getEmailOrderUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("order_placed_supplier", supplier.getEmail(),
                Map.of(
                        "supplierName", supplier.getName(),
                        "orderNumber", orderNumber,
                        "buyerName", buyerName,
                        "itemCount", nullToEmpty(itemCount),
                        "total", nullToEmpty(total)),
                "New order " + orderNumber + " received",
                """
                <p>Hello {{supplierName}},</p>
                <p>You have received a new order <strong>{{orderNumber}}</strong> from {{buyerName}}.</p>
                <p><strong>Items:</strong> {{itemCount}}<br/><strong>Total:</strong> PKR {{total}}</p>
                <p>Please log in to your BuilderConnect account to confirm the order.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendOrderStatusEmail(User buyer, String orderNumber, String status) {
        if (blocksEmail(buyer, NotificationPreference::getEmailOrderUpdate)) {
            return;
        }
        emailTemplateRenderer.sendTemplated("order_status_buyer", buyer.getEmail(),
                Map.of(
                        "buyerName", buyer.getName(),
                        "orderNumber", orderNumber,
                        "status", nullToEmpty(status)),
                "Your order " + orderNumber + " is now " + status,
                """
                <p>Hello {{buyerName}},</p>
                <p>Your order <strong>{{orderNumber}}</strong> is now <strong>{{status}}</strong>.</p>
                <p>You can track your order from your BuilderConnect dashboard.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendTicketResponseEmail(User owner, String ticketNumber, String subject) {
        emailTemplateRenderer.sendTemplated("ticket_response", owner.getEmail(),
                Map.of(
                        "name", owner.getName(),
                        "ticketNumber", ticketNumber,
                        "subject", nullToEmpty(subject)),
                "New reply on your ticket " + ticketNumber,
                """
                <p>Hello {{name}},</p>
                <p>Our support team has replied to your ticket <strong>{{ticketNumber}}</strong> ({{subject}}).</p>
                <p>Please log in to your BuilderConnect account to read the reply and respond.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendTicketResolvedEmail(User owner, String ticketNumber, String subject, String resolution) {
        emailTemplateRenderer.sendTemplated("ticket_resolved", owner.getEmail(),
                Map.of(
                        "name", owner.getName(),
                        "ticketNumber", ticketNumber,
                        "subject", nullToEmpty(subject),
                        "resolution", nullToEmpty(resolution)),
                "Your ticket " + ticketNumber + " has been resolved",
                """
                <p>Hello {{name}},</p>
                <p>Your ticket <strong>{{ticketNumber}}</strong> ({{subject}}) has been resolved.</p>
                <p><strong>Resolution:</strong> {{resolution}}</p>
                <p>If this does not solve your problem, you can reopen the ticket from your BuilderConnect account.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendDisputeFiledEmail(User respondent, String disputeNumber, String projectTitle) {
        emailTemplateRenderer.sendTemplated("dispute_filed", respondent.getEmail(),
                Map.of(
                        "name", respondent.getName(),
                        "disputeNumber", disputeNumber,
                        "projectTitle", nullToEmpty(projectTitle)),
                "A dispute has been filed on " + projectTitle,
                """
                <p>Hello {{name}},</p>
                <p>Dispute <strong>{{disputeNumber}}</strong> has been filed against you on project <strong>{{projectTitle}}</strong>.</p>
                <p>Our support team will review the case. Please log in to your BuilderConnect account to view the dispute and respond.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    public void sendTeamWelcomeEmail(User user, String roleName) {
        emailTemplateRenderer.sendTemplated("team_welcome", user.getEmail(),
                Map.of(
                        "name", user.getName(),
                        "role", nullToEmpty(roleName)),
                "Welcome to the BuilderConnect team",
                """
                <p>Hello {{name}},</p>
                <p>An account has been created for you on BuilderConnect with the role of <strong>{{role}}</strong>.</p>
                <p>Please log in with the credentials shared with you and change your password from your account settings.</p>
                <p>Best regards,<br/>BuilderConnect Team</p>
                """);
    }

    /**
     * Opt-out check for preference-gated emails. Runs synchronously on the
     * caller's thread (inside its transaction); absent preferences mean ALLOW.
     */
    private boolean blocksEmail(User user, Function<NotificationPreference, Boolean> preference) {
        return notificationPreferenceRepository.findByUserId(user.getId())
                .map(prefs -> Boolean.FALSE.equals(preference.apply(prefs)))
                .orElse(false);
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
