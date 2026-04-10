package com.krisurya.zitro.fcm.manager

import android.content.Context
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Manages FCM token lifecycle and synchronization with backend
 * Handles token refresh, user login/logout, and Firestore persistence
 */
class TokenManager(private val context: Context) {

    private val firestore = FirebaseFirestore.getInstance()
    private val prefs = context.getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
    
    companion object {
        private const val TAG = "TokenManager"
        private const val PREF_FCM_TOKEN = "fcm_token"
        private const val PREF_USER_ID = "user_id"
        private const val PREF_TOKEN_ID = "token_id"
    }

    /**
     * Refresh FCM token and save locally
     * Call this on app launch
     */
    fun refreshToken() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val token = FirebaseMessaging.getInstance().token.await()
                saveTokenLocally(token)
                
                // If user is logged in, sync with backend
                val userId = getCurrentUserId()
                if (userId != null) {
                    saveTokenToFirestore(userId, token)
                }
                
                Log.d(TAG, "Token refreshed successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to refresh token", e)
            }
        }
    }

    /**
     * Handle new token from Firebase
     * Called automatically by FCM when token changes
     */
    fun onNewToken(token: String) {
        Log.d(TAG, "New token received: $token")
        saveTokenLocally(token)
        
        // Sync with backend if user is logged in
        val userId = getCurrentUserId()
        if (userId != null) {
            CoroutineScope(Dispatchers.IO).launch {
                saveTokenToFirestore(userId, token)
            }
        }
    }

    /**
     * Called when user logs in
     * Associates token with user account in Firestore
     */
    fun onUserLogin(userId: String) {
        Log.d(TAG, "User logged in: $userId")
        prefs.edit().putString(PREF_USER_ID, userId).apply()
        
        // Get current token and save to Firestore
        val token = getLocalToken()
        if (token != null) {
            CoroutineScope(Dispatchers.IO).launch {
                saveTokenToFirestore(userId, token)
            }
        } else {
            // Token not available yet, request it
            refreshToken()
        }
    }

    /**
     * Called when user logs out
     * Removes token from Firestore
     */
    fun onUserLogout() {
        val userId = getCurrentUserId()
        val tokenId = getTokenId()
        
        Log.d(TAG, "User logged out: $userId")
        
        if (userId != null && tokenId != null) {
            CoroutineScope(Dispatchers.IO).launch {
                deleteTokenFromFirestore(userId, tokenId)
            }
        }
        
        // Clear user ID but keep token for future logins
        prefs.edit()
            .remove(PREF_USER_ID)
            .remove(PREF_TOKEN_ID)
            .apply()
    }

    /**
     * Save token to Firestore: /onlineUsers/{userId}/fcmTokens/{tokenId}
     */
    private suspend fun saveTokenToFirestore(userId: String, token: String) {
        try {
            val deviceInfo = getDeviceInfo()
            
            val tokenData = hashMapOf(
                "token" to token,
                "platform" to "android",
                "deviceId" to deviceInfo.deviceId,
                "appVersion" to deviceInfo.appVersion,
                "isActive" to true,
                "createdAt" to com.google.firebase.Timestamp.now(),
                "lastUsedAt" to com.google.firebase.Timestamp.now()
            )

            // Use deviceId as document ID for uniqueness
            firestore.collection("onlineUsers")
                .document(userId)
                .collection("fcmTokens")
                .document(deviceInfo.deviceId)
                .set(tokenData)
                .await()

            // Save device ID for future reference
            prefs.edit().putString(PREF_TOKEN_ID, deviceInfo.deviceId).apply()
            
            Log.d(TAG, "Token saved to Firestore: ${deviceInfo.deviceId}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save token to Firestore", e)
        }
    }

    /**
     * Mark token as inactive on logout (instead of deleting)
     */
    private suspend fun deleteTokenFromFirestore(userId: String, tokenId: String) {
        try {
            firestore.collection("onlineUsers")
                .document(userId)
                .collection("fcmTokens")
                .document(tokenId)
                .update(
                    mapOf(
                        "isActive" to false,
                        "lastUsedAt" to com.google.firebase.Timestamp.now()
                    )
                )
                .await()

            Log.d(TAG, "Token marked as inactive in Firestore: $tokenId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mark token as inactive in Firestore", e)
        }
    }

    /**
     * Save token to SharedPreferences
     */
    private fun saveTokenLocally(token: String) {
        prefs.edit().putString(PREF_FCM_TOKEN, token).apply()
    }

    /**
     * Get locally stored token
     */
    private fun getLocalToken(): String? {
        return prefs.getString(PREF_FCM_TOKEN, null)
    }

    /**
     * Get current user ID
     */
    private fun getCurrentUserId(): String? {
        return prefs.getString(PREF_USER_ID, null)
    }

    /**
     * Get saved token ID
     */
    private fun getTokenId(): String? {
        return prefs.getString(PREF_TOKEN_ID, null)
    }

    /**
     * Collect device information
     */
    private fun getDeviceInfo(): DeviceInfo {
        return DeviceInfo(
            deviceId = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            ) ?: "unknown",
            appVersion = try {
                context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
            } catch (e: Exception) {
                "unknown"
            }
        )
    }

    private data class DeviceInfo(
        val deviceId: String,
        val appVersion: String
    )
}
