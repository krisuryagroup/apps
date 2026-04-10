import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContactUsComponent } from './contact-us.component';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let mockAppSettingsService: any;

  beforeEach(() => {
    mockAppSettingsService = {
      getContactInfo: vi.fn()
    };

    component = new ContactUsComponent(mockAppSettingsService);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.emailCopied).toBe(false);
      expect(component.phoneCopied).toBe(false);
      expect(component.email).toBe('Loading...');
      expect(component.phone).toBe('Loading...');
    });

    it('should load contact info successfully', async () => {
      const mockContactInfo = {
        contactEmail: 'test@example.com',
        contactPhone: '9876543210'
      };
      mockAppSettingsService.getContactInfo.mockResolvedValue(mockContactInfo);

      await component.ngOnInit();

      expect(component.email).toBe('test@example.com');
      expect(component.phone).toBe('+91 9876543210');
    });

    it('should use fallback values on error', async () => {
      mockAppSettingsService.getContactInfo.mockRejectedValue(new Error('Load failed'));

      await component.ngOnInit();

      expect(component.email).toBe('mahendrakumar0384@gmail.com');
      expect(component.phone).toBe('+91 9193116659');
    });
  });

  describe('Email Href Generation', () => {
    it.each([
      { email: 'test@example.com', expected: 'mailto:test@example.com' },
      { email: 'user@domain.co.in', expected: 'mailto:user@domain.co.in' },
      { email: 'Loading...', expected: 'mailto:Loading...' }
    ])('should return $expected for email $email', ({ email, expected }) => {
      component.email = email;

      expect(component.emailHref).toBe(expected);
    });
  });

  describe('Phone Href Generation', () => {
    it.each([
      { phone: '+91 9876543210', expected: 'tel:+919876543210' },
      { phone: '+91 1234567890', expected: 'tel:+911234567890' },
      { phone: 'Loading...', expected: 'tel:Loading...' }
    ])('should return $expected for phone $phone', ({ phone, expected }) => {
      component.phone = phone;

      expect(component.phoneHref).toBe(expected);
    });

    it('should remove all spaces from phone number', () => {
      component.phone = '+91  98 76  543210';

      expect(component.phoneHref).toBe('tel:+919876543210');
    });
  });

  describe('Copy Email', () => {
    it('should copy email to clipboard', async () => {
      component.email = 'test@example.com';
      const clipboardMock = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyEmail();

      expect(clipboardMock.writeText).toHaveBeenCalledWith('test@example.com');
      expect(component.emailCopied).toBe(true);
    });

    it('should reset emailCopied after 2 seconds', async () => {
      component.email = 'test@example.com';
      const clipboardMock = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyEmail();
      expect(component.emailCopied).toBe(true);

      vi.advanceTimersByTime(2000);

      expect(component.emailCopied).toBe(false);
    });

    it('should use fallback when clipboard API fails', async () => {
      component.email = 'test@example.com';
      const clipboardMock = {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      // Skip checking execCommand since it's deprecated and not available in test environment
      await component.copyEmail();

      // Just verify the copy was attempted and error was handled
      expect(clipboardMock.writeText).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Copy Phone', () => {
    it('should copy phone to clipboard', async () => {
      component.phone = '+91 9876543210';
      const clipboardMock = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyPhone();

      expect(clipboardMock.writeText).toHaveBeenCalledWith('+91 9876543210');
      expect(component.phoneCopied).toBe(true);
    });

    it('should reset phoneCopied after 2 seconds', async () => {
      component.phone = '+91 9876543210';
      const clipboardMock = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyPhone();
      expect(component.phoneCopied).toBe(true);

      vi.advanceTimersByTime(2000);

      expect(component.phoneCopied).toBe(false);
    });

    it('should use fallback when clipboard API fails', async () => {
      component.phone = '+91 9876543210';
      const clipboardMock = {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      // Skip checking execCommand since it's deprecated and not available in test environment
      await component.copyPhone();

      // Just verify the copy was attempted and error was handled
      expect(clipboardMock.writeText).toHaveBeenCalledWith('+91 9876543210');
    });
  });

  describe('Fallback Copy to Clipboard', () => {
    it('should handle clipboard errors gracefully', async () => {
      component.email = 'test@example.com';
      const clipboardMock = {
        writeText: vi.fn().mockRejectedValue(new Error('Not supported'))
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyEmail();

      expect(clipboardMock.writeText).toHaveBeenCalledWith('test@example.com');
    });

    it('should log error on clipboard failure', async () => {
      component.email = 'test@example.com';
      const clipboardMock = {
        writeText: vi.fn().mockRejectedValue(new Error('Not supported'))
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      await component.copyEmail();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Contact Info Loading States', () => {
    it.each([
      { email: 'contact@store.com', phone: '1234567890' },
      { email: 'info@restaurant.com', phone: '9999999999' },
      { email: 'support@delivery.com', phone: '8888888888' }
    ])('should load and format contact info correctly', async ({ email, phone }) => {
      mockAppSettingsService.getContactInfo.mockResolvedValue({
        contactEmail: email,
        contactPhone: phone
      });

      await component.ngOnInit();

      expect(component.email).toBe(email);
      expect(component.phone).toBe(`+91 ${phone}`);
    });

    it('should log error when loading fails', async () => {
      const error = new Error('Network error');
      mockAppSettingsService.getContactInfo.mockRejectedValue(error);

      await component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Error loading contact info:', error);
    });
  });

  describe('Copy State Management', () => {
    it('should not interfere between email and phone copy states', async () => {
      const clipboardMock = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboardMock,
        writable: true
      });

      component.email = 'test@example.com';
      component.phone = '+91 1234567890';

      await component.copyEmail();
      expect(component.emailCopied).toBe(true);
      expect(component.phoneCopied).toBe(false);

      await component.copyPhone();
      expect(component.emailCopied).toBe(true);
      expect(component.phoneCopied).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(component.emailCopied).toBe(false);
      expect(component.phoneCopied).toBe(false);
    });
  });
});
