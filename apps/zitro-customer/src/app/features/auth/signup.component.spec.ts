import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithPhone: vi.fn(),
      continueAsGuest: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    component = new SignupComponent(mockAuthService, mockRouter);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.name).toBe('');
      expect(component.email).toBe('');
      expect(component.password).toBe('');
      expect(component.confirmPassword).toBe('');
      expect(component.phone).toBe('');
      expect(component.otp).toBe('');
      expect(component.showOtp).toBe(false);
      expect(component.signupWithPhone).toBe(false);
      expect(component.errorMsg).toBe('');
    });

    it('should initialize with empty error messages', () => {
      expect(component.phoneError).toBe('');
      expect(component.otpError).toBe('');
      expect(component.emailError).toBe('');
      expect(component.nameError).toBe('');
      expect(component.passwordError).toBe('');
      expect(component.confirmPasswordError).toBe('');
    });
  });

  describe('Phone Validation', () => {
    it.each([
      { phone: '9876543210', expected: true },
      { phone: '1234567890', expected: true },
      { phone: '', expected: false },
      { phone: '12345', expected: false },
      { phone: '12345678901', expected: false }
    ])('should validate phone $phone as $expected', ({ phone, expected }) => {
      component.phone = phone;

      const result = component.validatePhone();

      expect(result).toBe(expected);
    });
  });

  describe('OTP Validation', () => {
    it.each([
      { otp: '123456', expected: true },
      { otp: '', expected: false },
      { otp: '12345', expected: false },
      { otp: '1234567', expected: false }
    ])('should validate otp $otp as $expected', ({ otp, expected }) => {
      component.otp = otp;

      const result = component.validateOtp();

      expect(result).toBe(expected);
    });

    it('should strip non-numeric characters from OTP input', () => {
      const event = {
        target: { value: '12a34b56' }
      };

      component.onOtpInput(event);

      expect(component.otp).toBe('123456');
    });

    it('should validate OTP after input', () => {
      const spy = vi.spyOn(component, 'validateOtp');
      const event = {
        target: { value: '123456' }
      };

      component.onOtpInput(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Email Validation', () => {
    it.each([
      { email: 'test@example.com', expected: true },
      { email: 'user@domain.co.in', expected: true },
      { email: '', expected: false },
      { email: 'invalid', expected: false },
      { email: 'test@', expected: false }
    ])('should validate email $email as $expected', ({ email, expected }) => {
      component.email = email;

      const result = component.validateEmail();

      expect(result).toBe(expected);
    });
  });

  describe('Name Validation', () => {
    it.each([
      { name: 'John Doe', expected: true },
      { name: 'Jane', expected: true },
      { name: '', expected: false },
      { name: '   ', expected: false }
    ])('should validate name "$name" as $expected', ({ name, expected }) => {
      component.name = name;

      const result = component.validateName();

      expect(result).toBe(expected);
    });
  });

  describe('Password Validation', () => {
    it.each([
      { password: 'password123', expected: true },
      { password: 'secure', expected: true },
      { password: '', expected: false },
      { password: '12345', expected: false },
      { password: 'short', expected: false }
    ])('should validate password "$password" as $expected', ({ password, expected }) => {
      component.password = password;

      const result = component.validatePassword();

      expect(result).toBe(expected);
    });
  });

  describe('Confirm Password Validation', () => {
    it('should validate matching passwords', () => {
      component.password = 'password123';
      component.confirmPassword = 'password123';

      const result = component.validateConfirmPassword();

      expect(result).toBe(true);
      expect(component.confirmPasswordError).toBe('');
    });

    it('should fail for non-matching passwords', () => {
      component.password = 'password123';
      component.confirmPassword = 'different';

      const result = component.validateConfirmPassword();

      expect(result).toBe(false);
      expect(component.confirmPasswordError).toBe('Passwords do not match');
    });

    it('should fail for empty confirm password', () => {
      component.password = 'password123';
      component.confirmPassword = '';

      const result = component.validateConfirmPassword();

      expect(result).toBe(false);
      expect(component.confirmPasswordError).toBe('Please confirm your password');
    });

    it('should fail for whitespace-only confirm password', () => {
      component.password = 'password123';
      component.confirmPassword = '   ';

      const result = component.validateConfirmPassword();

      expect(result).toBe(false);
      expect(component.confirmPasswordError).toBe('Please confirm your password');
    });
  });

  describe('Form Validation', () => {
    it('should validate complete form with all valid fields', () => {
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'password123';

      const result = component.validateForm();

      expect(result).toBe(true);
    });

    it('should fail if email is invalid', () => {
      component.email = 'invalid';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'password123';

      const result = component.validateForm();

      expect(result).toBe(false);
    });

    it('should fail if name is empty', () => {
      component.email = 'test@example.com';
      component.name = '';
      component.password = 'password123';
      component.confirmPassword = 'password123';

      const result = component.validateForm();

      expect(result).toBe(false);
    });

    it('should fail if password is too short', () => {
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = '123';
      component.confirmPassword = '123';

      const result = component.validateForm();

      expect(result).toBe(false);
    });

    it('should fail if passwords do not match', () => {
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'different';

      const result = component.validateForm();

      expect(result).toBe(false);
    });
  });

  describe('UI State Helpers', () => {
    it('should return correct name valid state', () => {
      component.name = 'John Doe';
      component.nameError = '';
      expect(component.isNameValid()).toBe(true);

      component.name = '';
      expect(component.isNameValid()).toBe(false);
    });

    it('should return correct name invalid state', () => {
      component.name = 'John Doe';
      component.nameError = 'Invalid name';
      expect(component.isNameInvalid()).toBe(true);

      component.name = '';
      component.nameError = '';
      expect(component.isNameInvalid()).toBe(false);
    });

    it('should return correct email valid state', () => {
      component.email = 'test@example.com';
      component.emailError = '';
      expect(component.isEmailValid()).toBe(true);
    });

    it('should return correct email invalid state', () => {
      component.email = 'test@example.com';
      component.emailError = 'Invalid email';
      expect(component.isEmailInvalid()).toBe(true);
    });

    it('should return correct password valid state', () => {
      component.password = 'password123';
      component.passwordError = '';
      expect(component.isPasswordValid()).toBe(true);
    });

    it('should return correct password invalid state', () => {
      component.password = 'password123';
      component.passwordError = 'Invalid password';
      expect(component.isPasswordInvalid()).toBe(true);
    });

    it('should return correct confirm password valid state', () => {
      component.confirmPassword = 'password123';
      component.confirmPasswordError = '';
      expect(component.isConfirmPasswordValid()).toBe(true);
    });

    it('should return correct confirm password invalid state', () => {
      component.confirmPassword = 'password123';
      component.confirmPasswordError = 'Passwords do not match';
      expect(component.isConfirmPasswordInvalid()).toBe(true);
    });

    it('should return correct phone valid state', () => {
      component.phone = '9876543210';
      component.phoneError = '';
      expect(component.isPhoneValid()).toBe(true);
    });

    it('should return correct phone invalid state', () => {
      component.phone = '9876543210';
      component.phoneError = 'Invalid phone';
      expect(component.isPhoneInvalid()).toBe(true);
    });

    it('should return correct OTP valid state', () => {
      component.otp = '123456';
      component.otpError = '';
      expect(component.isOtpValid()).toBe(true);
    });

    it('should return correct OTP invalid state', () => {
      component.otp = '123456';
      component.otpError = 'Invalid OTP';
      expect(component.isOtpInvalid()).toBe(true);
    });
  });

  describe('Phone Submit', () => {
    it('should send OTP for valid phone', async () => {
      component.phone = '9876543210';
      mockAuthService.sendOtp.mockResolvedValue('123456');

      await component.onPhoneSubmit();

      expect(mockAuthService.sendOtp).toHaveBeenCalledWith('+919876543210');
      expect(component.showOtp).toBe(true);
      expect(component.errorMsg).toBe('');
    });

    it('should not send OTP for invalid phone', async () => {
      component.phone = '123';

      await component.onPhoneSubmit();

      expect(mockAuthService.sendOtp).not.toHaveBeenCalled();
      expect(component.showOtp).toBe(false);
    });

    it('should handle OTP send error', async () => {
      component.phone = '9876543210';
      mockAuthService.sendOtp.mockRejectedValue(new Error('Network error'));

      await component.onPhoneSubmit();

      expect(component.errorMsg).toBe('Network error');
    });

    it('should show sending OTP message', async () => {
      component.phone = '9876543210';
      mockAuthService.sendOtp.mockResolvedValue('123456');

      const promise = component.onPhoneSubmit();
      expect(component.errorMsg).toBe('Sending OTP...');
      await promise;
    });
  });

  describe('OTP Submit', () => {
    beforeEach(() => {
      component.phone = '9876543210';
      component.otp = '123456';
    });

    it('should sign in with valid OTP', async () => {
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockResolvedValue({ user: { uid: '123' } });

      await component.onOtpSubmit();

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
      expect(mockAuthService.signInWithPhone).toHaveBeenCalledWith('9876543210', '123456');
      expect(component.errorMsg).toBe('');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should not submit with invalid OTP', async () => {
      component.otp = '123';

      await component.onOtpSubmit();

      expect(mockAuthService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should handle invalid OTP verification', async () => {
      mockAuthService.verifyOtp.mockReturnValue(false);

      await component.onOtpSubmit();

      expect(component.errorMsg).toContain('Invalid or expired OTP');
      expect(mockAuthService.signInWithPhone).not.toHaveBeenCalled();
    });

    it('should handle sign-in error', async () => {
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockRejectedValue(new Error('Sign-in failed'));

      await component.onOtpSubmit();

      expect(component.errorMsg).toBe('Sign-in failed');
    });

    it('should show verifying message', async () => {
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockResolvedValue({ user: { uid: '123' } });

      const promise = component.onOtpSubmit();
      expect(component.errorMsg).toBe('Verifying OTP...');
      await promise;
    });
  });

  describe('Email Signup', () => {
    beforeEach(() => {
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'password123';
    });

    it('should navigate to home on valid form', async () => {
      const mockForm = { valid: true };

      await component.onEmailSignup(mockForm);

      expect(component.errorMsg).toBe('');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should not submit with invalid form data', async () => {
      component.email = 'invalid';
      const mockForm = { valid: true };

      await component.onEmailSignup(mockForm);

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should not submit with invalid form', async () => {
      const mockForm = { valid: false };

      await component.onEmailSignup(mockForm);

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Continue as Guest', () => {
    it('should continue as guest and navigate to home', () => {
      component.continueAsGuest();

      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Error Message Scenarios', () => {
    it('should clear error message on successful signup', async () => {
      component.errorMsg = 'Previous error';
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'password123';
      const mockForm = { valid: true };

      await component.onEmailSignup(mockForm);

      expect(component.errorMsg).toBe('');
    });

    it('should handle error without message property', async () => {
      component.phone = '9876543210';
      mockAuthService.sendOtp.mockRejectedValue('Plain error');

      await component.onPhoneSubmit();

      expect(component.errorMsg).toBe('Failed to send OTP');
    });
  });

  describe('Validation Integration', () => {
    it('should validate all fields together correctly', () => {
      component.email = 'test@example.com';
      component.name = 'John Doe';
      component.password = 'password123';
      component.confirmPassword = 'password123';

      expect(component.validateEmail()).toBe(true);
      expect(component.validateName()).toBe(true);
      expect(component.validatePassword()).toBe(true);
      expect(component.validateConfirmPassword()).toBe(true);
      expect(component.validateForm()).toBe(true);
    });

    it('should fail form validation if any field is invalid', () => {
      component.email = 'test@example.com';
      component.name = '';
      component.password = 'password123';
      component.confirmPassword = 'password123';

      expect(component.validateForm()).toBe(false);
    });
  });
});
