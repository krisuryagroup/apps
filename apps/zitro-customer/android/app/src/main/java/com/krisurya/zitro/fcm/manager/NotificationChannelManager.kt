package com.krisurya.zitro.fcm.manager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import androidx.annotation.RequiresApi
import com.krisurya.zitro.fcm.model.NotificationChannelType

/**
 * Manages notification channels for Android O+
 * Creates and configures channels for different notification types
 */
class NotificationChannelManager(private val context: Context) {

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    companion object {
        private const val TAG = "ChannelManager"
    }

    /**
     * Create all notification channels
     * Call this on app launch (Application.onCreate)
     */
    fun createAllChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannelType.values().forEach { channelType ->
                createChannel(channelType)
            }
            android.util.Log.d(TAG, "All notification channels created")
        }
    }

    /**
     * Create a single notification channel
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun createChannel(channelType: NotificationChannelType) {
        val channel = NotificationChannel(
            channelType.channelId,
            channelType.channelName,
            channelType.importance
        ).apply {
            description = channelType.description
            
            // Configure channel behavior based on type
            when (channelType) {
                NotificationChannelType.ORDER_UPDATES -> {
                    enableLights(true)
                    enableVibration(true)
                    setShowBadge(true)
                    lightColor = android.graphics.Color.parseColor("#FF5722")
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    
                    // Set custom sound if available
                    val soundUri = android.net.Uri.parse(
                        "android.resource://${context.packageName}/raw/order_notification"
                    )
                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    setSound(soundUri, audioAttributes)
                }
                
                NotificationChannelType.PROMOTIONS -> {
                    enableLights(true)
                    enableVibration(true)
                    setShowBadge(true)
                    lightColor = android.graphics.Color.parseColor("#4CAF50")
                }
                
                NotificationChannelType.SYSTEM -> {
                    enableLights(false)
                    enableVibration(false)
                    setShowBadge(false)
                }
            }
        }

        notificationManager.createNotificationChannel(channel)
        android.util.Log.d(TAG, "Channel created: ${channelType.channelName}")
    }

    /**
     * Check if a specific channel exists
     */
    fun isChannelCreated(channelId: String): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.getNotificationChannel(channelId) != null
        } else {
            true // Channels not needed below Android O
        }
    }

    /**
     * Delete a notification channel
     * Note: Users can recreate deleted channels from system settings
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun deleteChannel(channelId: String) {
        notificationManager.deleteNotificationChannel(channelId)
        android.util.Log.d(TAG, "Channel deleted: $channelId")
    }

    /**
     * Update channel importance (requires channel deletion and recreation)
     */
    fun updateChannelImportance(channelType: NotificationChannelType) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            deleteChannel(channelType.channelId)
            createChannel(channelType)
        }
    }

    /**
     * Check if notifications are enabled for the app
     */
    fun areNotificationsEnabled(): Boolean {
        return notificationManager.areNotificationsEnabled()
    }

    /**
     * Check if a specific channel is blocked by user
     */
    fun isChannelBlocked(channelId: String): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = notificationManager.getNotificationChannel(channelId)
            channel?.importance == NotificationManager.IMPORTANCE_NONE
        } else {
            false
        }
    }
}
