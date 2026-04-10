package com.krisurya.zitro.fcm.model

/**
 * Predefined notification actions
 * Used by NotificationActionReceiver to handle button clicks
 */
enum class NotificationAction(val actionId: String) {
    // Order actions
    TRACK_ORDER("TRACK_ORDER"),
    CALL_DRIVER("CALL_DRIVER"),
    CALL_RESTAURANT("CALL_RESTAURANT"),
    REORDER("REORDER"),
    
    // Promotion actions
    VIEW_OFFER("VIEW_OFFER"),
    APPLY_COUPON("APPLY_COUPON"),
    
    // System actions
    OPEN_APP("OPEN_APP"),
    DISMISS("DISMISS");

    companion object {
        /**
         * Find action by ID with null safety
         */
        fun fromId(actionId: String?): NotificationAction? {
            return values().find { it.actionId == actionId }
        }
    }
}
