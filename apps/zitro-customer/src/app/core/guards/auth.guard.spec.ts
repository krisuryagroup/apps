import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthGuard, LoginGuard } from './auth.guard';
import * as firebaseAuth from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    signOut: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockRouter: any;
  let mockAuthService: any;
  let mockAuth: any;

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((path) => ({ path }))
    };
    
    mockAuthService = {
      continueAsGuest: vi.fn()
    };
    
    mockAuth = {
      currentUser: null,
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as any);
    
    guard = new AuthGuard(mockRouter, mockAuthService);
    
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Authenticated User Access', () => {
    it('should allow access for authenticated non-guest user with Firebase user', async () => {
      localStorage.setItem('token', 'user-token-123');
      mockAuth.currentUser = { uid: 'user-123', phoneNumber: '+911234567890' };

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });

    it('should allow access with explicit false guest flag', async () => {
      localStorage.setItem('token', 'abc123');
      localStorage.setItem('isGuest', 'false');
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });
    
    it('should validate all three conditions for authentication', async () => {
      localStorage.setItem('token', 'token123');
      localStorage.setItem('isGuest', 'false');
      mockAuth.currentUser = { uid: 'user-456' };

      const result = await guard.canActivate();

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });

  describe('Guest User Access', () => {
    it('should logout guest user and redirect to home', async () => {
      localStorage.setItem('token', 'guest-token');
      localStorage.setItem('isGuest', 'true');
      mockAuth.currentUser = null;

      const result = await guard.canActivate();

      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
      expect(result).toEqual({ path: ['/home'] });
    });

    it('should enable guest mode and redirect to home when guest tries protected route', async () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('isGuest', 'true');

      const result = await guard.canActivate();

      expect(result).not.toBe(true);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should enable guest mode and redirect to home when no token', async () => {
      const result = await guard.canActivate();

      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
      expect(result).toEqual({ path: ['/home'] });
    });

    it('should clear localStorage and enable guest mode', async () => {
      await guard.canActivate();

      expect(localStorage.getItem('token')).toBeNull();
      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
    });

    it('should redirect to home when token is empty string', async () => {
      localStorage.setItem('token', '');

      const result = await guard.canActivate();

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('Auth State Mismatch Detection', () => {
    it('should detect mismatch when has token but no Firebase user (not guest)', async () => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('isGuest', 'false');
      mockAuth.currentUser = null; // Mismatch!

      const result = await guard.canActivate();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Auth State Mismatch'),
        expect.anything()
      );
      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(result).toEqual({ path: ['/home'] });
    });

    it('should detect mismatch when has Firebase user but no token', async () => {
      mockAuth.currentUser = { uid: 'user-123' };
      // No token in localStorage - mismatch!

      const result = await guard.canActivate();

      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(mockAuthService.continueAsGuest).toHaveBeenCalled();
      expect(result).toEqual({ path: ['/home'] });
    });
    
    it('should clear localStorage on mismatch', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('currentUserPhone', '+911234567890');
      mockAuth.currentUser = null;

      await guard.canActivate();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('currentUserPhone')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with guest flag explicitly false and Firebase user', async () => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('isGuest', 'false');
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });

    it('should only accept exact "true" string for guest mode', async () => {
      localStorage.setItem('token', 'token');
      localStorage.setItem('isGuest', 'TRUE');
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });
    
    it('should handle Firebase Auth signOut errors gracefully', async () => {
      mockAuth.signOut.mockRejectedValue(new Error('SignOut failed'));
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during cleanup'),
        expect.any(Error)
      );
      expect(result).toEqual({ path: ['/home'] });
    });
  });
});

describe('LoginGuard', () => {
  let guard: LoginGuard;
  let mockRouter: any;
  let mockAuth: any;

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((path) => ({ path }))
    };
    
    mockAuth = {
      currentUser: null
    };
    
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as any);
    
    guard = new LoginGuard(mockRouter);
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Authenticated User Navigation', () => {
    it('should redirect authenticated user to home', async () => {
      localStorage.setItem('token', 'user-token-123');
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
      expect(result).toEqual({ path: ['/home'] });
    });

    it.each([
      { token: 'token1', description: 'standard token' },
      { token: 'abc-xyz-123', description: 'hyphenated token' },
      { token: '12345', description: 'numeric token' }
    ])('should redirect to home with $description', async ({ token }) => {
      localStorage.setItem('token', token);
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(result).toEqual({ path: ['/home'] });
    });
  });

  describe('Guest User Access', () => {
    it('should allow guest user to access login page', async () => {
      localStorage.setItem('token', 'guest-token');
      localStorage.setItem('isGuest', 'true');

      const result = await guard.canActivate();

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should not redirect guest users', async () => {
      localStorage.setItem('isGuest', 'true');

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should allow access to login page when not authenticated', async () => {
      const result = await guard.canActivate();

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should allow access with empty token', async () => {
      localStorage.setItem('token', '');

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });
  });

  describe('Authentication State Logic', () => {
    it.each([
      { token: null, isGuest: null, hasFirebaseUser: false, expected: true, description: 'no auth' },
      { token: 'token', isGuest: null, hasFirebaseUser: true, expected: false, description: 'authenticated' },
      { token: 'token', isGuest: 'false', hasFirebaseUser: true, expected: false, description: 'auth non-guest' },
      { token: 'token', isGuest: 'true', hasFirebaseUser: false, expected: true, description: 'guest user' },
      { token: null, isGuest: 'true', hasFirebaseUser: false, expected: true, description: 'guest no token' }
    ])('should return $expected for $description', async ({ token, isGuest, hasFirebaseUser, expected }) => {
      if (token) localStorage.setItem('token', token);
      if (isGuest) localStorage.setItem('isGuest', isGuest);
      mockAuth.currentUser = hasFirebaseUser ? { uid: 'user-123' } : null;

      const result = await guard.canActivate();

      if (expected) {
        expect(result).toBe(true);
      } else {
        expect(result).not.toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should redirect when token exists and isGuest is explicitly false with Firebase user', async () => {
      localStorage.setItem('token', 'token');
      localStorage.setItem('isGuest', 'false');
      mockAuth.currentUser = { uid: 'user-123' };

      const result = await guard.canActivate();

      expect(result).toEqual({ path: ['/home'] });
    });

    it('should allow access when only isGuest is set without token', async () => {
      localStorage.setItem('isGuest', 'true');

      const result = await guard.canActivate();

      expect(result).toBe(true);
    });
  });
});
