package com.krisurya.zitro.fcm.router

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.krisurya.zitro.MainActivity

/**
 * Deep Link Router for handling notification navigation
 * Parses deep link URIs and routes to appropriate screens
 * 
 * Supported deep link format:
 * zitro://[screen]/[action]?[params]
 * 
 * Examples:
 * - zitro://order/details?orderId=ORD123
 * - zitro://order/track?orderId=ORD123
 * - zitro://restaurant/menu?restaurantId=REST456
 * - zitro://promotions/details?offerId=OFF789
 * - zitro://cart
 * - zitro://home
 */
object DeepLinkRouter {

    private const val TAG = "DeepLinkRouter"
    private const val SCHEME = "zitro"

    // Deep link extras
    const val EXTRA_SCREEN = "deep_link_screen"
    const val EXTRA_ACTION = "deep_link_action"
    const val EXTRA_ORDER_ID = "orderId"
    const val EXTRA_RESTAURANT_ID = "restaurantId"
    const val EXTRA_OFFER_ID = "offerId"
    const val EXTRA_PRODUCT_ID = "productId"

    /**
     * Navigate to screen based on deep link
     * Starts MainActivity with deep link extras
     */
    fun navigate(context: Context, deepLink: String) {
        Log.d(TAG, "Navigating to: $deepLink")

        val intent = createIntent(context, deepLink)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to navigate to: $deepLink", e)
            // Fallback to main activity
            context.startActivity(createFallbackIntent(context))
        }
    }

    /**
     * Create Intent from deep link
     * Returns Intent with parsed deep link data as extras
     */
    fun createIntent(context: Context, deepLink: String): Intent {
        val uri = Uri.parse(deepLink)
        
        // Validate scheme
        if (uri.scheme != SCHEME) {
            Log.w(TAG, "Invalid scheme: ${uri.scheme}, expected: $SCHEME")
            return createFallbackIntent(context)
        }

        val intent = Intent(context, MainActivity::class.java)
        
        // Parse host as screen (e.g., "order", "restaurant", "promotions")
        val screen = uri.host
        intent.putExtra(EXTRA_SCREEN, screen)

        // Parse first path segment as action (e.g., "details", "track", "menu")
        val action = uri.pathSegments.firstOrNull()
        intent.putExtra(EXTRA_ACTION, action)

        // Parse query parameters
        uri.queryParameterNames.forEach { paramName ->
            val paramValue = uri.getQueryParameter(paramName)
            intent.putExtra(paramName, paramValue)
        }

        Log.d(TAG, "Deep link parsed - Screen: $screen, Action: $action")
        return intent
    }

    /**
     * Create fallback intent (opens main activity)
     */
    private fun createFallbackIntent(context: Context): Intent {
        return Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
    }

    /**
     * Parse deep link in MainActivity.onCreate() or onNewIntent()
     * Call this to handle the deep link navigation
     */
    fun handleDeepLink(intent: Intent): DeepLinkData? {
        val screen = intent.getStringExtra(EXTRA_SCREEN) ?: return null
        val action = intent.getStringExtra(EXTRA_ACTION)

        return DeepLinkData(
            screen = screen,
            action = action,
            orderId = intent.getStringExtra(EXTRA_ORDER_ID),
            restaurantId = intent.getStringExtra(EXTRA_RESTAURANT_ID),
            offerId = intent.getStringExtra(EXTRA_OFFER_ID),
            productId = intent.getStringExtra(EXTRA_PRODUCT_ID)
        )
    }

    /**
     * Parsed deep link data
     */
    data class DeepLinkData(
        val screen: String,
        val action: String?,
        val orderId: String?,
        val restaurantId: String?,
        val offerId: String?,
        val productId: String?
    )

    /**
     * Example: Handle deep link in MainActivity
     * 
     * override fun onCreate(savedInstanceState: Bundle?) {
     *     super.onCreate(savedInstanceState)
     *     handleIntent(intent)
     * }
     * 
     * override fun onNewIntent(intent: Intent?) {
     *     super.onNewIntent(intent)
     *     handleIntent(intent)
     * }
     * 
     * private fun handleIntent(intent: Intent?) {
     *     intent?.let {
     *         val deepLinkData = DeepLinkRouter.handleDeepLink(it)
     *         deepLinkData?.let { data ->
     *             when (data.screen) {
     *                 "order" -> when (data.action) {
     *                     "details" -> navigateToOrderDetails(data.orderId)
     *                     "track" -> navigateToOrderTracking(data.orderId)
     *                 }
     *                 "restaurant" -> when (data.action) {
     *                     "menu" -> navigateToRestaurantMenu(data.restaurantId)
     *                 }
     *                 "promotions" -> navigateToPromotions(data.offerId)
     *                 "cart" -> navigateToCart()
     *                 "home" -> navigateToHome()
     *             }
     *         }
     *     }
     * }
     */
}
