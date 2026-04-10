package com.krisurya.zitro.fcm.model

import org.json.JSONArray
import org.json.JSONException

/**
 * Data class representing the FCM notification payload
 * Maps from data-only FCM message
 */
data class NotificationPayload(
    val notificationId: String,
    val title: String,
    val body: String,
    val channelId: String,
    val priority: String? = "default",
    val imageUrl: String? = null,
    val deepLink: String? = null,
    val actionButtons: List<ActionButton>? = null,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val accentColor: String? = null,
    val badge: Int? = null
) {
    companion object {
        /**
         * Parse FCM data payload with defensive validation
         * Returns null if required fields are missing
         */
        fun fromFCMData(data: Map<String, String>): NotificationPayload? {
            return try {
                // Validate required fields
                val notificationId = data["notificationId"] ?: return null
                val title = data["title"] ?: return null
                val body = data["body"] ?: return null
                val channelId = data["channelId"] ?: "SYSTEM"

                // Parse optional fields
                val actionButtons = data["actionButtons"]?.let { parseActionButtons(it) }
                val soundEnabled = data["soundEnabled"]?.toBoolean() ?: true
                val vibrationEnabled = data["vibrationEnabled"]?.toBoolean() ?: true
                val badge = data["badge"]?.toIntOrNull()

                NotificationPayload(
                    notificationId = notificationId,
                    title = title,
                    body = body,
                    channelId = channelId,
                    priority = data["priority"],
                    imageUrl = data["imageUrl"],
                    deepLink = data["deepLink"],
                    actionButtons = actionButtons,
                    soundEnabled = soundEnabled,
                    vibrationEnabled = vibrationEnabled,
                    accentColor = data["accentColor"],
                    badge = badge
                )
            } catch (e: Exception) {
                android.util.Log.e("NotificationPayload", "Failed to parse FCM data", e)
                null
            }
        }

        /**
         * Parse action buttons JSON array
         * Format: [{"id":"TRACK_ORDER","title":"Track"},{"id":"CALL_DRIVER","title":"Call"}]
         */
        private fun parseActionButtons(jsonString: String): List<ActionButton>? {
            return try {
                val jsonArray = JSONArray(jsonString)
                val buttons = mutableListOf<ActionButton>()

                for (i in 0 until jsonArray.length()) {
                    val jsonObject = jsonArray.getJSONObject(i)
                    val id = jsonObject.optString("id") ?: continue
                    val title = jsonObject.optString("title") ?: continue

                    buttons.add(ActionButton(id, title))
                }

                if (buttons.isNotEmpty()) buttons else null
            } catch (e: JSONException) {
                android.util.Log.e("NotificationPayload", "Failed to parse action buttons", e)
                null
            }
        }
    }
}

/**
 * Action button configuration
 */
data class ActionButton(
    val id: String,  // e.g., "TRACK_ORDER", "CALL_DRIVER", "VIEW_OFFER"
    val title: String // Display text
)
