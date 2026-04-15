import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getAuth, signInWithEmailAndPassword, UserCredential, Auth } from 'firebase/auth';
import { UserManagementService } from './user-management.service';
import { PHONE_CONSTANTS, AUTH_KEYS } from '@zitro/utils';
import { getApp, getApps } from 'firebase/app';
import { Fast2SmsResponse, isFast2SmsSuccess } from '@zitro/models';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';
import { AppSettingsService } from './app-settings.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private auth: Auth;
  
  // SMS properties
  phoneNumber = '';
  message = '';
  status = 'Ready to send SMS';
  loading = false;
  private apiUrl: string = '';
  private authorization: string = '';
  private smsConfigsInitialized = false;
  
  // Cache for test phone numbers
  private testPhoneNumbersCache: string[] | null = null;

  constructor(
    private router: Router,
    private userManagementService: UserManagementService,
    private http: HttpClient,
    private errorHandler: FirebaseErrorHandlerService,
    private appSettingsService: AppSettingsService
  ) {
    // Prefer the already-initialized default Firebase app (created by AngularFire or manual init).
    try {
      if (getApps && getApps().length) {
        const defaultApp = getApp();
        this.auth = getAuth(defaultApp);
      } else {
        this.auth = getAuth();
      }
    } catch (err) {
      // Fallback to default getAuth() if anything goes wrong
      this.auth = getAuth();
    }
    
    // Initialize SMS configs from Firebase
    this.initializeSmsConfigs();
  }

  /**
   * Initialize SMS configuration from Firebase
   * Fetches apiUrl and authKey from appSettings/restaurantDetails/onlineorders/appSettings/smsConfigs
   */
  private async initializeSmsConfigs(): Promise<void> {
    try {
      const smsConfigs = await this.appSettingsService.getSmsConfigs();
      if (smsConfigs) {
        this.apiUrl = smsConfigs.apiUrl;
        this.authorization = smsConfigs.authKey;
        this.smsConfigsInitialized = true;
        console.log('✅ SMS configs initialized from Firebase');
      } else {
        console.warn('⚠️ SMS configs not found in Firebase, using default values');
      }
    } catch (error) {
      console.error('❌ Failed to initialize SMS configs:', error);
      console.log('Using default SMS configuration values');
    }
  }

  signInWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // Sign in with phone using custom SMS OTP
  async signInWithPhone(phone: string, otp: string): Promise<UserCredential> {
    // For now, allow any OTP to sign in (you should verify OTP properly in production)
    // Clear guest mode when user logs in
    this.clearUserAuthCache();

    const mockUserId = 'user_' + phone;
    
    localStorage.setItem(AUTH_KEYS.TOKEN, mockUserId);
    localStorage.setItem(AUTH_KEYS.IS_GUEST, 'false');
    localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, phone);
    localStorage.setItem(AUTH_KEYS.LOGGED_IN_DATE_TIME, new Date().toISOString());

    // Create or update user profile in onlineUsers collection
    try {
      const mockUser = {
        uid: mockUserId,
        phoneNumber: phone,
        displayName: null,
        email: null,
        photoURL: null,
        emailVerified: false
      } as any;

      await this.userManagementService.createOrUpdateUserEntry(mockUser);
    } catch (error) {
      console.error('Failed to create/update user profile:', error);
    }

    // Return a mock successful result shaped like UserCredential
    return Promise.resolve({ user: { uid: mockUserId, phoneNumber: phone } } as any);
  }

  // Send SMS OTP using Fast2SMS API
  sendSMSViaFast2SMSQuickSMSApi(): Promise<Fast2SmsResponse> {
    return new Promise(async (resolve, reject) => {
      if (!this.phoneNumber || !this.message) {
        this.status = '❌ Please enter phone number and message';
        const validationError = new Error('Phone number and message are required');
        this.errorHandler.handleAndLogError(validationError, 'Fast2SMS-Validation', {
          phoneNumber: this.phoneNumber ? 'present' : 'missing',
          message: this.message ? 'present' : 'missing'
        });
        reject(validationError);
        return;
      }

      // Ensure SMS configs are initialized before sending
      if (!this.smsConfigsInitialized) {
        await this.initializeSmsConfigs();
      }

      this.loading = true;
      this.status = 'Sending SMS...';

      const headers = {
        'accept': 'application/json'
      };

      const params = {
        authorization: this.authorization,
        message: this.message,
        route: 'q',
        numbers: this.phoneNumber,
        sms_details: '1'
      };

      this.http.get<Fast2SmsResponse>(this.apiUrl, { headers, params }).subscribe({
        next: async (response: Fast2SmsResponse) => {
          // Check if response is successful
          if (isFast2SmsSuccess(response)) {
            this.status = '✅ SMS sent successfully!';
            this.loading = false;
            resolve(response);
          } else {
            // Handle error responses
            this.loading = false;
            let errorMessage = 'Unknown error';
            let errorCode = 'unknown';
            
            if ('status_code' in response) {
              switch (response.status_code) {
                case 999:
                  errorCode = 'fast2sms-activation-required';
                  errorMessage = 'API activation required: ' + response.message;
                  this.status = '❌ API needs activation';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 999, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                case 401:
                  errorCode = 'fast2sms-auth-error';
                  errorMessage = 'Invalid authorization key: ' + response.message;
                  this.status = '❌ Invalid API key';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 401, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                case 400:
                  errorCode = 'fast2sms-bad-request';
                  errorMessage = 'Bad request: ' + response.message;
                  this.status = '❌ Invalid parameters';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 400, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                case 412:
                  errorCode = 'fast2sms-dlt-error';
                  errorMessage = 'DLT template error: ' + response.message;
                  this.status = '❌ DLT template issue';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 412, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                case 402:
                  errorCode = 'fast2sms-insufficient-balance';
                  errorMessage = 'Insufficient balance: ' + response.message;
                  this.status = '❌ Low balance';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 402, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                case 429:
                  errorCode = 'fast2sms-rate-limit';
                  errorMessage = 'Rate limit exceeded: ' + response.message;
                  this.status = '❌ Too many requests';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 429, phoneNumber: this.phoneNumber, response }
                  );
                  break;
                default:
                  errorCode = 'fast2sms-unknown';
                  errorMessage = 'message' in response ? (response as any).message : 'Unknown error';
                  this.status = '❌ SMS failed';
                  await this.errorHandler.handleAndLogError(
                    { code: errorCode, message: errorMessage },
                    'Fast2SMS-API',
                    { status_code: 'status_code' in response ? (response as any).status_code : 'unknown', phoneNumber: this.phoneNumber, response }
                  );
              }
            }
            
            console.error('Fast2SMS Error:', errorMessage, response);
            reject(new Error(errorMessage));
          }
        },
        error: async (error) => {
          console.error('HTTP Error:', error);
          this.status = '❌ Failed to send SMS: ' + (error.message || 'Network error');
          this.loading = false;
          
          // Log HTTP/Network errors
          await this.errorHandler.handleAndLogError(
            error,
            'Fast2SMS-Network',
            {
              phoneNumber: this.phoneNumber,
              httpStatus: error.status,
              httpStatusText: error.statusText,
              url: this.apiUrl
            }
          );
          
          reject(error);
        }
      });
    });
  }

  // Send OTP to phone number
  async sendOtp(phone: string): Promise<string> {
    // Remove +91 prefix if present for Fast2SMS
    this.phoneNumber = phone.replace('+91', '');
    
    // Fetch test phone numbers from Firebase (with caching)
    const testPhoneNumbers = await this.getTestPhoneNumbers();
    const isTestNumber = testPhoneNumbers.includes(this.phoneNumber);
    
    // Use fixed OTP for test numbers, random for real numbers
    const otp = isTestNumber ? PHONE_CONSTANTS.TEST_OTP : Math.floor(100000 + Math.random() * 900000).toString();
    this.message = `Your OTP for login To Zitro App is: ${otp}. Valid for 5 minutes.`;

    try {
      // Skip SMS sending for test numbers
      if (!isTestNumber) {
        await this.sendSMSViaFast2SMSQuickSMSApi();
      }
      
      // Store OTP temporarily for verification (in production, store server-side)
      localStorage.setItem('pending_otp_' + this.phoneNumber, otp);
      localStorage.setItem('otp_timestamp_' + this.phoneNumber, Date.now().toString());
      return otp; // Return OTP for testing purposes
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  // Verify OTP entered by user
  verifyOtp(phone: string, otp: string): boolean {
    const phoneNumber = phone.replace('+91', '');
    const storedOtp = localStorage.getItem('pending_otp_' + phoneNumber);
    const timestamp = localStorage.getItem('otp_timestamp_' + phoneNumber);

    if (!storedOtp || !timestamp) {
      return false;
    }

    // Check if OTP is expired (5 minutes)
    const otpAge = Date.now() - parseInt(timestamp);
    if (otpAge > 5 * 60 * 1000) {
      // Clean up expired OTP
      localStorage.removeItem('pending_otp_' + phoneNumber);
      localStorage.removeItem('otp_timestamp_' + phoneNumber);
      return false;
    }

    // Verify OTP
    if (storedOtp === otp) {
      // Clean up verified OTP
      localStorage.setItem(AUTH_KEYS.LOGGED_IN_DATE_TIME, new Date().toISOString());
      localStorage.removeItem('pending_otp_' + phoneNumber);
      localStorage.removeItem('otp_timestamp_' + phoneNumber);
      return true;
    }

    return false;
  }

  // Guest mode functionality
  continueAsGuest(): void {
    // Generate a unique guest identifier
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set guest mode in localStorage
    localStorage.setItem(AUTH_KEYS.IS_GUEST, 'true');
    localStorage.setItem(AUTH_KEYS.GUEST_ID, guestId);
    localStorage.setItem(AUTH_KEYS.TOKEN, guestId); // Use guestId as token for auth consistency
  }

  // Get guest ID
  getGuestId(): string | null {
    return localStorage.getItem(AUTH_KEYS.GUEST_ID);
  }

  /**
   * Returns a fresh Firebase ID token for the current user.
   * Used by AuthInterceptor to attach Authorization: Bearer <token>.
   * Throws if no user is signed in.
   */
  async getIdToken(): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    return user.getIdToken();
  }

  // Sign out (including guest mode)
  signOut(): void {
    this.clearUserAuthCache();
    
    // Clear user profile from the subject
    this.userManagementService.clearUserProfile();
    this.auth.signOut();
    this.router.navigate(['/auth/signin']);
  }

  private clearUserAuthCache() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.IS_GUEST);
    localStorage.removeItem(AUTH_KEYS.GUEST_ID);
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER_PHONE);
    localStorage.removeItem(AUTH_KEYS.LOGGED_IN_DATE_TIME);
    localStorage.removeItem(AUTH_KEYS.USER_DETAILS_CACHE_KEY);
  }

  /**
   * Get test phone numbers from Firebase with caching
   * Cache is cleared on each call to ensure fresh data, but prevents multiple Firebase calls in same session
   */
  async getTestPhoneNumbers(): Promise<string[]> {
    // Return cached value if available
    if (this.testPhoneNumbersCache !== null) {
      return this.testPhoneNumbersCache;
    }

    try {
      // Fetch from Firebase
      const testNumbers = await this.appSettingsService.getTestPhoneNumbers();
      
      // Cache the result
      this.testPhoneNumbersCache = testNumbers;
      
      return testNumbers;
    } catch (error) {
      console.error('Error fetching test phone numbers, using empty array:', error);
      // Cache empty array to prevent repeated failed fetches
      this.testPhoneNumbersCache = [];
      return [];
    }
  }

  /**
   * Clear cached test phone numbers (useful if numbers are updated in Firebase)
   */
  clearTestPhoneNumbersCache(): void {
    this.testPhoneNumbersCache = null;
  }
}
