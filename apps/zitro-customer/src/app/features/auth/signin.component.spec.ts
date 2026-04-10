import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SigninComponent } from './signin.component';
import { DEFAULT_AUTH_CONFIG } from '../../core/models/auth-config.model';

describe('SigninComponent', () => {
  let component: SigninComponent;
  let mockAuthService: any;
  let mockFavoritesService: any;
  let mockUserManagementService: any;
  let mockRouter: any;
  let mockAnalyticsService: any;
  let mockFirebaseOtpService: any;
  let mockAppSettingsService: any;

  beforeEach(() => {
    mockAuthService = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithPhone: vi.fn(),
      signInWithEmail: vi.fn(),
      continueAsGuest: vi.fn()
    };

    mockFavoritesService = {
      refreshCurrentUser: vi.fn(),
      checkAndOfferFavoritesMigration: vi.fn()
    };

    mockUserManagementService = {
      getUserData: vi.fn(),
      getCurrentUserPhone: vi.fn().mockResolvedValue('1234567890')
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockAnalyticsService = {
      logLogin: vi.fn()
    };

    mockFirebaseOtpService = {
      sendOtp: vi.fn()
    };

    mockAppSettingsService = {
      getAuthConfig: vi.fn().mockResolvedValue(DEFAULT_AUTH_CONFIG)
    };

    component = new SigninComponent(
      mockAuthService,
      mockFavoritesService,
      mockUserManagementService,
      mockRouter,
      mockAnalyticsService,
      mockFirebaseOtpService,
      mockAppSettingsService
    );

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.email).toBe('');
      expect(component.password).toBe('');
      expect(component.phone).toBe('');
      expect(component.otp).toBe('');
      expect(component.showOtp).toBe(false);
      expect(component.loginWithPhone).toBe(true);
      expect(component.rememberMe).toBe(false);
      expect(component.errorMsg).toBe('');
    });

    it('should initialize with empty error messages', () => {
      expect(component.phoneError).toBe('');
      expect(component.otpError).toBe('');
      expect(component.emailError).toBe('');
    });

    it('should initialize authConfig with defaults', () => {
      expect(component.authConfig).toEqual(DEFAULT_AUTH_CONFIG);
    });

    it('should load auth config on initialization', async () => {
      await vi.advanceTimersByTimeAsync(0);
      expect(mockAppSettingsService.getAuthConfig).toHaveBeenCalled();
    });

    it('should use default config if fetch fails', async () => {
      mockAppSettingsService.getAuthConfig.mockRejectedValue(new Error('Network error'));
      
      const newComponent = new SigninComponent(
        mockAuthService,
        mockFavoritesService,
        mockUserManagementService,
        mockRouter,
        mockAnalyticsService,
        mockFirebaseOtpService,
        mockAppSettingsService
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(newComponent.authConfig).toEqual(DEFAULT_AUTH_CONFIG);
    });
  });

  describe('Validation', () => {
    describe('Phone Validation', () => {
      it.each([
        { phone: '9876543210', expected: true, description: 'valid 10 digit number' },
        { phone: '1234567890', expected: true, description: 'another valid 10 digit' },
        { phone: '', expected: false, description: 'empty string' },
        { phone: '12345', expected: false, description: 'less than 10 digits' },
        { phone: '12345678901', expected: false, description: 'more than 10 digits' }
      ])('should validate $description as $expected', ({ phone, expected }) => {
        component.phone = phone;

        const result = component.validatePhone();

        expect(result).toBe(expected);
        if (!expected) {
          expect(component.phoneError).not.toBe('');
        } else {
          expect(component.phoneError).toBe('');
        }
      });
    });

    describe('OTP Validation', () => {
      it.each([
        { otp: '123456', expected: true, description: 'valid 6 digit OTP' },
        { otp: '000000', expected: true, description: 'all zeros OTP' },
        { otp: '', expected: false, description: 'empty OTP' },
        { otp: '12345', expected: false, description: 'less than 6 digits' },
        { otp: '1234567', expected: false, description: 'more than 6 digits' }
      ])('should validate $description as $expected', ({ otp, expected }) => {
        component.otp = otp;

        const result = component.validateOtp();

        expect(result).toBe(expected);
        if (!expected) {
          expect(component.otpError).not.toBe('');
        } else {
          expect(component.otpError).toBe('');
        }
      });

      it('should filter non-numeric characters from OTP input', () => {
        const event = { target: { value: '12a34b56' } };

        component.onOtpInput(event);

        expect(component.otp).toBe('123456');
      });

      it('should allow only numeric characters', () => {
        const event = { target: { value: 'abcdef' } };

        component.onOtpInput(event);

        expect(component.otp).toBe('');
      });

      it('should validate OTP after input', () => {
        const spy = vi.spyOn(component, 'validateOtp');
        const event = { target: { value: '123456' } };

        component.onOtpInput(event);

        expect(spy).toHaveBeenCalled();
      });
    });

    describe('Email Validation', () => {
      it.each([
        { email: 'test@example.com', expected: true, description: 'standard email' },
        { email: 'user.name+tag@example.co.uk', expected: true, description: 'complex email' },
        { email: '', expected: false, description: 'empty email' },
        { email: 'invalid', expected: false, description: 'no @ symbol' },
        { email: 'test@', expected: false, description: 'missing domain' },
        { email: '@example.com', expected: false, description: 'missing username' }
      ])('should validate $description as $expected', ({ email, expected }) => {
        component.email = email;

        const result = component.validateEmail();

        expect(result).toBe(expected);
        if (!expected) {
          expect(component.emailError).not.toBe('');
        } else {
          expect(component.emailError).toBe('');
        }
      });
    });
  });

  describe('UI State Helpers', () => {
    it('should return correct email valid state', () => {
      component.email = 'test@example.com';
      component.emailError = '';
      expect(component.isEmailValid()).toBe(true);

      component.email = '';
      expect(component.isEmailValid()).toBe(false);
    });

    it('should return correct email invalid state', () => {
      component.email = 'test@example.com';
      component.emailError = 'Invalid email';
      expect(component.isEmailInvalid()).toBe(true);

      component.email = '';
      component.emailError = '';
      expect(component.isEmailInvalid()).toBe(false);
    });

    it('should return correct phone states', () => {
      component.phone = '9876543210';
      component.phoneError = '';
      expect(component.isPhoneValid()).toBe(true);
      expect(component.isPhoneInvalid()).toBe(false);

      component.phoneError = 'Invalid phone';
      expect(component.isPhoneValid()).toBe(false);
      expect(component.isPhoneInvalid()).toBe(true);
    });

    it('should return correct OTP states', () => {
      component.otp = '123456';
      component.otpError = '';
      expect(component.isOtpValid()).toBe(true);
      expect(component.isOtpInvalid()).toBe(false);

      component.otpError = 'Invalid OTP';
      expect(component.isOtpValid()).toBe(false);
      expect(component.isOtpInvalid()).toBe(true);
    });
  });

  describe('Send OTP', () => {
    describe('Firebase First Strategy', () => {
      beforeEach(() => {
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        component.authConfig.sms.isFast2SmsPhoneAuthentication = true;
      });

      it('should send OTP via Firebase successfully', async () => {
        component.phone = '9876543210';
        const mockConfirmationResult = { verificationId: 'test-id' };
        mockFirebaseOtpService.sendOtp.mockResolvedValue(mockConfirmationResult);

        await component.onPhoneSubmit();

        expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalledWith('+919876543210');
        expect(component.showOtp).toBe(true);
        expect(component['usingFirebaseOtp']).toBe(true);
        expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentSuccessMessage);
      });

      it('should fallback to Fast2SMS when Firebase fails', async () => {
        component.phone = '9876543210';
        mockFirebaseOtpService.sendOtp.mockRejectedValue(new Error('Firebase error'));
        mockAuthService.sendOtp.mockResolvedValue('123456');

        await component.onPhoneSubmit();

        expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalled();
        expect(mockAuthService.sendOtp).toHaveBeenCalledWith('+919876543210');
        expect(component.showOtp).toBe(true);
        expect(component['usingFirebaseOtp']).toBe(false);
        expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentSuccessMessage);
      });

      it('should show failure message when both methods fail', async () => {
        component.phone = '9876543210';
        mockFirebaseOtpService.sendOtp.mockRejectedValue(new Error('Firebase error'));
        mockAuthService.sendOtp.mockRejectedValue(new Error('Fast2SMS error'));

        await component.onPhoneSubmit();

        expect(component.showOtp).toBe(false);
        expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentFailureMessage);
      });

      it('should not send OTP with invalid phone number', async () => {
        component.phone = '12345';

        await component.onPhoneSubmit();

        expect(mockFirebaseOtpService.sendOtp).not.toHaveBeenCalled();
        expect(mockAuthService.sendOtp).not.toHaveBeenCalled();
      });
    });

    describe('Configuration Flags', () => {
      it('should only use Firebase when Fast2SMS is disabled', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        component.authConfig.sms.isFast2SmsPhoneAuthentication = false;
        mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });

        await component.onPhoneSubmit();

        expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalled();
        expect(mockAuthService.sendOtp).not.toHaveBeenCalled();
      });

      it('should show error when Firebase fails and Fast2SMS is disabled', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        component.authConfig.sms.isFast2SmsPhoneAuthentication = false;
        mockFirebaseOtpService.sendOtp.mockRejectedValue(new Error('Firebase error'));

        await component.onPhoneSubmit();

        expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentFailureMessage);
        expect(mockAuthService.sendOtp).not.toHaveBeenCalled();
      });

      it('should only use Fast2SMS when Firebase is disabled', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = false;
        component.authConfig.sms.isFast2SmsPhoneAuthentication = true;
        mockAuthService.sendOtp.mockResolvedValue('123456');

        await component.onPhoneSubmit();

        expect(mockFirebaseOtpService.sendOtp).not.toHaveBeenCalled();
        expect(mockAuthService.sendOtp).toHaveBeenCalled();
      });

      it('should show error when both methods are disabled', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = false;
        component.authConfig.sms.isFast2SmsPhoneAuthentication = false;

        await component.onPhoneSubmit();

        expect(component.errorMsg).toBe('OTP service is currently unavailable.');
        expect(component.showOtp).toBe(false);
      });
    });

    describe('Resend Timer', () => {
      it('should start resend timer after successful OTP send', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        component.authConfig.sms.resendOTPAllowed = true;
        component.authConfig.sms.resendOTPTime = 60;
        mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });
        component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

        await component.onPhoneSubmit();

        expect(component.resendCountdown).toBe(60);
        expect(component.canResendOtp).toBe(false);
      });

      it('should countdown and enable resend after timer expires', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        component.authConfig.sms.resendOTPAllowed = true;
        component.authConfig.sms.resendOTPTime = 60;
        mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });
        component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

        await component.onPhoneSubmit();

        vi.advanceTimersByTime(30000);
        expect(component.resendCountdown).toBe(30);
        expect(component.canResendOtp).toBe(false);

        vi.advanceTimersByTime(30000);
        expect(component.resendCountdown).toBe(0);
        expect(component.canResendOtp).toBe(true);
      });

      it('should not start timer when resendOTPAllowed is false', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.resendOTPAllowed = false;
        mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });

        await component.onPhoneSubmit();

        expect(component.resendCountdown).toBe(0);
      });
    });

    describe('Auto-focus', () => {
      it('should auto-focus OTP input after successful send', async () => {
        component.phone = '9876543210';
        component.authConfig.sms.isFirebasePhoneAuthentication = true;
        const mockOtpInput = { nativeElement: { focus: vi.fn() } };
        component.otpInput = mockOtpInput as any;
        mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });

        await component.onPhoneSubmit();
        vi.advanceTimersByTime(100);

        expect(mockOtpInput.nativeElement.focus).toHaveBeenCalled();
      });
    });
  });

  describe('Verify OTP', () => {
    describe('Firebase OTP Verification', () => {
      it('should verify Firebase OTP successfully', async () => {
        component.phone = '9876543210';
        component.otp = '123456';
        const mockConfirmationResult = {
          confirm: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } })
        };
        component['confirmationResult'] = mockConfirmationResult as any;
        component['usingFirebaseOtp'] = true;
        mockAuthService.signInWithPhone.mockResolvedValue({});

        await component.onOtpSubmit();

        expect(mockConfirmationResult.confirm).toHaveBeenCalledWith('123456');
        expect(mockAuthService.signInWithPhone).toHaveBeenCalled();
        expect(mockAnalyticsService.logLogin).toHaveBeenCalledWith('phone');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      });

      it('should show user-friendly error for invalid Firebase OTP', async () => {
        component.phone = '9876543210';
        component.otp = '000000';
        const mockConfirmationResult = {
          confirm: vi.fn().mockRejectedValue({ code: 'auth/invalid-verification-code' })
        };
        component['confirmationResult'] = mockConfirmationResult as any;
        component['usingFirebaseOtp'] = true;

        await component.onOtpSubmit();

        expect(component.errorMsg).toContain('Invalid OTP');
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      });

      it('should handle expired Firebase OTP', async () => {
        component.phone = '9876543210';
        component.otp = '123456';
        const mockConfirmationResult = {
          confirm: vi.fn().mockRejectedValue({ code: 'auth/code-expired' })
        };
        component['confirmationResult'] = mockConfirmationResult as any;
        component['usingFirebaseOtp'] = true;

        await component.onOtpSubmit();

        expect(component.errorMsg).toContain('expired');
      });

      it('should handle too many attempts error', async () => {
        component.phone = '9876543210';
        component.otp = '123456';
        const mockConfirmationResult = {
          confirm: vi.fn().mockRejectedValue({ code: 'auth/too-many-requests' })
        };
        component['confirmationResult'] = mockConfirmationResult as any;
        component['usingFirebaseOtp'] = true;

        await component.onOtpSubmit();

        expect(component.errorMsg).toContain('Too many attempts');
      });
    });

    describe('Fast2SMS OTP Verification', () => {
      it('should verify Fast2SMS OTP successfully', async () => {
        component.phone = '9876543210';
        component.otp = '123456';
        component['usingFirebaseOtp'] = false;
        mockAuthService.verifyOtp.mockReturnValue(true);
        mockAuthService.signInWithPhone.mockResolvedValue({});

        await component.onOtpSubmit();

        expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
        expect(mockAuthService.signInWithPhone).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      });

      it('should show error for invalid Fast2SMS OTP', async () => {
        component.phone = '9876543210';
        component.otp = '000000';
        component['usingFirebaseOtp'] = false;
        mockAuthService.verifyOtp.mockReturnValue(false);

        await component.onOtpSubmit();

        expect(component.errorMsg).toContain('Invalid or expired OTP');
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      });
    });

    it('should not verify with invalid OTP format', async () => {
      component.phone = '9876543210';
      component.otp = '123';

      await component.onOtpSubmit();

      expect(mockAuthService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should clear timer on successful verification', async () => {
      component.phone = '9876543210';
      component.otp = '123456';
      component['resendTimer'] = setInterval(() => {}, 1000) as any;
      component['usingFirebaseOtp'] = false;
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockResolvedValue({});

      await component.onOtpSubmit();

      expect(component['resendTimer']).toBeNull();
    });

    it('should refresh favorites after successful verification', async () => {
      component.phone = '9876543210';
      component.otp = '123456';
      component['usingFirebaseOtp'] = false;
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockResolvedValue({});

      await component.onOtpSubmit();

      expect(mockFavoritesService.refreshCurrentUser).toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(mockFavoritesService.checkAndOfferFavoritesMigration).toHaveBeenCalled();
    });
  });

  describe('Resend OTP', () => {
    it('should resend OTP when timer allows', async () => {
      component.phone = '9876543210';
      component.canResendOtp = true;
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      component.authConfig.sms.resendOTPAllowed = true;
      component.authConfig.sms.resendOTPTime = 60;
      mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });
      component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

      await component.resendOtp();

      expect(component.otp).toBe('');
      expect(component.otpError).toBe('');
      expect(component['confirmationResult']).toEqual({ verificationId: 'test-id' });
      expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalled();
    });

    it('should not resend when timer is active', async () => {
      component.phone = '9876543210';
      component.canResendOtp = false;

      await component.resendOtp();

      expect(mockFirebaseOtpService.sendOtp).not.toHaveBeenCalled();
    });
  });

  describe('Email Login', () => {
    it('should sign in with valid credentials', async () => {
      component.email = 'test@example.com';
      component.password = 'password123';
      const mockUser = { user: { uid: 'user123' } };
      mockAuthService.signInWithEmail.mockResolvedValue(mockUser);
      const mockForm = { valid: true };

      await component.onEmailLogin(mockForm);

      expect(mockAuthService.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(localStorage.getItem('token')).toBe('user123');
      expect(mockAnalyticsService.logLogin).toHaveBeenCalledWith('email');
    });

    it('should clear guest mode on successful login', async () => {
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestId', 'guest123');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });

      await component.onEmailLogin({ valid: true });

      expect(localStorage.getItem('isGuest')).toBeNull();
      expect(localStorage.getItem('guestId')).toBeNull();
    });

    it('should not submit with invalid email', async () => {
      component.email = 'invalid-email';
      component.password = 'password123';

      await component.onEmailLogin({ valid: true });

      expect(mockAuthService.signInWithEmail).not.toHaveBeenCalled();
    });

    it('should not submit with invalid form', async () => {
      component.email = 'test@example.com';
      component.password = 'password123';

      await component.onEmailLogin({ valid: false });

      expect(mockAuthService.signInWithEmail).not.toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue(null);

      await component.onEmailLogin({ valid: true });

      expect(component.errorMsg).toBe('Login failed');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle login error', async () => {
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockRejectedValue(new Error('Auth error'));

      await component.onEmailLogin({ valid: true });

      expect(component.errorMsg).toBe('Auth error');
    });
  });

  describe('Post-Login Navigation', () => {
    it('should navigate to home for normal login', async () => {
      localStorage.removeItem('pendingCheckout');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });

      await component.onEmailLogin({ valid: true });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should navigate to cart when checkout pending and user has addresses', async () => {
      localStorage.setItem('pendingCheckout', 'true');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });
      mockUserManagementService.getUserData.mockResolvedValue({
        addresses: [{ name: 'Home' }]
      });

      await component.onEmailLogin({ valid: true });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
      expect(localStorage.getItem('pendingCheckout')).toBeNull();
    });

    it('should navigate to addresses when checkout pending and no addresses', async () => {
      localStorage.setItem('pendingCheckout', 'true');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });

      await component.onEmailLogin({ valid: true });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/addresses']);
      expect(localStorage.getItem('redirectAfterAddress')).toBe('checkout');
    });

    it('should handle null addresses as no addresses', async () => {
      localStorage.setItem('pendingCheckout', 'true');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: null });

      await component.onEmailLogin({ valid: true });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/addresses']);
    });

    it('should handle error checking addresses gracefully', async () => {
      localStorage.setItem('pendingCheckout', 'true');
      component.email = 'test@example.com';
      component.password = 'password123';
      mockAuthService.signInWithEmail.mockResolvedValue({ user: { uid: 'user123' } });
      mockUserManagementService.getUserData.mockRejectedValue(new Error('Network error'));

      await component.onEmailLogin({ valid: true });

      expect(console.error).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
    });
  });

  describe('Guest Mode', () => {
    it('should continue as guest and navigate to home', () => {
      component.continueAsGuest();

      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Auto-focus Behavior', () => {
    it('should auto-focus phone input on component init', () => {
      const mockPhoneInput = { nativeElement: { focus: vi.fn() } };
      component.phoneInput = mockPhoneInput as any;
      component.loginWithPhone = true;

      component.ngAfterViewInit();
      vi.advanceTimersByTime(100);

      expect(mockPhoneInput.nativeElement.focus).toHaveBeenCalled();
    });

    it('should not auto-focus when loginWithPhone is false', () => {
      const mockPhoneInput = { nativeElement: { focus: vi.fn() } };
      component.phoneInput = mockPhoneInput as any;
      component.loginWithPhone = false;

      component.ngAfterViewInit();
      vi.advanceTimersByTime(100);

      expect(mockPhoneInput.nativeElement.focus).not.toHaveBeenCalled();
    });

    it('should not throw when phoneInput is undefined', () => {
      component.phoneInput = undefined as any;
      component.loginWithPhone = true;

      expect(() => {
        component.ngAfterViewInit();
        vi.advanceTimersByTime(100);
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clear timer on component destroy', () => {
      component['resendTimer'] = setInterval(() => {}, 1000);

      component.ngOnDestroy();

      expect(component['resendTimer']).toBeNull();
    });

    it('should handle destroy when timer is null', () => {
      component['resendTimer'] = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
  let component: SigninComponent;
  let mockAuthService: any;
  let mockFavoritesService: any;
  let mockUserManagementService: any;
  let mockRouter: any;
  let mockAnalyticsService: any;
  let mockFirebaseOtpService: any;
  let mockAppSettingsService: any;

  beforeEach(() => {
    mockAuthService = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithPhone: vi.fn(),
      signInWithEmail: vi.fn(),
      continueAsGuest: vi.fn()
    };

    mockFavoritesService = {
      refreshCurrentUser: vi.fn(),
      checkAndOfferFavoritesMigration: vi.fn()
    };

    mockUserManagementService = {
      getUserData: vi.fn(),
      getCurrentUserPhone: vi.fn().mockResolvedValue('1234567890')
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockAnalyticsService = {
      logLogin: vi.fn()
    };

    mockFirebaseOtpService = {
      sendOtp: vi.fn()
    };

    mockAppSettingsService = {
      getAuthConfig: vi.fn().mockResolvedValue(DEFAULT_AUTH_CONFIG)
    };

    component = new SigninComponent(
      mockAuthService,
      mockFavoritesService,
      mockUserManagementService,
      mockRouter,
      mockAnalyticsService,
      mockFirebaseOtpService,
      mockAppSettingsService
    );

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.email).toBe('');
      expect(component.password).toBe('');
      expect(component.phone).toBe('');
      expect(component.otp).toBe('');
      expect(component.showOtp).toBe(false);
      expect(component.loginWithPhone).toBe(true);
      expect(component.rememberMe).toBe(false);
      expect(component.errorMsg).toBe('');
    });

    it('should load auth config on initialization', async () => {
      await vi.advanceTimersByTimeAsync(0);
      expect(mockAppSettingsService.getAuthConfig).toHaveBeenCalled();
    });

    it('should use default config if fetch fails', async () => {
      mockAppSettingsService.getAuthConfig.mockRejectedValue(new Error('Network error'));
      
      const newComponent = new SigninComponent(
        mockAuthService,
        mockFavoritesService,
        mockUserManagementService,
        mockRouter,
        mockAnalyticsService,
        mockFirebaseOtpService,
        mockAppSettingsService
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(newComponent.authConfig).toEqual(DEFAULT_AUTH_CONFIG);
    });
  });

  describe('Send OTP - Firebase First', () => {
    it('should send OTP via Firebase successfully', async () => {
      component.phone = '9876543210';
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      const mockConfirmationResult = { verificationId: 'test-id' };
      mockFirebaseOtpService.sendOtp.mockResolvedValue(mockConfirmationResult);
      component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

      await component.onPhoneSubmit();

      expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalledWith('+919876543210');
      expect(component.showOtp).toBe(true);
      expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentSuccessMessage);
    });

    it('should fallback to Fast2SMS when Firebase fails', async () => {
      component.phone = '9876543210';
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      component.authConfig.sms.isFast2SmsPhoneAuthentication = true;
      mockFirebaseOtpService.sendOtp.mockRejectedValue(new Error('Firebase error'));
      mockAuthService.sendOtp.mockResolvedValue('123456');
      component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

      await component.onPhoneSubmit();

      expect(mockAuthService.sendOtp).toHaveBeenCalledWith('+919876543210');
      expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentSuccessMessage);
    });

    it('should show failure message when both methods fail', async () => {
      component.phone = '9876543210';
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      component.authConfig.sms.isFast2SmsPhoneAuthentication = true;
      mockFirebaseOtpService.sendOtp.mockRejectedValue(new Error('Firebase error'));
      mockAuthService.sendOtp.mockRejectedValue(new Error('Fast2SMS error'));

      await component.onPhoneSubmit();

      expect(component.errorMsg).toBe(DEFAULT_AUTH_CONFIG.ui.otpSentFailureMessage);
      expect(component.showOtp).toBe(false);
    });

    it('should start resend timer after OTP send', async () => {
      component.phone = '9876543210';
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      component.authConfig.sms.resendOTPAllowed = true;
      component.authConfig.sms.resendOTPTime = 60;
      mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });
      component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

      await component.onPhoneSubmit();

      expect(component.resendCountdown).toBe(60);
      expect(component.canResendOtp).toBe(false);
    });
  });

  describe('Verify OTP', () => {
    it('should verify Firebase OTP successfully', async () => {
      component.phone = '9876543210';
      component.otp = '123456';
      const mockConfirmationResult = {
        confirm: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } })
      };
      component['confirmationResult'] = mockConfirmationResult as any;
      component['usingFirebaseOtp'] = true;
      mockAuthService.signInWithPhone.mockResolvedValue({});

      await component.onOtpSubmit();

      expect(mockConfirmationResult.confirm).toHaveBeenCalledWith('123456');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should verify Fast2SMS OTP successfully', async () => {
      component.phone = '9876543210';
      component.otp = '123456';
      component['usingFirebaseOtp'] = false;
      mockAuthService.verifyOtp.mockReturnValue(true);
      mockAuthService.signInWithPhone.mockResolvedValue({});

      await component.onOtpSubmit();

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should show error for invalid OTP', async () => {
      component.phone = '9876543210';
      component.otp = '000000';
      component['usingFirebaseOtp'] = false;
      mockAuthService.verifyOtp.mockReturnValue(false);

      await component.onOtpSubmit();

      expect(component.errorMsg).toContain('Invalid or expired OTP');
    });
  });

  describe('Resend OTP', () => {
    it('should resend OTP when timer expires', async () => {
      component.phone = '9876543210';
      component.canResendOtp = true;
      component.authConfig.sms.isFirebasePhoneAuthentication = true;
      component.authConfig.sms.resendOTPAllowed = true;
      component.authConfig.sms.resendOTPTime = 60;
      mockFirebaseOtpService.sendOtp.mockResolvedValue({ verificationId: 'test-id' });
      component.otpInput = { nativeElement: { focus: vi.fn() } } as any;

      await component.resendOtp();

      expect(component.otp).toBe('');
      expect(mockFirebaseOtpService.sendOtp).toHaveBeenCalled();
    });

    it('should not resend when timer is active', async () => {
      component.canResendOtp = false;

      await component.resendOtp();

      expect(mockFirebaseOtpService.sendOtp).not.toHaveBeenCalled();
    });
  });

  describe('Auto-focus', () => {
    it('should focus phone input on init', () => {
      const mockPhoneInput = {
        nativeElement: { focus: vi.fn() }
      };
      component.phoneInput = mockPhoneInput as any;
      component.loginWithPhone = true;

      component.ngAfterViewInit();
      vi.advanceTimersByTime(100);

      expect(mockPhoneInput.nativeElement.focus).toHaveBeenCalled();
    });
  });

  describe('Timer Management', () => {
    it('should clear timer on destroy', () => {
      component['resendTimer'] = setInterval(() => {}, 1000);

      component.ngOnDestroy();

      expect(component['resendTimer']).toBeNull();
    });
  });