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
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { LoaderComponent, CachedImageDirective } from '@zitro/ui';
import { UserApiService, UserManagementService, AnalyticsService } from '@zitro/services';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [FormsModule, I18nPipe, LoaderComponent, CachedImageDirective],
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage implements OnInit {
  private readonly router = inject(Router);
  private readonly userApi = inject(UserApiService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly analytics = inject(AnalyticsService);

  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly profileImage = signal('');
  readonly isLoading = signal(false);
  readonly isImageLoading = signal(true);
  readonly saveError = signal('');

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
      } catch { /* ignore */ }
    }
  }

  onProfileImageClick(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.profileImage.set((e.target as FileReader).result as string);
    reader.readAsDataURL(file);
  }

  async onSave(): Promise<void> {
    this.isLoading.set(true);
    this.saveError.set('');
    try {
      const phoneNumber = await this.userMgmt.getCurrentUserPhone();
      if (!phoneNumber) {
        this.saveError.set('account.notAuthenticated');
        return;
      }

      if (this.selectedFile) {
        await this.userMgmt.updateProfileWithPhoto(
          phoneNumber,
          this.selectedFile,
          { name: this.name(), email: this.email() },
        );
        this.userApi.invalidateProfileCache();
      } else {
        await firstValueFrom(this.userApi.updateProfile({ name: this.name(), email: this.email() }));
      }

      this.analytics
        .logProfileUpdate(!!this.selectedFile, this.selectedFile ? ['name', 'email', 'photo'] : ['name', 'email'])
        .catch(() => {});
      this.selectedFile = null;
    } catch {
      this.saveError.set('account.saveFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  onImageLoad(): void {
    this.isImageLoading.set(false);
  }

  onImageError(): void {
    this.isImageLoading.set(false);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
