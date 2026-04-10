import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { UserManagementService } from '@zitro/services';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private userManagement: UserManagementService
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    console.log('🔐 AuthGuard: Checking authentication state...');
    const hasToken = !!localStorage.getItem('token');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    // Use userManagement.currentUserPhone$ for robust detection
    const currentUserPhone = await this.userManagement.getCurrentUserPhone();
    const isAuthenticated = hasToken && !isGuest && !!currentUserPhone;
    if (isAuthenticated) {
      console.log('✅ AuthGuard: User is authenticated, allowing access');
      return true;
    }
    // If not authenticated or partial/mismatched state, force sign out and cleanup
    try {
      // Clear all auth-related localStorage
      ['token', 'isGuest', 'guestId', 'currentUserPhone'].forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      console.log('🧹 AuthGuard: Cleared localStorage and sessionStorage');
    } catch (error) {
      console.error('❌ AuthGuard: Error during cleanup:', error);
    }
    // Always redirect to signin for any unauthenticated or partial state
    console.log('🚫 AuthGuard: Redirecting to /auth/signin');
    return this.router.createUrlTree(['/auth/signin']);
  }
  
  // ...existing code...
}

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  constructor(private router: Router, private userManagement: UserManagementService) {}

  async canActivate(): Promise<boolean | UrlTree> {
    console.log('🔐 LoginGuard: Checking if user can access auth pages...');
    const hasToken = !!localStorage.getItem('token');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const currentUserPhone = await this.userManagement.getCurrentUserPhone();
    console.log('🔐 LoginGuard: hasToken =', hasToken, '| isGuest =', isGuest, '| currentUserPhone =', !!currentUserPhone);
    // Only redirect to home if user is truly authenticated (not a guest)
    if (hasToken && !isGuest && !!currentUserPhone) {
      console.log('✅ LoginGuard: User is authenticated, redirecting to home');
      return this.router.createUrlTree(['/home']);
    }
    // Guest users or non-authenticated users can access auth pages
    console.log('✅ LoginGuard: Allowing access to auth pages');
    return true;
  }
}
