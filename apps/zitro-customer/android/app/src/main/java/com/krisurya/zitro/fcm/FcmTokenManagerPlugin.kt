package com.krisurya.zitro.fcm

import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.krisurya.zitro.fcm.manager.TokenManager

/**
 * Capacitor plugin for FCM Token Management
 * Bridges Angular/Ionic app to Android FCM TokenManager
 */
@CapacitorPlugin(name = "FcmTokenManager")
class FcmTokenManagerPlugin : Plugin() {

    companion object {
        private const val TAG = "FcmTokenManagerPlugin"
    }

    private val tokenManager: TokenManager by lazy {
        TokenManager(context.applicationContext)
    }

    /**
     * Called from Angular after successful login
     * Saves FCM token to Firestore with user ID
     */
    @PluginMethod
    fun onUserLogin(call: PluginCall) {
        val userId = call.getString("userId")
        
        if (userId.isNullOrBlank()) {
            Log.e(TAG, "onUserLogin called with empty userId")
            call.reject("userId is required")
            return
        }

        try {
            Log.d(TAG, "onUserLogin called for userId: $userId")
            tokenManager.onUserLogin(userId)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle user login", e)
            call.reject("Failed to save FCM token", e)
        }
    }

    /**
     * Called from Angular on logout
     * Removes FCM token from Firestore
     */
    @PluginMethod
    fun onUserLogout(call: PluginCall) {
        try {
            Log.d(TAG, "onUserLogout called")
            tokenManager.onUserLogout()
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle user logout", e)
            call.reject("Failed to remove FCM token", e)
        }
    }

    /**
     * Manually refresh FCM token
     * Can be called from Angular for testing/debugging
     */
    @PluginMethod
    fun refreshToken(call: PluginCall) {
        try {
            Log.d(TAG, "refreshToken called")
            tokenManager.refreshToken()
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refresh token", e)
            call.reject("Failed to refresh FCM token", e)
        }
    }

    /**
     * Request notification permission (Android 13+)
     */
    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                // Permission is handled by Capacitor's LocalNotifications or PushNotifications plugin
                // This is just a placeholder - actual permission request should use those plugins
                Log.d(TAG, "requestNotificationPermission called - use Capacitor PushNotifications plugin")
                call.resolve()
            } else {
                Log.d(TAG, "requestNotificationPermission called - not needed below Android 13")
                call.resolve()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request notification permission", e)
            call.reject("Failed to request permission", e)
        }
    }
}
