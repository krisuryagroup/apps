package com.krisurya.zitro

import android.app.Application
import android.util.Log
import com.krisurya.zitro.fcm.manager.NotificationChannelManager
import com.krisurya.zitro.fcm.manager.TokenManager

/**
 * Zitro Application class
 * Initializes FCM notification system on app launch
 */
class ZitroApplication : Application() {

    companion object {
        private const val TAG = "ZitroApplication"
    }

    override fun onCreate() {
        super.onCreate()
        
        Log.d(TAG, "Initializing Zitro Application")
        
        // Initialize notification channels (ORDER_UPDATES, PROMOTIONS, SYSTEM)
        try {
            NotificationChannelManager(this).createAllChannels()
            Log.d(TAG, "Notification channels created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create notification channels", e)
        }
        
        // Refresh FCM token
        try {
            TokenManager(this).refreshToken()
            Log.d(TAG, "FCM token refresh initiated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refresh FCM token", e)
        }
    }
}
