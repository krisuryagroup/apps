import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BusinessApiService, BusinessProfileDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-profile',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.profile' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (profile()) {
      @if (profile()!.onboardingStatus !== 'approved') {
        <div class="status-banner">
          Status: <strong>{{ profile()!.onboardingStatus }}</strong>
          @if (profile()!.onboardingRejectionReason) {
            — {{ profile()!.onboardingRejectionReason }}
          }
        </div>
      }
      <form class="profile-form" (ngSubmit)="save()">
        <div class="form-row">
          <label for="prof-name" class="form-label">{{
            'businesses.name' | i18n
          }}</label>
          <input
            id="prof-name"
            class="input"
            [(ngModel)]="f.name"
            name="name"
          />
          <label for="prof-desc" class="form-label">Description</label>
          <input
            id="prof-desc"
            class="input"
            [(ngModel)]="f.description"
            name="description"
          />
          <label for="prof-phone" class="form-label">{{
            'restaurant.login.phone' | i18n
          }}</label>
          <input
            id="prof-phone"
            class="input"
            [(ngModel)]="f.phone"
            name="phone"
          />
          <label for="prof-fssai" class="form-label">FSSAI</label>
          <input
            id="prof-fssai"
            class="input"
            [(ngModel)]="f.fssai"
            name="fssai"
          />
          <label for="prof-gst" class="form-label">GST</label>
          <input id="prof-gst" class="input" [(ngModel)]="f.gst" name="gst" />
        </div>
        @if (saveSuccess()) {
          <p class="success-text">{{ 'common.saved' | i18n }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="saving()">
          {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
        </button>
      </form>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .profile-form {
      max-width: 520px;
    }
    .status-banner {
      padding: var(--zitro-spacing-md);
      background: var(--zitro-surface-variant);
      border-radius: var(--zitro-radius-md);
      margin-bottom: var(--zitro-spacing-lg);
      font-size: var(--zitro-font-size-sm);
    }
    .success-text {
      color: var(--zitro-primary);
      font-size: var(--zitro-font-size-sm);
      margin-bottom: var(--zitro-spacing-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantProfileComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected profile = signal<BusinessProfileDto | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);
  protected saveSuccess = signal(false);
  protected f = { name: '', description: '', phone: '', fssai: '', gst: '' };

  ngOnInit(): void {
    const id = this.api.businessId()!;
    this.api.getProfile(id).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.f = {
          name: p.name,
          description: p.description ?? '',
          phone: p.phone ?? '',
          fssai: p.fssaiLicenseNumber ?? '',
          gst: p.gstNumber ?? '',
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected save(): void {
    this.saving.set(true);
    const id = this.api.businessId()!;
    this.api
      .updateProfile(id, {
        name: this.f.name,
        description: this.f.description,
        phone: this.f.phone,
        fssaiLicenseNumber: this.f.fssai,
        gstNumber: this.f.gst,
      })
      .subscribe({
        next: () => {
          // PUT returns 204 No Content by design (see BusinessPortalController.UpdateProfile)
          // — there's no response body to re-set profile() from, so merge the saved fields
          // into the existing signal instead. Setting profile() to the (undefined) response
          // body used to null it out entirely, collapsing the whole form after every save.
          this.profile.update((p) =>
            p
              ? {
                  ...p,
                  name: this.f.name,
                  description: this.f.description,
                  phone: this.f.phone,
                  fssaiLicenseNumber: this.f.fssai,
                  gstNumber: this.f.gst,
                }
              : p,
          );
          this.saving.set(false);
          this.saveSuccess.set(true);
        },
        error: () => this.saving.set(false),
      });
  }
}
