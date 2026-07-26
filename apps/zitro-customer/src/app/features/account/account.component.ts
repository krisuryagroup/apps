import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserManagementService } from '@zitro/services';
import { UserApiService } from '@zitro/services';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { AnalyticsService } from '@zitro/services';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, CommonModule, CachedImageDirective, LoaderComponent],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  private router = inject(Router);
  private userManagementService = inject(UserManagementService);
  private userApiService = inject(UserApiService);
  private analyticsService = inject(AnalyticsService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  name = '';
  email = '';
  phone = '';
  location = '';
  profileImage = '';

  isLoading = false;
  selectedFile: File | null = null;
  currentUserPhone: string | null = null;
  isImageLoading = true;

  ngOnInit() {
    // Track screen view
    this.analyticsService.logScreenView('Account', 'AccountComponent');

    this.loadUserProfile();
  }

  async loadUserProfile() {
    this.currentUserPhone =
      await this.userManagementService.getCurrentUserPhone();
    if (this.currentUserPhone) {
      try {
        const user = await firstValueFrom(this.userApiService.getProfile());
        this.name = user.name ?? '';
        this.email = user.email ?? '';
        this.phone = user.phone;
        this.profileImage = user.photoUrl ?? '';
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  onProfileImageClick() {
    // Trigger file input click
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      this.selectedFile = file;

      // Preview image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
      };
      reader.readAsDataURL(file);

      console.log('File selected:', file.name);
    }
  }

  async onSave() {
    if (!this.currentUserPhone) {
      alert('User not authenticated');
      return;
    }

    this.isLoading = true;

    try {
      // Determine what fields are being updated
      const fieldsUpdated: string[] = [];
      if (this.name) fieldsUpdated.push('name');
      if (this.email) fieldsUpdated.push('email');

      const hasPhotoUpdate = !!this.selectedFile;
      if (hasPhotoUpdate) fieldsUpdated.push('photo');

      if (this.selectedFile) {
        // Upload photo via Firebase Storage then persist URL via REST API
        const photoUrl = await this.userManagementService.uploadProfilePhoto(
          this.selectedFile,
          this.currentUserPhone,
        );
        await firstValueFrom(
          this.userApiService.updateProfile({
            name: this.name,
            email: this.email,
            photoUrl,
          }),
        );
        this.analyticsService
          .logProfileUpdate(true, fieldsUpdated)
          .catch((err) => console.warn('Failed to log profile update:', err));
        alert('Profile updated successfully with new photo!');
        this.selectedFile = null;
      } else {
        // Update profile text fields via REST API
        await firstValueFrom(
          this.userApiService.updateProfile({
            name: this.name,
            email: this.email,
          }),
        );
        this.analyticsService
          .logProfileUpdate(false, fieldsUpdated)
          .catch((err) => console.warn('Failed to log profile update:', err));
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  onImageLoad(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, 300);
  }

  onImageError(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, 300);
  }
}
