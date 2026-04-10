import { Injectable } from '@angular/core';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  action?: string;
}

export interface ErrorLog {
  timestamp: any;
  errorCode: string;
  errorMessage: string;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  action?: string;
  source: string;
  additionalData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseErrorHandlerService {
  private _db: any = null;

  constructor() {}

  // Lazy initialization of Firestore to avoid circular dependencies
  private get db() {
    if (!this._db) {
      try {
        this._db = getFirestore(getApp());
      } catch (error) {
        console.error('Failed to initialize Firestore:', error);
      }
    }
    return this._db;
  }

  /**
   * Handle Firebase errors and provide user-friendly messages
   */
  handleError(error: any): FirebaseErrorInfo {
    console.error('🔥 Firebase Error Details:', error);

    // Default error info
    let errorInfo: FirebaseErrorInfo = {
      code: 'unknown',
      message: 'An unknown error occurred',
      userFriendlyMessage: 'Something went wrong. Please try again.',
      shouldRetry: true
    };

    // Check if it's a Firebase error
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as any;
      errorInfo.code = firebaseError.code;
      errorInfo.message = firebaseError.message;

      switch (firebaseError.code) {
        case 'permission-denied':
          errorInfo.userFriendlyMessage = 'Access denied. Please check your permissions.';
          errorInfo.shouldRetry = false;
          errorInfo.action = 'Check Firebase Security Rules and ensure they allow read access';
          break;

        case 'unavailable':
          errorInfo.userFriendlyMessage = 'Service temporarily unavailable. Please try again.';
          errorInfo.shouldRetry = true;
          break;

        case 'not-found':
          errorInfo.userFriendlyMessage = 'Requested data not found.';
          errorInfo.shouldRetry = false;
          break;

        case 'cancelled':
          errorInfo.userFriendlyMessage = 'Operation was cancelled.';
          errorInfo.shouldRetry = true;
          break;

        case 'deadline-exceeded':
          errorInfo.userFriendlyMessage = 'Request timed out. Please try again.';
          errorInfo.shouldRetry = true;
          break;

        case 'invalid-argument':
          errorInfo.userFriendlyMessage = 'Invalid request. Please check your data.';
          errorInfo.shouldRetry = false;
          break;

        case 'unauthenticated':
          errorInfo.userFriendlyMessage = 'Authentication required.';
          errorInfo.shouldRetry = false;
          errorInfo.action = 'Please sign in to continue';
          break;

        default:
          errorInfo.userFriendlyMessage = `Firebase error: ${firebaseError.code}`;
          break;
      }
    }

    // Log structured error information
    this.logErrorInfo(errorInfo);

    return errorInfo;
  }

  /**
   * Handle and log SMS/API errors to Firebase
   */
  async handleAndLogError(error: any, source: string, additionalData?: any): Promise<FirebaseErrorInfo> {
    const errorInfo = this.handleError(error);
    
    // Log to Firestore
    await this.logErrorToFirebase(errorInfo, source, additionalData);
    
    return errorInfo;
  }

  /**
   * Log error to Firebase Firestore
   */
  private async logErrorToFirebase(
    errorInfo: FirebaseErrorInfo,
    source: string,
    additionalData?: any
  ): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        timestamp: Timestamp.now(),
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message,
        userFriendlyMessage: errorInfo.userFriendlyMessage,
        shouldRetry: errorInfo.shouldRetry,
        action: errorInfo.action,
        source: source,
        additionalData: additionalData
      };

      const errorsCollection = collection(this.db, 'errorLogs');
      const docRef = await addDoc(errorsCollection, errorLog);
      
      console.log('✅ Error logged to Firebase with ID:', docRef.id);
    } catch (logError) {
      // Don't throw if logging fails, just log to console
      console.error('❌ Failed to log error to Firebase:', logError);
    }
  }

  /**
   * Check if error is related to permissions
   */
  isPermissionError(error: any): boolean {
    return error && error.code === 'permission-denied';
  }

  /**
   * Check if error suggests network issues
   */
  isNetworkError(error: any): boolean {
    const networkCodes = ['unavailable', 'deadline-exceeded', 'cancelled'];
    return error && networkCodes.includes(error.code);
  }

  /**
   * Get suggested actions for common errors
   */
  getSuggestedActions(errorCode: string): string[] {
    const actions: Record<string, string[]> = {
      'permission-denied': [
        'Update Firebase Security Rules to allow read access',
        'Check if user authentication is required',
        'Verify project configuration'
      ],
      'unavailable': [
        'Check internet connection',
        'Try again in a few moments',
        'Verify Firebase service status'
      ],
      'not-found': [
        'Check if the collection/document exists',
        'Verify collection names and paths',
        'Ensure data has been properly created'
      ],
      'unauthenticated': [
        'Sign in with valid credentials',
        'Check authentication configuration',
        'Verify token validity'
      ]
    };

    return actions[errorCode] || ['Contact support if the problem persists'];
  }

  /**
   * Log detailed error information for debugging
   */
  private logErrorInfo(errorInfo: FirebaseErrorInfo): void {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      code: 'color: #ff8800; font-weight: bold;',
      message: 'color: #666666;',
      action: 'color: #0088ff; font-weight: bold;'
    };

    console.group('🔥 Firebase Error Handler');
    console.log('%cError Code:', styles.code, errorInfo.code);
    console.log('%cMessage:', styles.message, errorInfo.message);
    console.log('%cUser Message:', styles.message, errorInfo.userFriendlyMessage);
    console.log('%cShould Retry:', styles.message, errorInfo.shouldRetry);
    
    if (errorInfo.action) {
      console.log('%cSuggested Action:', styles.action, errorInfo.action);
    }

    const actions = this.getSuggestedActions(errorInfo.code);
    if (actions.length > 0) {
      console.log('%cAll Suggested Actions:', styles.action);
      actions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }
    
    console.groupEnd();
  }
}
