package com.krisurya.zitro.fcm.factory

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.bumptech.glide.Glide
import com.krisurya.zitro.MainActivity
import com.krisurya.zitro.fcm.model.NotificationChannelType
import com.krisurya.zitro.fcm.model.NotificationPayload
import com.krisurya.zitro.fcm.receiver.NotificationActionReceiver
import com.krisurya.zitro.fcm.router.DeepLinkRouter
import com.krisurya.zitro.fcm.util.NotificationIdGenerator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Factory for creating and displaying notifications
 * Handles rich styles, action buttons, and deep links
 */
class NotificationFactory(private val context: Context) {

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    companion object {
        private const val TAG = "NotificationFactory"
        private const val MAX_ACTION_BUTTONS = 3
        const val ACTION_CLICKED = "com.zitro.customer.NOTIFICATION_ACTION"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
        const val EXTRA_ACTION_ID = "action_id"
        const val EXTRA_DEEP_LINK = "deep_link"
    }

    /**
     * Build and show notification
     * Handles image loading asynchronously if needed
     */
    fun showNotification(payload: NotificationPayload) {
        // Generate unique notification ID
        val notificationId = NotificationIdGenerator.generate(payload.notificationId)
        
        // Determine channel
        val channel = NotificationChannelType.fromId(payload.channelId)

        // If image URL exists, load it first then show notification
        if (payload.imageUrl != null) {
            CoroutineScope(Dispatchers.IO).launch {
                val bitmap = loadImageFromUrl(payload.imageUrl)
                withContext(Dispatchers.Main) {
                    showNotificationInternal(payload, channel, notificationId, bitmap)
                }
            }
        } else {
            showNotificationInternal(payload, channel, notificationId, null)
        }
    }

    /**
     * Internal method to build and display notification
     */
    private fun showNotificationInternal(
        payload: NotificationPayload,
        channel: NotificationChannelType,
        notificationId: Int,
        bitmap: Bitmap?
    ) {
        val builder = NotificationCompat.Builder(context, channel.channelId)
            .setSmallIcon(getSmallIcon())
            .setContentTitle(payload.title)
            .setContentText(payload.body)
            .setPriority(getPriority(payload.priority))
            .setAutoCancel(true)
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true)

        // Set color accent
        payload.accentColor?.let { colorString ->
            try {
                builder.setColor(Color.parseColor(colorString))
            } catch (e: Exception) {
                Log.w(TAG, "Invalid color: $colorString")
            }
        }

        // Set badge number
        payload.badge?.let { builder.setNumber(it) }

        // Set sound and vibration
        if (!payload.soundEnabled) {
            builder.setSilent(true)
        }
        if (!payload.vibrationEnabled) {
            builder.setVibrate(longArrayOf(0))
        }

        // Set content intent (tap on notification)
        val contentIntent = createContentIntent(payload, notificationId)
        builder.setContentIntent(contentIntent)

        // Add rich style
        if (bitmap != null) {
            builder.setStyle(
                NotificationCompat.BigPictureStyle()
                    .bigPicture(bitmap)
                    .bigLargeIcon(null as Bitmap?) // Hide large icon when expanded
            )
            builder.setLargeIcon(bitmap)
        } else {
            builder.setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(payload.body)
            )
        }

        // Add action buttons (max 3)
        payload.actionButtons?.take(MAX_ACTION_BUTTONS)?.forEach { actionButton ->
            val actionIntent = createActionIntent(
                payload.notificationId,
                actionButton.id,
                payload.deepLink,
                notificationId
            )
            builder.addAction(0, actionButton.title, actionIntent)
        }

        // Show notification
        try {
            notificationManager.notify(notificationId, builder.build())
            Log.d(TAG, "Notification shown with ID: $notificationId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show notification", e)
        }
    }

    /**
     * Create PendingIntent for notification tap
     * Opens deep link or main activity
     */
    private fun createContentIntent(payload: NotificationPayload, notificationId: Int): PendingIntent {
        val intent = if (payload.deepLink != null) {
            DeepLinkRouter.createIntent(context, payload.deepLink)
        } else {
            Intent(context, MainActivity::class.java)
        }

        intent.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_NOTIFICATION_ID, payload.notificationId)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val requestCode = NotificationIdGenerator.generateRequestCode(payload.notificationId)
        return PendingIntent.getActivity(context, requestCode, intent, flags)
    }

    /**
     * Create PendingIntent for action button
     * Triggers NotificationActionReceiver
     */
    private fun createActionIntent(
        notificationId: String,
        actionId: String,
        deepLink: String?,
        androidNotificationId: Int
    ): PendingIntent {
        val intent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = ACTION_CLICKED
            putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            putExtra(EXTRA_ACTION_ID, actionId)
            putExtra(EXTRA_DEEP_LINK, deepLink)
            putExtra("android_notification_id", androidNotificationId)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val requestCode = NotificationIdGenerator.generateRequestCode(notificationId, actionId)
        return PendingIntent.getBroadcast(context, requestCode, intent, flags)
    }

    /**
     * Load image from URL using Glide
     * Returns null if loading fails
     */
    private suspend fun loadImageFromUrl(url: String): Bitmap? = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Loading image: $url")
            Glide.with(context)
                .asBitmap()
                .load(url)
                .submit()
                .get()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load image: $url", e)
            null
        }
    }

    /**
     * Get notification priority based on payload
     */
    private fun getPriority(priority: String?): Int {
        return when (priority?.lowercase()) {
            "high" -> NotificationCompat.PRIORITY_HIGH
            "low" -> NotificationCompat.PRIORITY_LOW
            else -> NotificationCompat.PRIORITY_DEFAULT
        }
    }

    /**
     * Get small icon for notification
     * TODO: Replace with your app's notification icon
     */
    private fun getSmallIcon(): Int {
        // Return your app's notification icon resource
        // Should be a white silhouette on transparent background
        return android.R.drawable.ic_dialog_info // Replace with R.drawable.ic_notification
    }

    /**
     * Cancel a notification by ID
     */
    fun cancelNotification(notificationId: String) {
        val androidId = NotificationIdGenerator.generate(notificationId)
        notificationManager.cancel(androidId)
        Log.d(TAG, "Notification cancelled: $notificationId")
    }

    /**
     * Cancel all notifications
     */
    fun cancelAllNotifications() {
        notificationManager.cancelAll()
        Log.d(TAG, "All notifications cancelled")
    }
}
