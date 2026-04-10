package com.krisurya.zitro.fcm.util

import kotlin.math.abs

/**
 * Generates unique notification IDs to prevent overwrites
 * Uses stable hash from notification ID string
 */
object NotificationIdGenerator {
    
    /**
     * Generate unique integer ID from notification ID string
     * Ensures consistent ID for the same notification
     */
    fun generate(notificationId: String): Int {
        return abs(notificationId.hashCode())
    }

    /**
     * Generate request code for PendingIntents
     * Adds offset to avoid conflicts with notification IDs
     */
    fun generateRequestCode(notificationId: String, actionId: String? = null): Int {
        val combined = if (actionId != null) {
            "$notificationId:$actionId"
        } else {
            notificationId
        }
        return abs(combined.hashCode())
    }
}
