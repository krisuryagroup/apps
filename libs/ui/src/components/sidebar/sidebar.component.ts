import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FirebaseAuthService } from '@zitro/services';
import { UserManagementService } from '@zitro/services';
import { UI_TEXT, FALLBACK_VALUES } from '@zitro/utils';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(FirebaseAuthService);
  private userManagementService = inject(UserManagementService);

  @Input() open = false;
  @Output() closeSidebar = new EventEmitter<void>();

  sidebarItems: Array<{
    text: string;
    route: string;
    isDisabled: boolean;
    requiresAuth: boolean;
    isSignout?: boolean;
    icon?: string;
  }> = [
    {
      text: 'Profile',
      route: '/account',
      isDisabled: false,
      requiresAuth: true,
    },
    {
      text: UI_TEXT.MANAGE_ADDRESSES,
      route: '/addresses',
      isDisabled: false,
      requiresAuth: true,
    },
    {
      text: UI_TEXT.ORDERS,
      route: '/orders',
      isDisabled: false,
      requiresAuth: true,
    },
    {
      text: UI_TEXT.CONTACT_US,
      route: '/contact',
      isDisabled: false,
      requiresAuth: false,
    },
    {
      text: '🎮 Play 2048 Game',
      route: '/game-2048',
      isDisabled: false,
      requiresAuth: true,
      icon: 'videogame_asset',
    },
    {
      text: UI_TEXT.SIGN_OUT,
      route: '/auth/signout',
      isDisabled: false,
      isSignout: true,
      requiresAuth: false,
    },
  ];

  userName = '';
  userEmail = '';
  userPhone = '';
  userPhotoURL = '';
  isGuest = false;
  isTestUser = false;

  async ngOnInit() {
    // Treat as guest if not logged in and not guest
    this.isGuest = !(await this.userManagementService.isLoggedIn());
    // Check if user is a test user
    await this.checkTestUser();

    if (!this.isTestUser) {
      // Filter sidebar items based on test user status
      this.sidebarItems = this.sidebarItems.filter((item) => {
        // Show game menu only for test users
        if (item.route === '/game-2048') {
          return this.isTestUser;
        }
        return true;
      });
    }

    if (this.isGuest) {
      this.userName = 'Guest User';
      this.userEmail = UI_TEXT.CONTINUE_AS_GUEST;
      this.sidebarItems = this.sidebarItems.map((item) => {
        if (item.isSignout) {
          return {
            text: UI_TEXT.LOG_IN,
            route: '/auth/signin',
            isDisabled: false,
            isSignout: false,
            requiresAuth: false,
          };
        } else if (item.requiresAuth) {
          return {
            ...item,
            isDisabled: true,
          };
        }
        return item;
      });
    } else {
      // Load user profile from UserManagementService
      await this.loadUserProfile();
      // Also subscribe to profile changes
      this.userManagementService.userProfile$.subscribe((profile) => {
        if (profile) {
          this.userName = profile.name || FALLBACK_VALUES.USER_PREFIX;
          this.userEmail = profile.email || '';
          this.userPhone = profile.phoneNumber || '';
          this.userPhotoURL = profile.photoURL || '';
        }
      });
    }
  }

  async loadUserProfile() {
    try {
      const currentUserPhone = localStorage.getItem('currentUserPhone');
      if (currentUserPhone) {
        const profile =
          await this.userManagementService.getUserData(currentUserPhone);
        if (profile) {
          this.userName = profile.name || FALLBACK_VALUES.USER_PREFIX;
          this.userEmail = profile.email || '';
          this.userPhone = profile.phoneNumber || '';
          this.userPhotoURL = profile.photoURL || '';
        }
      }
    } catch (error) {
      console.error('Error loading user profile in sidebar:', error);
      // Fallback to phone number if name not available
      this.userName =
        localStorage.getItem('currentUserPhone') || FALLBACK_VALUES.USER_PREFIX;
    }
  }

  async checkTestUser() {
    try {
      const currentUserPhone =
        await this.userManagementService.getCurrentUserPhone();
      if (currentUserPhone) {
        const testPhoneNumbers = await this.authService.getTestPhoneNumbers();
        const phoneWithoutPrefix = currentUserPhone.replace('+91', '');
        this.isTestUser = testPhoneNumbers.includes(phoneWithoutPrefix);
        console.log('🎮 Sidebar Test User Check:', {
          phone: phoneWithoutPrefix,
          isTestUser: this.isTestUser,
        });
      }
    } catch (error) {
      console.error('Error checking test user status:', error);
      this.isTestUser = false;
    }
  }

  navigate(item: any) {
    if (item.isDisabled) {
      // For disabled items (guest trying to access auth-required features), redirect to signin
      this.closeSidebar.emit();
      this.router.navigate(['/auth/signin']);
      return;
    }

    this.closeSidebar.emit();
    setTimeout(() => {
      if (item.isSignout) {
        this.authService.signOut();
        this.router.navigate(['/auth/signin']);
      } else {
        this.router.navigate([item.route]);
      }
    }, 200);
  }

  navigateToAccount() {
    // Only allow navigation for logged-in users
    if (!this.isGuest) {
      this.closeSidebar.emit();
      setTimeout(() => {
        this.router.navigate(['/account']);
      }, 200);
    }
  }
}
