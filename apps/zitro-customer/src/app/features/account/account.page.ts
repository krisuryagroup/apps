import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { LoaderComponent } from '@zitro/ui';
import {
  UserApiService,
  UserManagementService,
  AnalyticsService,
  FirebaseAuthService,
} from '@zitro/services';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [FormsModule, RouterLink, I18nPipe, LoaderComponent],
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage implements OnInit {
  private readonly router = inject(Router);
  private readonly userApi = inject(UserApiService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly analytics = inject(AnalyticsService);
  private readonly authService = inject(FirebaseAuthService);

  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly name = signal('');
  readonly editedName = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly profileImage = signal('');
  readonly isLoading = signal(false);
  readonly isImageLoading = signal(true);
  readonly isAvatarUploading = signal(false);
  readonly isEditingName = signal(false);
  readonly saveError = signal('');
  readonly avatarStatusMessage = signal('');
  readonly avatarStatusType = signal<'success' | 'error' | 'info' | ''>('');

  private selectedFile: File | null = null;

  async ngOnInit(): Promise<void> {
    this.analytics.logScreenView('Account', 'AccountPage');
    await this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const user = await firstValueFrom(this.userApi.getProfile());
      this.name.set(user.name ?? '');
      this.email.set(user.email ?? '');
      this.phone.set(user.phone);
      this.profileImage.set(user.photoUrl ?? '');
    } catch {
      // Fallback to Firebase UserManagementService
      try {
        const phoneNumber = await this.userMgmt.getCurrentUserPhone();
        if (phoneNumber) {
          const userData = await this.userMgmt.getUserData(phoneNumber);
          if (userData) {
            this.name.set(userData.name ?? '');
            this.email.set(userData.email ?? '');
            this.phone.set(userData.phoneNumber ?? phoneNumber);
            this.profileImage.set(userData.photoURL ?? '');
          }
        }
      } catch {
        // Profile load failed — user can still navigate
      }
    }
  }

  onProfileImageClick(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.avatarStatusType.set('error');
      this.avatarStatusMessage.set('account.invalidImageFile');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.avatarStatusType.set('error');
      this.avatarStatusMessage.set('account.imageTooLarge');
      return;
    }

    this.selectedFile = file;
    this.avatarStatusType.set('info');
    this.avatarStatusMessage.set('account.photoUploading');
    const reader = new FileReader();
    reader.onload = (e) =>
      this.profileImage.set((e.target as FileReader).result as string);
    reader.readAsDataURL(file);
    this.saveAvatar();
  }

  startEditName(): void {
    this.editedName.set(this.name());
    this.isEditingName.set(true);
    this.saveError.set('');
  }

  cancelEditName(): void {
    this.isEditingName.set(false);
    this.saveError.set('');
  }

  async saveName(): Promise<void> {
    const trimmed = this.editedName().trim();
    if (!trimmed) return;
    this.isLoading.set(true);
    this.saveError.set('');
    try {
      await firstValueFrom(
        this.userApi.updateProfile({ name: trimmed, email: this.email() }),
      );
      this.name.set(trimmed);
      this.isEditingName.set(false);
      this.analytics.logProfileUpdate(false, ['name']).catch(() => {
        /* no-op */
      });
    } catch {
      this.saveError.set('account.saveFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async saveAvatar(): Promise<void> {
    if (!this.selectedFile) return;
    this.isLoading.set(true);
    this.isAvatarUploading.set(true);
    this.isImageLoading.set(true);
    this.saveError.set('');
    try {
      const phoneNumber = await this.userMgmt.getCurrentUserPhone();
      if (!phoneNumber) {
        this.saveError.set('account.notAuthenticated');
        this.avatarStatusType.set('error');
        this.avatarStatusMessage.set('account.notAuthenticated');
        return;
      }

      // 1. Upload to Firebase Storage → get public URL
      const photoUrl = await this.userMgmt.uploadProfilePhoto(
        this.selectedFile,
        phoneNumber,
      );

      // 2. Persist URL in the REST API (PostgreSQL)
      await firstValueFrom(
        this.userApi.updateProfile({ name: this.name(), photoUrl }),
      );

      // 3. Also sync to Firestore for legacy compatibility
      await this.userMgmt.updateUserProfile(phoneNumber, {
        photoURL: photoUrl,
        name: this.name(),
        email: this.email(),
      });

      this.profileImage.set(photoUrl);
      this.selectedFile = null;
      this.avatarStatusType.set('success');
      this.avatarStatusMessage.set('account.photoSaved');
      this.analytics.logProfileUpdate(true, ['photo']).catch(() => {
        /* no-op */
      });
    } catch {
      this.saveError.set('account.saveFailed');
      this.avatarStatusType.set('error');
      this.avatarStatusMessage.set('account.photoSaveFailed');
    } finally {
      this.isLoading.set(false);
      this.isAvatarUploading.set(false);
    }
  }

  onImageLoad(): void {
    this.isImageLoading.set(false);
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (
      image &&
      image.src &&
      !image.src.includes('assets/icons/default-avatar.png')
    ) {
      image.src = 'assets/icons/default-avatar.png';
    }
    this.isImageLoading.set(false);
  }

  signOut(): void {
    this.authService.signOut();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
