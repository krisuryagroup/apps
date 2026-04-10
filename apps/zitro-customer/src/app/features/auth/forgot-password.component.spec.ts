import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      continueAsGuest: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    component = new ForgotPasswordComponent(mockAuthService, mockRouter);

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.email).toBe('');
      expect(component.emailError).toBe('');
      expect(component.isSubmitted).toBe(false);
      expect(component.successMessage).toBe('');
    });
  });

  describe('Email Validation', () => {
    it.each([
      { email: 'test@example.com', expected: true },
      { email: 'user@domain.co.in', expected: true },
      { email: 'john.doe@company.org', expected: true },
      { email: '', expected: false },
      { email: 'invalid', expected: false },
      { email: 'test@', expected: false },
      { email: '@example.com', expected: false },
      { email: 'test@.com', expected: false }
    ])('should validate email $email as $expected', ({ email, expected }) => {
      component.email = email;

      const result = component.validateEmail();

      expect(result).toBe(expected);
      if (expected) {
        expect(component.emailError).toBe('');
      } else {
        expect(component.emailError).not.toBe('');
      }
    });

    it('should set error message for invalid email', () => {
      component.email = 'invalid';

      component.validateEmail();

      expect(component.emailError).not.toBe('');
    });

    it('should clear error message for valid email', () => {
      component.emailError = 'Previous error';
      component.email = 'test@example.com';

      component.validateEmail();

      expect(component.emailError).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid email', () => {
      component.email = 'test@example.com';

      component.onSubmit();

      expect(component.isSubmitted).toBe(true);
      expect(component.successMessage).toBe('Password reset link has been sent to test@example.com');
    });

    it('should not submit with invalid email', () => {
      component.email = 'invalid';

      component.onSubmit();

      expect(component.isSubmitted).toBe(false);
      expect(component.successMessage).toBe('');
    });

    it('should log password reset request', () => {
      component.email = 'test@example.com';

      component.onSubmit();

      expect(console.log).toHaveBeenCalledWith('Password reset requested for:', 'test@example.com');
    });

    it('should include email in success message', () => {
      component.email = 'user@example.com';

      component.onSubmit();

      expect(component.successMessage).toContain('user@example.com');
    });

    it.each([
      { email: 'john@example.com' },
      { email: 'jane.doe@company.org' },
      { email: 'support@domain.co.in' }
    ])('should generate correct success message for $email', ({ email }) => {
      component.email = email;

      component.onSubmit();

      expect(component.successMessage).toBe(`Password reset link has been sent to ${email}`);
    });
  });

  describe('Continue as Guest', () => {
    it('should continue as guest and navigate to home', () => {
      component.continueAsGuest();

      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should call auth service before navigation', () => {
      const continueGuestSpy = vi.spyOn(mockAuthService, 'continueAsGuest');
      const navigateSpy = vi.spyOn(mockRouter, 'navigate');

      component.continueAsGuest();

      expect(continueGuestSpy).toHaveBeenCalledBefore(navigateSpy);
    });
  });

  describe('UI State Helpers', () => {
    it('should return true for valid email state', () => {
      component.email = 'test@example.com';
      component.emailError = '';

      expect(component.isEmailValid()).toBe(true);
    });

    it('should return false for valid state when email is empty', () => {
      component.email = '';
      component.emailError = '';

      expect(component.isEmailValid()).toBe(false);
    });

    it('should return false for valid state when there is error', () => {
      component.email = 'test@example.com';
      component.emailError = 'Invalid email';

      expect(component.isEmailValid()).toBe(false);
    });

    it('should return true for invalid email state', () => {
      component.email = 'test@example.com';
      component.emailError = 'Invalid email';

      expect(component.isEmailInvalid()).toBe(true);
    });

    it('should return false for invalid state when email is empty', () => {
      component.email = '';
      component.emailError = '';

      expect(component.isEmailInvalid()).toBe(false);
    });

    it('should return false for invalid state when error is empty', () => {
      component.email = 'test@example.com';
      component.emailError = '';

      expect(component.isEmailInvalid()).toBe(false);
    });
  });

  describe('Validation Flow', () => {
    it('should validate email before submission', () => {
      const validateSpy = vi.spyOn(component, 'validateEmail');
      component.email = 'test@example.com';

      component.onSubmit();

      expect(validateSpy).toHaveBeenCalled();
    });

    it('should prevent submission if validation fails', () => {
      component.email = 'invalid';

      component.onSubmit();

      expect(console.log).not.toHaveBeenCalled();
      expect(component.isSubmitted).toBe(false);
    });

    it('should allow submission if validation passes', () => {
      component.email = 'test@example.com';

      component.onSubmit();

      expect(console.log).toHaveBeenCalled();
      expect(component.isSubmitted).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should maintain submission state after successful submit', () => {
      component.email = 'test@example.com';

      component.onSubmit();

      expect(component.isSubmitted).toBe(true);
    });

    it('should not change submission state on failed validation', () => {
      component.isSubmitted = false;
      component.email = 'invalid';

      component.onSubmit();

      expect(component.isSubmitted).toBe(false);
    });

    it('should update success message only on valid submission', () => {
      component.email = 'invalid';

      component.onSubmit();

      expect(component.successMessage).toBe('');

      component.email = 'valid@example.com';
      component.onSubmit();

      expect(component.successMessage).not.toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email gracefully', () => {
      component.email = '';

      expect(() => component.validateEmail()).not.toThrow();
      expect(component.validateEmail()).toBe(false);
    });

    it('should handle whitespace-only email', () => {
      component.email = '   ';

      expect(component.validateEmail()).toBe(false);
    });

    it('should handle multiple consecutive submissions', () => {
      component.email = 'test@example.com';

      component.onSubmit();
      const firstMessage = component.successMessage;
      
      component.onSubmit();
      const secondMessage = component.successMessage;

      expect(firstMessage).toBe(secondMessage);
      expect(component.isSubmitted).toBe(true);
    });

    it('should allow changing email after submission', () => {
      component.email = 'first@example.com';
      component.onSubmit();

      component.email = 'second@example.com';
      component.onSubmit();

      expect(component.successMessage).toContain('second@example.com');
    });
  });

  describe('Error State Management', () => {
    it('should clear previous error on new validation', () => {
      component.email = 'invalid';
      component.validateEmail();
      const firstError = component.emailError;

      component.email = 'test@example.com';
      component.validateEmail();

      expect(component.emailError).not.toBe(firstError);
      expect(component.emailError).toBe('');
    });

    it('should preserve error state between validations if still invalid', () => {
      component.email = 'invalid1';
      component.validateEmail();

      component.email = 'invalid2';
      component.validateEmail();

      expect(component.emailError).not.toBe('');
    });
  });
});
