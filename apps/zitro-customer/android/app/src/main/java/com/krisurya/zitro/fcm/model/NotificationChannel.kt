package com.krisurya.zitro.fcm.model

import android.app.NotificationManager

/**
 * Notification channels for Zitro app
 * Defines importance level and behavior for each category
 */
enum class NotificationChannelType(
    val channelId: String,
    val channelName: String,
    val importance: Int,
    val description: String
) {
    ORDER_UPDATES(
        channelId = "ORDER_UPDATES",
        channelName = "Order Updates",
        importance = NotificationManager.IMPORTANCE_HIGH,
        description = "Real-time updates about your orders and deliveries"
    ),

    PROMOTIONS(
        channelId = "PROMOTIONS",
        channelName = "Offers & Promotions",
        importance = NotificationManager.IMPORTANCE_DEFAULT,
        description = "Special offers, discounts, and promotional campaigns"
    ),

    SYSTEM(
        channelId = "SYSTEM",
        channelName = "System Notifications",
        importance = NotificationManager.IMPORTANCE_LOW,
        description = "Account updates, app announcements, and general information"
    );

    companion object {
        /**
         * Get channel by ID with fallback to SYSTEM
         */
        fun fromId(channelId: String?): NotificationChannelType {
            return values().find { it.channelId == channelId } ?: SYSTEM
        }
    }
}
