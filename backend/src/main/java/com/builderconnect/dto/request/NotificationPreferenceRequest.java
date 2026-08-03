package com.builderconnect.dto.request;

import lombok.Data;

@Data
public class NotificationPreferenceRequest {
    private Boolean emailNewBid;
    private Boolean emailProjectUpdate;
    private Boolean emailMessages;
    private Boolean emailOrderUpdate;
    private Boolean emailMarketing;
    private Boolean pushNewBid;
    private Boolean pushProjectUpdate;
    private Boolean pushMessages;
}
