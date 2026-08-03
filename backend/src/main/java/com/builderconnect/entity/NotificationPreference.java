package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Column(name = "email_new_bid", nullable = false)
    private Boolean emailNewBid = true;

    @Builder.Default
    @Column(name = "email_project_update", nullable = false)
    private Boolean emailProjectUpdate = true;

    @Builder.Default
    @Column(name = "email_messages", nullable = false)
    private Boolean emailMessages = true;

    @Builder.Default
    @Column(name = "email_order_update", nullable = false)
    private Boolean emailOrderUpdate = true;

    @Builder.Default
    @Column(name = "email_marketing", nullable = false)
    private Boolean emailMarketing = false;

    @Builder.Default
    @Column(name = "push_new_bid", nullable = false)
    private Boolean pushNewBid = true;

    @Builder.Default
    @Column(name = "push_project_update", nullable = false)
    private Boolean pushProjectUpdate = true;

    @Builder.Default
    @Column(name = "push_messages", nullable = false)
    private Boolean pushMessages = true;
}
