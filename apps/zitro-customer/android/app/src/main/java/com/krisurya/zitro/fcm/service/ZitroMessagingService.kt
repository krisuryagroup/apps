package com.krisurya.zitro.fcm.service

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.krisurya.zitro.fcm.factory.NotificationFactory
import com.krisurya.zitro.fcm.manager.TokenManager
import com.krisurya.zitro.fcm.model.NotificationPayload

/**
 * Firebase Cloud Messaging Service
 * Handles incoming FCM messages and token updates
 * 
 * Registered in AndroidManifest.xml:
 * <service android:name=".fcm.service.ZitroMessagingService" android:exported="false">
 *     <intent-filter>
 *         <action android:name="com.google.firebase.MESSAGING_EVENT" />
 *     </intent-filter>
 * </service>
 */
class ZitroMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "ZitroMessagingService"
    }

    private val tokenManager by lazy { TokenManager(applicationContext) }
    private val notificationFactory by lazy { NotificationFactory(applicationContext) }

    /**
     * Called when a new FCM token is generated
     * Happens on:
     * - First app install
     * - App data cleared
     * - Device restored
     * - App reinstalled
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        
        // Save token and sync with backend
        tokenManager.onNewToken(token)
    }

    /**
     * Called when a data message is received
     * Works in foreground, background, and when app is killed
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        Log.d(TAG, "Message received from: ${message.from}")
        
        // Only process data-only messages
        if (message.data.isNotEmpty()) {
            handleDataMessage(message.data)
        } else {
            Log.w(TAG, "Received message with no data payload")
        }
    }

    /**
     * Handle data-only FCM message
     */
    private fun handleDataMessage(data: Map<String, String>) {
        Log.d(TAG, "Data payload: $data")

        // Step 1: Validate and parse payload
        val payload = NotificationPayload.fromFCMData(data)
        if (payload == null) {
            Log.e(TAG, "Failed to parse notification payload - missing required fields")
            return
        }

        // Step 2: Validate notification ID
        if (payload.notificationId.isBlank()) {
            Log.e(TAG, "Invalid notification ID")
            return
        }

        // Step 3: Defensive check for title and body
        if (payload.title.isBlank() || payload.body.isBlank()) {
            Log.e(TAG, "Title or body is empty")
            return
        }

        // Step 4: Log notification details
        Log.d(TAG, """
            Notification Details:
            - ID: ${payload.notificationId}
            - Title: ${payload.title}
            - Channel: ${payload.channelId}
            - Priority: ${payload.priority}
            - Deep Link: ${payload.deepLink}
            - Action Buttons: ${payload.actionButtons?.size ?: 0}
            - Image: ${if (payload.imageUrl != null) "Yes" else "No"}
        """.trimIndent())

        // Step 5: Build and show notification
        try {
            notificationFactory.showNotification(payload)
            Log.d(TAG, "Notification displayed successfully: ${payload.notificationId}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show notification: ${payload.notificationId}", e)
        }
    }

    /**
     * Called when message couldn't be delivered within TTL
     * Or when there are too many pending messages
     */
    override fun onDeletedMessages() {
        super.onDeletedMessages()
        Log.w(TAG, "Some messages were deleted before delivery")
        
        // Optional: Show a generic notification to user
        // Or sync with server to fetch missed notifications
    }

    /**
     * Called when there's an error sending a message to FCM
     */
    override fun onMessageSent(msgId: String) {
        super.onMessageSent(msgId)
        Log.d(TAG, "Message sent successfully: $msgId")
    }

    /**
     * Called when sending a message failed
     */
    override fun onSendError(msgId: String, exception: Exception) {
        super.onSendError(msgId, exception)
        Log.e(TAG, "Failed to send message: $msgId", exception)
    }
}
