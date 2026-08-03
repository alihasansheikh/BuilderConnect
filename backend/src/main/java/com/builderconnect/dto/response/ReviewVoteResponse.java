package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of casting (or toggling) a helpfulness vote on a review.
 * myVote is "HELPFUL", "NOT_HELPFUL", or null when the vote was removed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewVoteResponse {

    private int helpfulCount;
    private int notHelpfulCount;
    private String myVote;
}
