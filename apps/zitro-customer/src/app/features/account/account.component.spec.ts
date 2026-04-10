import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AccountComponent } from './account.component';
import { Router } from '@angular/router';
import { UserManagementService } from '../../core/services/user-management.service';
import * as firebaseAuth from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

describe('AccountComponent', () => {
  let component: AccountComponent;
  let mockRouter: any;
  let mockUserManagementService: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockUserManagementService = {
      getCurrentUserPhone: vi.fn(),
      getUserData: vi.fn(),
      getUserDataByUID: vi.fn(),
      updateUserProfile: vi.fn(),
    };

    component = new AccountComponent(mockRouter, mockUserManagementService);
    component.fileInput = { nativeElement: { click: vi.fn(), value: '' } } as any;

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it.each([
      { field: 'name', value: '' },
      { field: 'email', value: '' },
      { field: 'phone', value: '' },
      { field: 'location', value: '' },
      { field: 'profileImage', value: '' },
      { field: 'isLoading', value: false },
      { field: 'selectedFile', value: null },
      { field: 'currentUserPhone', value: null },
    ])('should initialize $field to $value', ({ field, value }) => {
      expect((component as any)[field]).toEqual(value);
    });
  });

  describe('Load User Profile', () => {
    it('should load user profile with phone number', async () => {
      const mockUserData = {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue(mockUserData);
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({} as any);
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() => vi.fn());

      await component.loadUserProfile();

      expect(component.name).toBe('John Doe');
      expect(component.email).toBe('john@example.com');
      expect(component.phone).toBe('+1234567890');
      expect(component.profileImage).toBe('https://example.com/photo.jpg');
    });

    it('should handle missing user data gracefully', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue(null);
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({} as any);
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() => vi.fn());

      await component.loadUserProfile();

      expect(component.currentUserPhone).toBe('+1234567890');
    });

    it('should fallback to UID lookup on error', async () => {
      const mockUser = { uid: 'user-123' };
      const mockUserDataByUID = {
        phoneNumber: '+1234567890',
        user: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phoneNumber: '+1234567890',
          photoURL: 'https://example.com/jane.jpg',
        },
      };

      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockRejectedValue(new Error('Not found'));
      mockUserManagementService.getUserDataByUID.mockResolvedValue(mockUserDataByUID);
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({ currentUser: mockUser } as any);
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() => vi.fn());

      await component.loadUserProfile();

      expect(component.name).toBe('Jane Doe');
      expect(component.email).toBe('jane@example.com');
    });

    it('should handle no current phone', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue(null);
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({} as any);
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(() => vi.fn());

      await component.loadUserProfile();

      expect(component.currentUserPhone).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to home', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Profile Image Handling', () => {
    it('should trigger file input click', () => {
      component.onProfileImageClick();

      expect(component.fileInput.nativeElement.click).toHaveBeenCalled();
    });

    it('should handle valid image file selection', () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const event = {
        target: {
          files: [mockFile],
        },
      };

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      component.onFileSelected(event);

      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should reject non-image files', () => {
      const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const event = {
        target: {
          files: [mockFile],
        },
      };

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      component.onFileSelected(event);

      expect(alertSpy).toHaveBeenCalledWith('Please select a valid image file');
    });

    it('should handle no file selected', () => {
      const event = {
        target: {
          files: [],
        },
      };

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      component.onFileSelected(event);

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit', () => {
    it('should call loadUserProfile', () => {
      const loadSpy = vi.spyOn(component, 'loadUserProfile').mockResolvedValue();

      component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
    });
  });
});
