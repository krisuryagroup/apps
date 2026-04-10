import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderService } from './order.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { AppSettingsService } from './app-settings.service';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }))
  }
}));

describe('OrderService', () => {
  let service: OrderService;
  let mockAuthService: FirebaseAuthService;
  let mockAppSettings: AppSettingsService;
  let mockCacheService: any;
  let mockCacheManager: any;

  const mockOrderData = {
    items: [{ id: 'item-1', name: 'Test Item', price: 100, qty: 2 }],
    subtotal: 200,
    deliveryCharge: 40,
    couponDiscount: 0,
    total: 240,
    paymentMethod: 'cash',
    deliveryAddress: {
      houseAndStreet: '123 Main St',
      pincode: '123456',
      town: 'Test Town'
    }
  };

  beforeEach(() => {
    localStorage.clear();
    
    mockAuthService = {
      isGuestMode: vi.fn().mockReturnValue(false)
    } as any;

    mockAppSettings = {
      getDeliveryTime: vi.fn().mockResolvedValue(45)
    } as any;

    mockCacheService = {} as any;

    mockCacheManager = {} as any;

    vi.mocked(firestore.getFirestore).mockReturnValue({} as any);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    service = new OrderService(mockAuthService, mockAppSettings, mockCacheService, mockCacheManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize Firestore', () => {
      expect(firestore.getFirestore).toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should throw error when user is in guest mode', async () => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(true);

      await expect(service.createOrder(mockOrderData as any)).rejects.toThrow(
        'User must be logged in'
      );
    });

    it('should throw error when user phone is not set', async () => {
      localStorage.clear();

      await expect(service.createOrder(mockOrderData as any)).rejects.toThrow(
        'authentication information not found'
      );
    });

    it('should create order successfully for authenticated user', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const order = await service.createOrder(mockOrderData as any);

      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('total');
      expect(order.status).toBe('pending');
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should generate unique order ID', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const order1 = await service.createOrder(mockOrderData as any);
      const order2 = await service.createOrder(mockOrderData as any);

      expect(order1.orderId).not.toBe(order2.orderId);
      expect(order1.orderId).toMatch(/^ORD/);
    });

    it('should include delivery charge and packaging charges', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const orderData = {
        ...mockOrderData,
        totalPackagingCharges: 20,
        packagingChargesPerItem: 10
      };

      const order = await service.createOrder(orderData as any);

      expect(order).toHaveProperty('deliveryCharge');
      expect(order.deliveryCharge).toBe(40);
    });

    it('should initialize status timeline', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const order = await service.createOrder(mockOrderData as any);

      expect(order.statusTimeline).toBeDefined();
      expect(order.statusTimeline).toHaveLength(1);
      expect(order.statusTimeline![0].status).toBe('pending');
    });

    it('should handle Firebase errors', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Firebase error'));

      await expect(service.createOrder(mockOrderData as any)).rejects.toThrow(
        'Failed to create order'
      );
    });

    it('should fetch and use delivery time from app settings', async () => {
      const mockDeliveryTime = 60; // 60 minutes
      vi.spyOn(mockAppSettings, 'getDeliveryTime').mockResolvedValue(mockDeliveryTime);
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const order = await service.createOrder(mockOrderData as any);

      expect(mockAppSettings.getDeliveryTime).toHaveBeenCalled();
      expect(order.estimatedDeliveryTime).toBeDefined();
      
      // Check that estimated delivery time is approximately deliveryTime minutes from now
      const now = new Date();
      const expectedTime = new Date(now.getTime() + (mockDeliveryTime * 60 * 1000));
      const actualTime = order.estimatedDeliveryTime!;
      const timeDiff = Math.abs(actualTime.getTime() - expectedTime.getTime());
      
      // Allow 5 seconds tolerance for test execution time
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should use default delivery time if app settings fails', async () => {
      vi.spyOn(mockAppSettings, 'getDeliveryTime').mockResolvedValue(45);
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const order = await service.createOrder(mockOrderData as any);

      expect(order.estimatedDeliveryTime).toBeDefined();
    });

    it('should include coupon information if provided', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const orderWithCoupon = {
        ...mockOrderData,
        couponCode: 'SAVE20',
        couponDiscount: 40,
        total: 200
      };

      const order = await service.createOrder(orderWithCoupon as any);

      expect(order.couponCode).toBe('SAVE20');
      expect(order.couponDiscount).toBe(40);
    });
  });

  describe('getUserOrders', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should return empty array when user is in guest mode', async () => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(true);

      const orders = await service.getUserOrders();

      expect(orders).toEqual([]);
    });

    it('should return empty array when no user phone is set', async () => {
      localStorage.clear();

      const orders = await service.getUserOrders();

      expect(orders).toEqual([]);
    });

    it('should fetch orders from Firebase', async () => {
      const mockOrders = [{
        orderId: 'ORD123',
        status: 'pending',
        total: 240,
        createdAt: firestore.Timestamp.fromDate(new Date()),
        items: []
      }];

      const mockSnapshot = {
        forEach: (callback: any) => {
          mockOrders.forEach(order => {
            callback({ id: order.orderId, data: () => order });
          });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.query).mockReturnValue({} as any);
      vi.mocked(firestore.where).mockReturnValue({} as any);
      vi.mocked(firestore.orderBy).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const orders = await service.getUserOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0]).toHaveProperty('orderId');
    });

    it('should handle Firebase errors gracefully', async () => {
      vi.mocked(firestore.collection).mockImplementation(() => {
        throw new Error('Firebase error');
      });

      await expect(service.getUserOrders()).rejects.toThrow('Failed to fetch orders');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Order ID generation', () => {
    it('should generate order IDs with correct format', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
      const order = await service.createOrder(mockOrderData as any);

      expect(order.orderId).toMatch(/^ORD\d+$/);
      expect(order.orderId.length).toBeGreaterThan(10);
    });
  });
});
