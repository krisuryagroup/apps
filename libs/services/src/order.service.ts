import { Injectable } from '@angular/core';
import { UserManagementService } from './user-management.service';
import { Order, CreateOrderData, OrderDisplay, OrderType } from '@zitro/models';
import { AppSettingsService } from './app-settings.service';
import { AnalyticsService } from './analytics.service';
import { getOrderStatusDisplay } from '@zitro/utils';
import { FIREBASE_COLLECTIONS, AUTH_KEYS, CACHE_KEYS } from '@zitro/utils';
import { CacheManagerService } from './cache-manager.service';
import { CacheType } from '@zitro/models';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  Timestamp,
  getFirestore,
  Firestore 
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly COLLECTION_NAME = FIREBASE_COLLECTIONS.ONLINE_ORDERS;
  private db: Firestore;
  isLoggedIn: boolean = false;

  constructor(
    private userManagementService: UserManagementService,
    private appSettingsService: AppSettingsService,
    private cacheManager: CacheManagerService,
    private analyticsService: AnalyticsService
  ) {
    this.db = getFirestore();
  }

  /**
   * Get display text for order type
   */
  private getOrderTypeDisplay(orderType: OrderType): string {
    const labels: { [key in OrderType]: string } = {
      'dine-in': 'Dine-in',
      'takeout': 'Takeout',
      'delivery': 'Home Delivery'
    };
    return labels[orderType] || 'Unknown';
  }

  /**
   * Normalize order type for backward compatibility
   * If orderType is not set but deliveryAddress exists, set it to 'delivery'
   */
  private normalizeOrderType(order: any): OrderType {
    // If orderType is already set, return it
    if (order.orderType) {
      return order.orderType as OrderType;
    }
    
    // For backward compatibility: if deliveryAddress exists, it's a delivery order
    if (order.deliveryAddress) {
      return 'delivery';
    }
    
    // Default to delivery for old orders without either field
    return 'delivery';
  }

  /**
   * Create a new order in Firestore
   * Only authenticated users can create orders
   */
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    // Check if user is authenticated
    const isLoggedIn = await this.userManagementService.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('User must be logged in to place an order');
    }

    // Get current user info
    const currentUserPhone = localStorage.getItem(AUTH_KEYS.CURRENT_USER_PHONE);
    const userId = localStorage.getItem(AUTH_KEYS.TOKEN);
    
    if (!currentUserPhone || !userId) {
      throw new Error('User authentication information not found');
    }

    // Get user profile data for name and photo
    const userProfile = await this.userManagementService.getUserData(currentUserPhone);
    const userName = userProfile?.name || null;
    const userPhotoURL = userProfile?.photoURL || null;

    // Generate unique order ID
    const orderId = await this.generateOrderId();
    const now = new Date();

    // Use deliveryCharge and packaging charges as calculated in cart (orderData)
    // If you want to store packaging charges, add it to orderData and here
    const totalPackagingCharges = (orderData as any).totalPackagingCharges || 0;

    // Fetch delivery time from appSettings
    const deliveryTimeMinutes = await this.appSettingsService.getDeliveryTime();

    // Initialize status timeline
    const statusTimeline: Array<{status: string, timestamp: Date, note?: string}> = [
      {
        status: 'pending',
        timestamp: now,
        note: 'Order placed successfully'
      }
    ];

    const order: Order = {
      orderId,
      userId,
      userPhone: currentUserPhone,
      userName,
      userPhotoURL,
      orderType: orderData.orderType,
      tableNumber: orderData.tableNumber,
      numberOfGuests: orderData.numberOfGuests,
      scheduledPickupTime: orderData.scheduledPickupTime,
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryCharge: orderData.deliveryCharge, // Use value from cart
      total: orderData.total, // Use value from cart
      paymentMethod: orderData.paymentMethod,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      statusTimeline: statusTimeline as any,
      deliveryAddress: orderData.deliveryAddress,
      customerNotes: orderData.customerNotes,
      estimatedDeliveryTime: new Date(now.getTime() + (deliveryTimeMinutes * 60 * 1000)),
      packagingChargesPerItem: (orderData as any).packagingChargesPerItem,
      totalPackagingCharges,
      charges: orderData.charges // Include detailed charges breakdown if available
    };

    try {
      const db = this.db;
      
      // Create the document data
      const orderToSave = {
        restaurantId: '1001',
        orderId: order.orderId,
        userId: order.userId,
        userPhone: order.userPhone,
        userName: order.userName || null,
        userPhotoURL: order.userPhotoURL || null,
        orderType: order.orderType,
        tableNumber: order.tableNumber || null,
        numberOfGuests: order.numberOfGuests || null,
        scheduledPickupTime: order.scheduledPickupTime ? Timestamp.fromDate(order.scheduledPickupTime) : null,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: Timestamp.fromDate(order.createdAt),
        createdAtMillis: order.createdAt.getTime(),
        createdDateKey: order.createdAt.toISOString().split('T')[0],
        updatedAt: Timestamp.fromDate(order.updatedAt),
        updatedAtMillis: order.updatedAt.getTime(),
        updatedDateKey: order.updatedAt.toISOString().split('T')[0],
        statusTimeline: order.statusTimeline?.map(timeline => ({
          status: timeline.status,
          timestamp: Timestamp.fromDate(timeline.timestamp),
          note: timeline.note || null
        })) || [],
        estimatedDeliveryTime: order.estimatedDeliveryTime ? Timestamp.fromDate(order.estimatedDeliveryTime) : null,
        deliveryAddress: order.deliveryAddress || null,
        customerNotes: order.customerNotes || null,
        charges: order.charges || null
      };

      // Remove undefined values recursively
      const cleanData = this.removeUndefinedValues(orderToSave);

      // Use the orderId as the document name/ID
      const docRef = doc(db, this.COLLECTION_NAME, order.orderId);
      await setDoc(docRef, cleanData);

      console.log(`Order created successfully with document ID: ${order.orderId}`);
      
      // Clear order history cache to show new order immediately
      this.clearOrderHistoryCache(userId);
      
      // Update user order count and record coupon usage in a single operation
      try {
        await this.userManagementService.updateUserOrderAndCoupon(
          currentUserPhone,
          order.orderId,
          orderData.couponCode || undefined
        );
      } catch (error) {
        console.error('Failed to update user order data:', error);
        // Don't fail the order creation if this fails
      }
      
      // Track purchase event in analytics (only when order is actually created)
      try {
        await this.analyticsService.logPurchase({
          orderId: order.orderId,
          value: order.total,
          tax: order.tax || 0,
          shipping: order.deliveryCharge,
          coupon: orderData.couponCode,
          paymentMethod: order.paymentMethod,
          items: order.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.qty
          }))
        });
      } catch (error) {
        console.error('Failed to log purchase analytics:', error);
        // Don't fail the order creation if analytics fails
      }
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  /**
   * Generate a unique order ID with timestamp and random component
   */
  private async generateOrderId(): Promise<string> {
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
    return `ORD${timestamp}${random}`;
  }

  /**
   * Get orders for current user
   */
  async getUserOrders(): Promise<OrderDisplay[]> {
    const isLoggedIn = await this.userManagementService.isLoggedIn();
    if (!isLoggedIn) {
      return [];
    }

    const userId = localStorage.getItem(AUTH_KEYS.TOKEN);
    if (!userId) {
      return [];
    }

    // // Check cache first
    // const cachedOrders = this.getCachedOrderHistory(userId);
    // if (cachedOrders) {
    //   console.log('📦 Using cached order history');
    //   return cachedOrders;
    // }

    console.log('⬇️ Fetching order history from Firestore');

    try {
      const db = this.db;
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const orders: OrderDisplay[] = [];

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        
        // Helper function to convert timestamps safely
        const convertTimestamp = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (timestamp instanceof Date) return timestamp;
          if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
          if (typeof timestamp === 'string') return new Date(timestamp);
          if (typeof timestamp === 'number') return new Date(timestamp);
          if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
          return new Date();
        };
        
        const order: Order = {
          ...docData as Order,
          orderType: this.normalizeOrderType(docData),
          createdAt: convertTimestamp(docData['createdAt']),
          updatedAt: convertTimestamp(docData['updatedAt']),
          estimatedDeliveryTime: docData['estimatedDeliveryTime'] ? convertTimestamp(docData['estimatedDeliveryTime']) : undefined,
          statusTimeline: docData['statusTimeline']?.map((timeline: any) => ({
            status: timeline.status,
            timestamp: convertTimestamp(timeline.timestamp),
            note: timeline.note
          })) || []
        };

        const orderDisplay: OrderDisplay = {
          ...order,
          date: order.createdAt.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: order.createdAt.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          statusDisplay: getOrderStatusDisplay(order.status),
          totalDisplay: `₹${order.total.toFixed(2)}`,
          orderTypeDisplay: this.getOrderTypeDisplay(order.orderType)
        };

        orders.push(orderDisplay);
      });

  // Sort orders by createdAt in descending order (newest first)
  // This provides additional sorting assurance on the client side
  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  // Cache the orders
  this.setCachedOrderHistory(userId, orders);
  
  return orders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Update order status with timeline tracking
   */
  async updateOrderStatus(orderId: string, status: Order['status'], note?: string): Promise<void> {
    try {
      const db = this.db;
      
      // First, get the current order to retrieve existing timeline
      const docRef = doc(db, this.COLLECTION_NAME, orderId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Order not found');
      }
      
      const existingOrder = docSnap.data();
      const currentTimeline = existingOrder['statusTimeline'] || [];
      
      // Add new timeline entry
      const newTimelineEntry = {
        status: status,
        timestamp: Timestamp.fromDate(new Date()),
        note: note || this.getDefaultStatusNote(status)
      };
      
      const updatedTimeline = [...currentTimeline, newTimelineEntry];
      
      // Update the document with new status and timeline
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.fromDate(new Date()),
        statusTimeline: updatedTimeline
      });
      
      console.log('Order status and timeline updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Get default note for status changes
   */
  private getDefaultStatusNote(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'Order placed successfully';
      case 'confirmed':
        return 'Restaurant has confirmed your order';
      case 'preparing':
        return 'Your food is being prepared';
      case 'shipped':
        return 'Your order is out for delivery';
      case 'delivered':
        return 'Order has been delivered successfully';
      case 'cancelled':
        return 'Order has been cancelled';
      default:
        return 'Status updated';
    }
  }

  /**
   * Get timeline entry for a specific status
   */
  getTimelineForStatus(order: OrderDisplay, status: string): Date | null {
    if (!order.statusTimeline) return null;
    
    const timelineEntry = order.statusTimeline.find(timeline => timeline.status === status);
    return timelineEntry ? timelineEntry.timestamp : null;
  }

  /**
   * Get a specific order by orderId for tracking
   */
  async getOrderById(orderId: string): Promise<OrderDisplay | null> {
    try {
      const db = this.db;
      
      // Since orderId is now the document ID, we can directly get the document
      const docRef = doc(db, this.COLLECTION_NAME, orderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const docData = docSnap.data();
        
        // Helper function to convert timestamps safely
        const convertTimestamp = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (timestamp instanceof Date) return timestamp;
          if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
          if (typeof timestamp === 'string') return new Date(timestamp);
          if (typeof timestamp === 'number') return new Date(timestamp);
          if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
          return new Date();
        };
        
        const order: Order = {
          ...docData as Order,
          orderType: this.normalizeOrderType(docData),
          createdAt: convertTimestamp(docData['createdAt']),
          updatedAt: convertTimestamp(docData['updatedAt']),
          estimatedDeliveryTime: docData['estimatedDeliveryTime'] ? convertTimestamp(docData['estimatedDeliveryTime']) : undefined,
          statusTimeline: docData['statusTimeline']?.map((timeline: any) => ({
            status: timeline.status,
            timestamp: convertTimestamp(timeline.timestamp),
            note: timeline.note
          })) || []
        };

        const orderDisplay: OrderDisplay = {
          ...order,
          date: order.createdAt.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: order.createdAt.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          statusDisplay: getOrderStatusDisplay(order.status),
          totalDisplay: `₹${order.total.toFixed(2)}`,
          orderTypeDisplay: this.getOrderTypeDisplay(order.orderType)
        };

        return orderDisplay;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Recursively remove undefined values from an object
   * Firestore doesn't accept undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Check if an order can be cancelled (within configured time limit and in allowed status)
   */
  async canCancelOrder(order: Order | OrderDisplay): Promise<boolean> {
    try {
      // Check if cancellation is enabled globally
      const isEnabled = await this.appSettingsService.isOrderCancellationEnabled();
      if (!isEnabled) {
        return false;
      }

      // Check if order status allows cancellation
      const allowedStatuses = await this.appSettingsService.getAllowedCancellationStatuses();
      const currentStatus = order.status?.toLowerCase() || '';
      
      if (!allowedStatuses.includes(currentStatus)) {
        return false;
      }

      // Check time limit from Firebase config
      const timeLimit = await this.appSettingsService.getOrderCancellationTimeLimit();
      const now = new Date().getTime();
      const orderTime = order.createdAt.getTime();
      const timeLimitInMs = timeLimit * 1000;
      
      // Check if order is within time limit
      const isWithinTimeLimit = (now - orderTime) <= timeLimitInMs;
      
      return isWithinTimeLimit;
    } catch (error) {
      console.error('Error checking if order can be cancelled:', error);
      return false;
    }
  }

  /**
   * Cancel an order within configured time limit
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, get the order to check if it can be cancelled
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        return { 
          success: false, 
          message: 'Order not found' 
        };
      }

      // Check if order can be cancelled
      const canCancel = await this.canCancelOrder(order);
      if (!canCancel) {
        const now = new Date().getTime();
        const orderTime = order.createdAt.getTime();
        const timeDiff = Math.ceil((now - orderTime) / 1000); // seconds
        const timeLimit = await this.appSettingsService.getOrderCancellationTimeLimit();
        
        if (timeDiff > timeLimit) {
          const timeExpiredMessage = await this.appSettingsService.getOrderCancellationMessage('timeExpiredMessage');
          return { 
            success: false, 
            message: timeExpiredMessage
          };
        } else {
          return { 
            success: false, 
            message: 'Order cannot be cancelled at this stage.' 
          };
        }
      }

      // Update order status to cancelled
      await this.updateOrderStatus(orderId, 'cancelled');
      
      // Track order cancellation analytics (only when order is actually cancelled)
      try {
        await this.analyticsService.logOrderCancelled(
          orderId,
          order.total,
          'user_cancelled'
        );
      } catch (error) {
        console.error('Failed to log order cancellation analytics:', error);
        // Don't fail the cancellation if analytics fails
      }
      
      // Get success message from config
      const successMessage = await this.appSettingsService.getOrderCancellationMessage('successMessage');
      
      return { 
        success: true, 
        message: successMessage
      };
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { 
        success: false, 
        message: 'Failed to cancel order. Please try again or contact support.' 
      };
    }
  }

  /**
   * Get remaining time for order cancellation in seconds (within configured time limit)
   */
  async getRemainingCancellationTime(order: Order | OrderDisplay): Promise<number> {
    try {
      const timeLimit = await this.appSettingsService.getOrderCancellationTimeLimit();
      const now = new Date().getTime();
      const orderTime = order.createdAt.getTime();
      const timeLimitInMs = timeLimit * 1000;
      const elapsed = now - orderTime;
      const remaining = timeLimitInMs - elapsed;
      
      return Math.max(0, Math.ceil(remaining / 1000)); // Return remaining seconds
    } catch (error) {
      console.error('Error getting remaining cancellation time:', error);
      return 0;
    }
  }
  /**
   * Get cached order history (7-day persistent cache)
   */
  private getCachedOrderHistory(userId: string): OrderDisplay[] | null {
    try {
      const cacheKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE}_${userId}`;
      const timestampKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE_TIMESTAMP}_${userId}`;
      
      // Use CacheManagerService to get cached data with dynamic duration
      const cachedData = this.cacheManager.getCachedData<OrderDisplay[]>(
        CacheType.ORDER_HISTORY,
        cacheKey,
        timestampKey
      );

      // If cached data exists, reconstruct Date objects from strings
      if (cachedData && Array.isArray(cachedData)) {
        return cachedData.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : undefined,
          statusTimeline: order.statusTimeline?.map(timeline => ({
            status: timeline.status,
            timestamp: new Date(timeline.timestamp),
            note: timeline.note
          })) || []
        }));
      }

      return null;
    } catch (error) {
      console.error('Error getting cached order history:', error);
      return null;
    }
  }

  /**
   * Set cached order history (7-day persistent cache)
   */
  private setCachedOrderHistory(userId: string, orders: OrderDisplay[]): void {
    try {
      const cacheKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE}_${userId}`;
      const timestampKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE_TIMESTAMP}_${userId}`;
      
      // Use CacheManagerService to set cached data with dynamic duration
      this.cacheManager.setCachedData(
        CacheType.ORDER_HISTORY,
        cacheKey,
        timestampKey,
        orders
      );
      const duration = this.cacheManager.getCacheDuration(CacheType.ORDER_HISTORY);
      console.log(`💾 Order history cached successfully (${Math.round(duration / 1000 / 60 / 60 / 24)} days)`);
    } catch (error) {
      console.error('Error caching order history:', error);
    }
  }

  /**
   * Clear cached order history for a specific user
   */
  clearOrderHistoryCache(userId?: string): void {
    try {
      if (userId) {
        const cacheKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE}_${userId}`;
        const timestampKey = `${CACHE_KEYS.ORDER_HISTORY_CACHE_TIMESTAMP}_${userId}`;
        
        this.cacheManager.clearCache(
          CacheType.ORDER_HISTORY,
          cacheKey,
          timestampKey
        );
      } else {
        // Clear all order history caches using prefix
        this.cacheManager.clearCacheByPrefix(
          `${CACHE_KEYS.ORDER_HISTORY_CACHE}_`
        );
      }
    } catch (error) {
      console.error('Error clearing order history cache:', error);
    }
  }

  /**
   * Refresh order history (force reload from Firestore)
   */
  async refreshOrderHistory(): Promise<OrderDisplay[]> {
    const userId = localStorage.getItem(AUTH_KEYS.TOKEN);
    if (userId) {
      this.clearOrderHistoryCache(userId);
    }
    return this.getUserOrders();
  }}
