import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserManagementService } from './user-management.service';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';
import { AppSettingsService } from './app-settings.service';
import { isFast2SmsSuccess } from '@zitro/models';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseApp from 'firebase/app';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn()
}));

vi.mock('firebase/app', () => ({
  getApp: vi.fn(),
  getApps: vi.fn()
}));

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthService;
  let mockUserManagement: UserManagementService;
  let mockErrorHandler: FirebaseErrorHandlerService;
  let mockAppSettings: AppSettingsService;
  let mockHttpClient: any;

  beforeEach(() => {
    localStorage.clear();
    
    mockUserManagement = {
      createOrUpdateUserEntry: vi.fn().mockResolvedValue(true),
      clearUserProfile: vi.fn()
    } as any;

    mockHttpClient = {
      post: vi.fn().mockReturnValue({
        toPromise: vi.fn().mockResolvedValue({ return: true })
      })
    };

    mockErrorHandler = {
      handleAndLogError: vi.fn()
    } as any;
    mockAppSettings = {
      getTestPhoneNumbers: vi.fn().mockResolvedValue([])
    } as any;

    const mockAuth = { 
      name: 'mockAuth',
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    const mockApp = { name: 'mockApp', options: {} };

    vi.mocked(firebaseApp.getApps).mockReturnValue([mockApp] as any);
    vi.mocked(firebaseApp.getApp).mockReturnValue(mockApp as any);
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as any);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new FirebaseAuthService(
      mockUserManagement,
      mockHttpClient,
      mockErrorHandler,
      mockAppSettings
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize Firebase Auth', () => {
      expect(firebaseAuth.getAuth).toHaveBeenCalled();
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in with email and password', async () => {
      const mockCredential = {
        user: { uid: 'user-123', email: 'test@example.com' }
      };

      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue(mockCredential as any);

      const result = await service.signInWithEmail('test@example.com', 'password123');

      expect(result).toEqual(mockCredential);
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });

    it('should handle authentication errors', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(service.signInWithEmail('test@example.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('signInWithPhone', () => {
    it('should sign in with phone and OTP', async () => {
      const result = await service.signInWithPhone('+911234567890', '123456');

      expect(result).toBeDefined();
      expect(result.user).toHaveProperty('uid');
      expect(result.user).toHaveProperty('phoneNumber');
      expect(localStorage.getItem('token')).toBeDefined();
      expect(localStorage.getItem('currentUserPhone')).toBe('+911234567890');
    });

    it('should clear guest mode on login', async () => {
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestId', 'guest-123');

      await service.signInWithPhone('+911234567890', '123456');

      expect(localStorage.getItem('isGuest')).toBeNull();
      expect(localStorage.getItem('guestId')).toBeNull();
    });

    it('should create user profile on first login', async () => {
      await service.signInWithPhone('+911234567890', '123456');

      expect(mockUserManagement.createOrUpdateUserEntry).toHaveBeenCalled();
    });

    it('should handle user creation errors gracefully', async () => {
      mockUserManagement.createOrUpdateUserEntry = vi.fn().mockRejectedValue(
        new Error('Profile creation failed')
      );

      const result = await service.signInWithPhone('+911234567890', '123456');

      expect(result).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('isGuestMode', () => {
    it('should return true when in guest mode', () => {
      localStorage.setItem('isGuest', 'true');

      expect(service.isGuestMode()).toBe(true);
    });

    it('should return false when not in guest mode', () => {
      localStorage.removeItem('isGuest');

      expect(service.isGuestMode()).toBe(false);
    });

    it.each([
      ['true', true],
      ['false', false],
      [null, false]
    ])('should handle guest mode value: %s', (value, expected) => {
      if (value) {
        localStorage.setItem('isGuest', value);
      } else {
        localStorage.removeItem('isGuest');
      }

      expect(service.isGuestMode()).toBe(expected);
    });
  });

  describe('SMS sending', () => {
    it('should validate phone number before sending SMS', async () => {
      service.phoneNumber = '';
      service.message = 'Test OTP';

      await expect(service.sendSMSViaFast2SMSQuickSMSApi()).rejects.toThrow('Phone number and message are required');
    });

    it('should validate message before sending SMS', async () => {
      service.phoneNumber = '1234567890';
      service.message = '';

      await expect(service.sendSMSViaFast2SMSQuickSMSApi()).rejects.toThrow('Phone number and message are required');
    });
  });

  describe('Test phone numbers', () => {
    it('should fetch test phone numbers from app settings', async () => {
      mockAppSettings.getTestPhoneNumbers = vi.fn().mockResolvedValue(['1234567890', '9876543210']);

      const testNumbers = await mockAppSettings.getTestPhoneNumbers();

      expect(testNumbers).toEqual(['1234567890', '9876543210']);
    });

    it('should cache test phone numbers to avoid repeated fetches', async () => {
      mockAppSettings.getTestPhoneNumbers = vi.fn().mockResolvedValue(['1234567890']);

      await mockAppSettings.getTestPhoneNumbers();
      await mockAppSettings.getTestPhoneNumbers();

      expect(mockAppSettings.getTestPhoneNumbers).toHaveBeenCalledTimes(2);
    });

    it('should clear test phone numbers cache', () => {
      service.clearTestPhoneNumbersCache();

      expect((service as any).testPhoneNumbersCache).toBeNull();
    });
  });

  describe('Guest mode management', () => {
    it('should enable guest mode', () => {
      service.continueAsGuest();

      expect(localStorage.getItem('isGuest')).toBe('true');
      expect(localStorage.getItem('guestId')).toBeDefined();
    });

    it('should generate unique guest ID', () => {
      service.continueAsGuest();
      const guestId1 = localStorage.getItem('guestId');

      localStorage.clear();

      service.continueAsGuest();
      const guestId2 = localStorage.getItem('guestId');

      expect(guestId1).not.toBe(guestId2);
    });

    it('should check if in guest mode', () => {
      localStorage.setItem('isGuest', 'true');

      const isGuest = service.isGuestMode();

      expect(isGuest).toBe(true);
    });

    it('should return guest ID', () => {
      localStorage.setItem('guestId', 'guest-123');

      const guestId = service.getGuestId();

      expect(guestId).toBe('guest-123');
    });
  });

  describe('Authentication state', () => {
    it('should sign out user and clear storage', () => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('isGuest', 'false');

      service.signOut();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('currentUserPhone')).toBeNull();
      expect(mockUserManagement.clearUserProfile).toHaveBeenCalled();
    });

    it('should sign out guest user', () => {
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestId', 'guest-123');
      localStorage.setItem('token', 'guest-123');

      service.signOut();

      expect(localStorage.getItem('isGuest')).toBeNull();
      expect(localStorage.getItem('guestId')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
