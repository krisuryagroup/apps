import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { UserApiService } from '@zitro/services';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly userApi = inject(UserApiService);

  readonly name = signal('');
  readonly nameError = signal('');
  readonly isLoading = signal(false);
  readonly statusMessage = signal('');
  readonly photoPreview = signal<string | null>(null);

  get isSubmitDisabled(): boolean {
    return !this.name().trim() || this.isLoading();
  }

  async ngOnInit(): Promise<void> {
    // Skip this page for returning users who already have a profile name
    try {
      const profile = await firstValueFrom(this.userApi.getProfile());
      if (profile?.name) {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    } catch {
      // 404 or network error = new user, show the form
    }
  }

  onNameInput(value: string): void {
    this.name.set(value);
    if (value.trim()) {
      this.nameError.set('');
    }
  }

  onNameBlur(): void {
    if (!this.name().trim()) {
      this.nameError.set('signup.nameRequired');
    }
  }

  onPhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async onSubmit(): Promise<void> {
    const trimmedName = this.name().trim();
    if (!trimmedName) {
      this.nameError.set('signup.nameRequired');
      return;
    }
    this.isLoading.set(true);
    this.statusMessage.set('');

    try {
      await firstValueFrom(this.userApi.updateProfile({ name: trimmedName }));
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch {
      this.statusMessage.set('errors.generic');
      this.isLoading.set(false);
    }
  }
}
