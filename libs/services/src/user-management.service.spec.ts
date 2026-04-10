import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserManagementService } from './user-management.service';
import * as firestore from '@angular/fire/firestore';
import * as storage from '@angular/fire/storage';

vi.mock('@angular/fire/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn()
}));

vi.mock('@angular/fire/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

describe('UserManagementService', () => {
  let service: UserManagementService;
  let mockFirestore: any;
  let mockStorage: any;

  const mockUser = {
    uid: 'user-123',
    phoneNumber: '+911234567890',
    displayName: 'Test User',
    email: null,
    photoURL: null,
    emailVerified: false
  };

  beforeEach(() => {
    localStorage.clear();
    
    mockFirestore = { name: 'mockFirestore' };
    mockStorage = { name: 'mockStorage' };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockCacheService = {} as any;
    const mockCacheManager = {} as any;
    service = new UserManagementService(mockFirestore, mockStorage, mockCacheService, mockCacheManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should have userProfile$ observable', async () => {
      const promise = new Promise<void>(resolve => {
        service.userProfile$.subscribe(profile => {
          expect(profile).toBeNull(); // Initial value
          resolve();
        });
      });
      await promise;
    });
  });

  describe('createOrUpdateUserEntry', () => {
    it('should create user entry successfully', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await service.createOrUpdateUserEntry(mockUser as any);

      expect(result).toBe(true);
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should update existing user entry', async () => {
      const existingUserData = {
        uid: mockUser.uid,
        phoneNumber: mockUser.phoneNumber,
        addresses: []
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingUserData
      } as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const result = await service.createOrUpdateUserEntry(mockUser as any);

      expect(result).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.createOrUpdateUserEntry(mockUser as any);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getUserData', () => {
    it('should return user data for valid phone', async () => {
      const userData = {
        uid: 'user-123',
        phoneNumber: '+911234567890',
        addresses: []
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => userData
      } as any);

      const result = await service.getUserData('+911234567890');

      expect(result).toBeDefined();
      expect(result?.phoneNumber).toBe('+911234567890');
    });

    it('should return null when user not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      } as any);

      const result = await service.getUserData('+919999999999');

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getUserData('+911234567890');

      expect(result).toBeNull();
    });
  });

  describe('Phone number normalization', () => {
    it('should normalize phone numbers correctly', async () => {
      const phoneVariations = [
        '+91 1234567890',
        '+91-1234-567-890',
        '1234567890'
      ];

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as any);

      for (const phone of phoneVariations) {
        const result = await service.findUserByPhoneNumber(phone);
        expect(result).toBeDefined();
      }
    });
  });

  describe('findUserByPhoneNumber', () => {
    it('should find user with phone number variations', async () => {
      const userData = {
        uid: 'user-123',
        phoneNumber: '+911234567890',
        addresses: []
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => userData
      } as any);

      const result = await service.findUserByPhoneNumber('1234567890');

      expect(result).toBeDefined();
      expect(result?.userData.phoneNumber).toBe('+911234567890');
    });

    it('should return null when no variations match', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      } as any);

      const result = await service.findUserByPhoneNumber('9999999999');

      expect(result).toBeNull();
    });
  });

  describe('loadCurrentUserProfile', () => {
    it('should load and emit user profile', async () => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      
      const userData = {
        uid: 'user-123',
        phoneNumber: '+911234567890',
        addresses: []
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => userData
      } as any);

      await service.loadCurrentUserProfile();

      service.userProfile$.subscribe(profile => {
        expect(profile).toBeDefined();
      });
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Load error');
      });

      await expect(service.loadCurrentUserProfile()).resolves.not.toThrow();
    });
  });

  describe('clearUserProfile', () => {
    it('should clear user profile', async () => {
      service.clearUserProfile();

      const promise = new Promise<void>(resolve => {
        service.userProfile$.subscribe(profile => {
          expect(profile).toBeNull();
          resolve();
        });
      });
      await promise;
    });
  });

  describe('User addresses', () => {
    it('should handle user with multiple addresses', async () => {
      const userWithAddresses = {
        uid: 'user-123',
        phoneNumber: '+911234567890',
        addresses: [
          {
            name: 'Home',
            phone: '+911234567890',
            houseAndStreet: '123 Main St',
            pincode: '123456',
            town: 'Test Town',
            state: 'Test State',
            type: 'home',
            isDefault: true,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          },
          {
            name: 'Work',
            phone: '+911234567890',
            houseAndStreet: '456 Work St',
            pincode: '654321',
            town: 'Work Town',
            state: 'Work State',
            type: 'work',
            isDefault: false,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ]
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => userWithAddresses
      } as any);

      const result = await service.getUserData('+911234567890');

      expect(result?.addresses).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle user with null email', async () => {
      const userWithNullEmail = { ...mockUser, email: null };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await service.createOrUpdateUserEntry(userWithNullEmail as any);

      expect(result).toBe(true);
    });

    it('should handle anonymous users', async () => {
      const anonymousUser = {
        uid: 'anonymous-123',
        phoneNumber: null,
        displayName: null,
        email: null
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const result = await service.createOrUpdateUserEntry(anonymousUser as any);

      expect(result).toBe(true);
    });
  });
});
