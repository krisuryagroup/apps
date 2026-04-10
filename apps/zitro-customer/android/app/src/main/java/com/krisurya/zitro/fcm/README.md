# FCM Notification Receiving Architecture

## Folder Structure

```
com.zitro.customer.fcm/
├── service/
│   └── ZitroMessagingService.kt          # FirebaseMessagingService implementation
├── factory/
│   └── NotificationFactory.kt            # Builds notifications with styles
├── manager/
│   ├── NotificationChannelManager.kt     # Manages notification channels
│   └── TokenManager.kt                   # FCM token lifecycle management
├── receiver/
│   └── NotificationActionReceiver.kt     # Handles action button clicks
├── router/
│   └── DeepLinkRouter.kt                 # Navigation routing
├── model/
│   ├── NotificationPayload.kt            # Data class for FCM payload
│   ├── NotificationChannel.kt            # Channel enum
│   └── NotificationAction.kt             # Action button enum
└── util/
    └── NotificationIdGenerator.kt        # Unique notification IDs
```

## Execution Flow

### 1. Token Lifecycle
```
App Launch → TokenManager.refreshToken() → Save to Firestore /onlineUsers/{userId}
User Login → Save token with userId
Token Refresh → onNewToken() → Update Firestore
User Logout → Delete token from Firestore
```

### 2. Message Reception
```
FCM Message Arrives
    ↓
ZitroMessagingService.onMessageReceived()
    ↓
Validate Payload (defensive checks)
    ↓
NotificationFactory.create()
    ↓
Apply Rich Styles (BigText/BigPicture)
    ↓
Add Action Buttons (if any)
    ↓
Show Notification
```

### 3. User Interaction
```
User Taps Notification → DeepLinkRouter → Navigate to screen
User Taps Action Button → NotificationActionReceiver → Handle action
```

## Expected FCM Payload Format (Data-Only)

```json
{
  "data": {
    "notificationId": "notif_12345",
    "title": "Your order is on the way! 🚀",
    "body": "Your delicious meal will arrive in 15 minutes",
    "channelId": "ORDER_UPDATES",
    "priority": "high",
    "imageUrl": "https://example.com/food.jpg",
    "deepLink": "zitro://order/details?orderId=ORD123",
    "actionButtons": "[{\"id\":\"TRACK_ORDER\",\"title\":\"Track\"},{\"id\":\"CALL_DRIVER\",\"title\":\"Call Driver\"}]",
    "soundEnabled": "true",
    "vibrationEnabled": "true",
    "accentColor": "#FF5722"
  }
}
```

## Channel Configuration

| Channel ID | Importance | Use Case |
|-----------|-----------|----------|
| ORDER_UPDATES | High | Order status, delivery updates |
| PROMOTIONS | Default | Offers, discounts, campaigns |
| SYSTEM | Low | Account updates, maintenance |

## Key Features

✅ **Token Management**: Automatic sync with backend on login/logout/refresh
✅ **Rich Notifications**: BigTextStyle, BigPictureStyle with Glide image loading
✅ **Action Buttons**: Up to 3 custom actions per notification
✅ **Deep Linking**: Automatic navigation to specific screens
✅ **Defensive Validation**: Null-safe payload parsing
✅ **Cold Start Support**: Works even when app is killed
✅ **Notification Channels**: Proper grouping with user control
✅ **Unique IDs**: No notification overwrites

## Dependencies Required

```gradle
// Firebase
implementation 'com.google.firebase:firebase-messaging:23.4.0'
implementation 'com.google.firebase:firebase-firestore:24.10.0'

// Image Loading
implementation 'com.github.bumptech.glide:glide:4.16.0'

// Coroutines
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
```

## AndroidManifest.xml Registration

```xml
<service
    android:name=".fcm.service.ZitroMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

<receiver
    android:name=".fcm.receiver.NotificationActionReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="com.zitro.customer.NOTIFICATION_ACTION" />
    </intent-filter>
</receiver>
```

## Usage

### Initialize on App Launch
```kotlin
class ZitroApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Create notification channels
        NotificationChannelManager(this).createAllChannels()
        
        // Refresh FCM token
        TokenManager(this).refreshToken()
    }
}
```

### On User Login
```kotlin
TokenManager(context).onUserLogin(userId)
```

### On User Logout
```kotlin
TokenManager(context).onUserLogout()
```
