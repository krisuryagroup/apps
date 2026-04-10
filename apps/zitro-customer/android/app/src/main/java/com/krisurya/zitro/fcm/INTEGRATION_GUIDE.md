# FCM Integration Guide for Zitro Android App

## Complete Implementation Checklist

### ✅ Files Created
All 10 Kotlin files have been created in the correct package structure:

```
com.zitro.customer.fcm/
├── service/ZitroMessagingService.kt
├── factory/NotificationFactory.kt
├── manager/NotificationChannelManager.kt
├── manager/TokenManager.kt
├── receiver/NotificationActionReceiver.kt
├── router/DeepLinkRouter.kt
├── model/NotificationPayload.kt
├── model/NotificationChannel.kt
├── model/NotificationAction.kt
└── util/NotificationIdGenerator.kt
```

---

## Step 1: Update AndroidManifest.xml

Add these entries inside `<application>` tag:

```xml
<!-- Firebase Messaging Service -->
<service
    android:name=".fcm.service.ZitroMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

<!-- Notification Action Receiver -->
<receiver
    android:name=".fcm.receiver.NotificationActionReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="com.zitro.customer.NOTIFICATION_ACTION" />
    </intent-filter>
</receiver>
```

---

## Step 2: Update build.gradle (app level)

```gradle
dependencies {
    // Firebase
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
    implementation 'com.google.firebase:firebase-firestore:24.10.0'
    
    // Image Loading (for rich notifications)
    implementation 'com.github.bumptech.glide:glide:4.16.0'
    annotationProcessor 'com.github.bumptech.glide:compiler:4.16.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'
}
```

---

## Step 3: Initialize in Application Class

```kotlin
class ZitroApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize notification channels
        NotificationChannelManager(this).createAllChannels()
        
        // Refresh FCM token
        TokenManager(this).refreshToken()
    }
}
```

Register in AndroidManifest.xml:
```xml
<application
    android:name=".ZitroApplication"
    ...>
```

---

## Step 4: Handle User Login/Logout

### On Login (after successful authentication):

```kotlin
// In your LoginActivity or AuthViewModel
val userId = "user_12345" // From your auth system
TokenManager(context).onUserLogin(userId)
```

### On Logout:

```kotlin
// In your LogoutActivity or ProfileFragment
TokenManager(context).onUserLogout()
```

---

## Step 5: Handle Deep Links in MainActivity

Add this to your MainActivity:

```kotlin
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Handle deep link from notification
        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        intent?.let {
            val deepLinkData = DeepLinkRouter.handleDeepLink(it)
            deepLinkData?.let { data ->
                Log.d("MainActivity", "Deep link: Screen=${data.screen}, Action=${data.action}")
                
                // Route to appropriate screen based on deep link
                when (data.screen) {
                    "order" -> when (data.action) {
                        "details" -> navigateToOrderDetails(data.orderId)
                        "track" -> navigateToOrderTracking(data.orderId)
                        "reorder" -> navigateToReorder(data.orderId)
                    }
                    
                    "restaurant" -> when (data.action) {
                        "menu" -> navigateToRestaurantMenu(data.restaurantId)
                    }
                    
                    "promotions" -> {
                        navigateToPromotions(data.offerId)
                    }
                    
                    "cart" -> navigateToCart()
                    
                    "home" -> {
                        // Already on home, do nothing or refresh
                    }
                }
            }
        }
    }

    private fun navigateToOrderDetails(orderId: String?) {
        // TODO: Navigate to order details screen
        Log.d("MainActivity", "Navigate to order details: $orderId")
    }

    private fun navigateToOrderTracking(orderId: String?) {
        // TODO: Navigate to order tracking screen
        Log.d("MainActivity", "Navigate to order tracking: $orderId")
    }

    private fun navigateToRestaurantMenu(restaurantId: String?) {
        // TODO: Navigate to restaurant menu screen
        Log.d("MainActivity", "Navigate to restaurant menu: $restaurantId")
    }

    private fun navigateToPromotions(offerId: String?) {
        // TODO: Navigate to promotions screen
        Log.d("MainActivity", "Navigate to promotions: $offerId")
    }

    private fun navigateToCart() {
        // TODO: Navigate to cart screen
        Log.d("MainActivity", "Navigate to cart")
    }

    private fun navigateToReorder(orderId: String?) {
        // TODO: Navigate to reorder screen
        Log.d("MainActivity", "Navigate to reorder: $orderId")
    }
}
```

---

## Step 6: Update Notification Icon

Replace the placeholder icon in `NotificationFactory.kt`:

```kotlin
private fun getSmallIcon(): Int {
    return R.drawable.ic_notification // Create this icon
}
```

**Icon requirements:**
- White silhouette on transparent background
- 24x24dp size
- Place in `res/drawable/ic_notification.xml`

Example vector drawable:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2z"/>
</vector>
```

---

## Step 7: Test Notification Reception

### Test with Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Send test message with data-only payload:

```json
{
  "notificationId": "test_001",
  "title": "Test Order Update 🍕",
  "body": "Your pizza will arrive in 10 minutes!",
  "channelId": "ORDER_UPDATES",
  "priority": "high",
  "imageUrl": "https://example.com/pizza.jpg",
  "deepLink": "zitro://order/details?orderId=ORD123",
  "actionButtons": "[{\"id\":\"TRACK_ORDER\",\"title\":\"Track\"},{\"id\":\"CALL_DRIVER\",\"title\":\"Call\"}]",
  "soundEnabled": "true",
  "vibrationEnabled": "true",
  "accentColor": "#FF5722"
}
```

### Expected Behavior:
- ✅ Notification appears in system tray
- ✅ Shows large image (if imageUrl provided)
- ✅ Action buttons are clickable
- ✅ Tapping notification opens deep link
- ✅ Works when app is killed, background, or foreground

---

## Step 8: Backend Integration

Your backend (Firebase Cloud Functions) should send data-only messages:

```javascript
const message = {
  data: {
    notificationId: notification.id,
    title: notification.title,
    body: notification.body,
    channelId: notification.channelId,
    priority: notification.priority || 'default',
    imageUrl: notification.imageUrl || '',
    deepLink: notification.deepLink || '',
    actionButtons: JSON.stringify(notification.actionButtons || []),
    soundEnabled: String(notification.soundEnabled ?? true),
    vibrationEnabled: String(notification.vibrationEnabled ?? true),
    accentColor: notification.accentColor || ''
  },
  tokens: userTokens // Array of FCM tokens
};

await admin.messaging().sendEachForMulticast(message);
```

**Important:** All values must be strings in the `data` object.

---

## Troubleshooting

### Notifications not showing:
1. Check logcat for "ZitroMessagingService" logs
2. Verify notification channel is created
3. Check app notification permissions
4. Verify FCM token is saved to Firestore

### Action buttons not working:
1. Check logcat for "NotificationActionRcvr" logs
2. Verify receiver is registered in manifest
3. Check PendingIntent flags (must be IMMUTABLE on API 31+)

### Deep links not working:
1. Check MainActivity handles intent properly
2. Verify deep link format: `zitro://screen/action?params`
3. Check logs for "DeepLinkRouter"

### Token not syncing:
1. Check Firestore rules allow writes to `/onlineUsers/{userId}/fcmTokens`
2. Verify user ID is set correctly
3. Check network connectivity

---

## Security Best Practices

✅ **Implemented:**
- Defensive payload validation (null checks, required fields)
- Immutable PendingIntents (prevents hijacking)
- Non-exported service and receiver
- Token deletion on logout
- Firestore security rules enforcement

⚠️ **Additional Recommendations:**
- Implement rate limiting on backend
- Validate deep links before navigation
- Encrypt sensitive data in notifications
- Use server-side token invalidation

---

## Performance Optimization

✅ **Already Optimized:**
- Async image loading (Glide with coroutines)
- Unique notification IDs (no overwrites)
- Efficient channel management
- Token caching (SharedPreferences)

---

## Support for Future Enhancements

The architecture supports adding:
- 🔔 Notification groups and stacks
- 📊 In-app notification center
- 🔕 Do Not Disturb mode
- 🕒 Scheduled local notifications
- 🏷️ Custom notification badges
- 🎯 User preference management

---

## Summary

✅ **10 Production-Ready Kotlin Files Created**
✅ **Complete Token Lifecycle Management**
✅ **Rich Notification Support (Images, Actions, Deep Links)**
✅ **Clean Architecture with Separation of Concerns**
✅ **Defensive Validation & Error Handling**
✅ **Support for Cold Start, Background, Foreground**
✅ **No Analytics (As Requested)**

**Next Steps:**
1. Follow integration steps above
2. Test with Firebase Console
3. Connect to your backend notification system
4. Customize navigation logic in MainActivity
5. Replace notification icon
