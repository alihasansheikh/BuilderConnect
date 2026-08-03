package com.builderconnect.dto.response;

import com.builderconnect.entity.NotificationPreference;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationPreferenceResponse {
    private boolean emailNewBid;
    private boolean emailProjectUpdate;
    private boolean emailMessages;
    private boolean emailOrderUpdate;
    private boolean emailMarketing;
    private boolean pushNewBid;
    private boolean pushProjectUpdate;
    private boolean pushMessages;

    public static NotificationPreferenceResponse fromEntity(NotificationPreference pref) {
        return NotificationPreferenceResponse.builder()
                .emailNewBid(pref.getEmailNewBid())
                .emailProjectUpdate(pref.getEmailProjectUpdate())
                .emailMessages(pref.getEmailMessages())
                .emailOrderUpdate(pref.getEmailOrderUpdate())
                .emailMarketing(pref.getEmailMarketing())
                .pushNewBid(pref.getPushNewBid())
                .pushProjectUpdate(pref.getPushProjectUpdate())
                .pushMessages(pref.getPushMessages())
                .build();
    }
}
