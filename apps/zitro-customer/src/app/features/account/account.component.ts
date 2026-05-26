import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserManagementService } from '@zitro/services';
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
        // Load user data from Firestore only
        const userData = await this.userManagementService.getUserData(
          this.currentUserPhone,
        );
        if (userData) {
          this.name = userData.name || '';
          this.email = userData.email || '';
          this.phone = userData.phoneNumber;
          this.profileImage = userData.photoURL || '';
        }
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
        // Update profile with new photo
        const success = await this.userManagementService.updateProfileWithPhoto(
          this.currentUserPhone,
          this.selectedFile,
          { name: this.name, email: this.email },
        );

        if (success) {
          // Track successful profile update with photo
          this.analyticsService
            .logProfileUpdate(true, fieldsUpdated)
            .catch((err) => console.warn('Failed to log profile update:', err));

          alert('Profile updated successfully with new photo!');
          this.selectedFile = null;
        } else {
          throw new Error('Failed to update profile with photo');
        }
      } else {
        // Update profile without photo
        const success = await this.userManagementService.updateUserProfile(
          this.currentUserPhone,
          { name: this.name, email: this.email },
        );

        if (success) {
          // Track successful profile update without photo
          this.analyticsService
            .logProfileUpdate(false, fieldsUpdated)
            .catch((err) => console.warn('Failed to log profile update:', err));

          alert('Profile updated successfully!');
        } else {
          throw new Error('Failed to update profile');
        }
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
