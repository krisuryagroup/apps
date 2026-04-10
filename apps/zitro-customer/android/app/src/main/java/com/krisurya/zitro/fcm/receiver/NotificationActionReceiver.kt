package com.krisurya.zitro.fcm.receiver

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.krisurya.zitro.fcm.factory.NotificationFactory
import com.krisurya.zitro.fcm.model.NotificationAction
import com.krisurya.zitro.fcm.router.DeepLinkRouter

/**
 * BroadcastReceiver for handling notification action button clicks
 * Registered in AndroidManifest.xml:
 * <receiver android:name=".fcm.receiver.NotificationActionReceiver" android:exported="false">
 *     <intent-filter>
 *         <action android:name="com.zitro.customer.NOTIFICATION_ACTION" />
 *     </intent-filter>
 * </receiver>
 */
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NotificationActionRcvr"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != NotificationFactory.ACTION_CLICKED) {
            Log.w(TAG, "Unknown action: ${intent.action}")
            return
        }

        val notificationId = intent.getStringExtra(NotificationFactory.EXTRA_NOTIFICATION_ID)
        val actionId = intent.getStringExtra(NotificationFactory.EXTRA_ACTION_ID)
        val deepLink = intent.getStringExtra(NotificationFactory.EXTRA_DEEP_LINK)
        val androidNotificationId = intent.getIntExtra("android_notification_id", -1)

        Log.d(TAG, "Action clicked - Notification: $notificationId, Action: $actionId")

        // Validate required fields
        if (notificationId == null || actionId == null) {
            Log.e(TAG, "Missing notification ID or action ID")
            return
        }

        // Dismiss the notification
        if (androidNotificationId != -1) {
            dismissNotification(context, androidNotificationId)
        }

        // Handle the action
        handleAction(context, notificationId, actionId, deepLink)
    }

    /**
     * Handle specific action based on action ID
     */
    private fun handleAction(
        context: Context,
        notificationId: String,
        actionId: String,
        deepLink: String?
    ) {
        when (NotificationAction.fromId(actionId)) {
            NotificationAction.TRACK_ORDER -> {
                // Navigate to order tracking screen
                val trackingLink = deepLink ?: "zitro://order/track"
                DeepLinkRouter.navigate(context, trackingLink)
            }

            NotificationAction.CALL_DRIVER -> {
                // Initiate call to driver
                // TODO: Get driver phone number from deep link or backend
                Log.d(TAG, "Call driver action triggered")
                // Example: val phoneNumber = extractPhoneFromDeepLink(deepLink)
                // startPhoneCall(context, phoneNumber)
            }

            NotificationAction.CALL_RESTAURANT -> {
                // Initiate call to restaurant
                Log.d(TAG, "Call restaurant action triggered")
                // Similar to call driver
            }

            NotificationAction.REORDER -> {
                // Navigate to reorder screen
                val reorderLink = deepLink ?: "zitro://order/reorder"
                DeepLinkRouter.navigate(context, reorderLink)
            }

            NotificationAction.VIEW_OFFER -> {
                // Navigate to offer/promotion details
                val offerLink = deepLink ?: "zitro://promotions"
                DeepLinkRouter.navigate(context, offerLink)
            }

            NotificationAction.APPLY_COUPON -> {
                // Navigate to cart with coupon
                val couponLink = deepLink ?: "zitro://cart"
                DeepLinkRouter.navigate(context, couponLink)
            }

            NotificationAction.OPEN_APP -> {
                // Just open the app (main activity)
                DeepLinkRouter.navigate(context, "zitro://home")
            }

            NotificationAction.DISMISS -> {
                // Already dismissed above, no further action
                Log.d(TAG, "Notification dismissed")
            }

            null -> {
                // Unknown action, use deep link if available
                Log.w(TAG, "Unknown action ID: $actionId")
                if (deepLink != null) {
                    DeepLinkRouter.navigate(context, deepLink)
                }
            }
        }
    }

    /**
     * Dismiss notification from system tray
     */
    private fun dismissNotification(context: Context, notificationId: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(notificationId)
        Log.d(TAG, "Notification dismissed: $notificationId")
    }

    /**
     * Start phone call
     * Requires CALL_PHONE permission
     */
    private fun startPhoneCall(context: Context, phoneNumber: String) {
        try {
            val callIntent = Intent(Intent.ACTION_DIAL).apply {
                data = android.net.Uri.parse("tel:$phoneNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(callIntent)
            Log.d(TAG, "Phone call initiated: $phoneNumber")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start phone call", e)
        }
    }
}
