import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BusinessApiService,
  BusinessDocumentType,
  BusinessProfileDto,
  VerificationDocDto,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

interface DocumentSlot {
  type: BusinessDocumentType;
  label: string;
}

const DOCUMENT_SLOTS: DocumentSlot[] = [
  { type: 'pan', label: 'PAN card' },
  { type: 'fssai', label: 'FSSAI license' },
  { type: 'gst', label: 'GST certificate' },
  { type: 'bank-proof', label: 'Bank proof (cancelled cheque / passbook)' },
];

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
      @if (!profile()!.isActive) {
        <div class="status-banner inactive-banner">
          This business is <strong>deactivated</strong> — it's hidden from
          customers and the portal is locked to profile/reactivation only.
          @if (isOwner()) {
            <button
              class="btn btn-primary btn-sm"
              type="button"
              [disabled]="togglingActive()"
              (click)="reactivate()"
            >
              {{ togglingActive() ? 'Reactivating…' : 'Reactivate business' }}
            </button>
          }
        </div>
      } @else if (isOwner()) {
        <div class="deactivate-row">
          <button
            class="btn btn-sm btn-outline"
            type="button"
            [disabled]="togglingActive()"
            (click)="deactivate()"
          >
            {{ togglingActive() ? 'Deactivating…' : 'Deactivate business' }}
          </button>
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
          <label for="prof-pan" class="form-label">PAN</label>
          <input id="prof-pan" class="input" [(ngModel)]="f.pan" name="pan" />
        </div>
        @if (saveSuccess()) {
          <p class="success-text">{{ 'common.saved' | i18n }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="saving()">
          {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
        </button>
      </form>

      <div class="kyc-section">
        <h2 class="kyc-title">Verification documents</h2>
        <p class="kyc-hint">
          Upload each document once — re-uploading replaces the previous file
          and resets its review status to pending.
        </p>
        @for (slot of documentSlots; track slot.type) {
          <div class="kyc-row">
            <div class="kyc-info">
              <span class="kyc-label">{{ slot.label }}</span>
              @if (docFor(slot.type); as doc) {
                <span class="kyc-badge" [class]="'kyc-badge--' + doc.status">
                  {{ doc.status }}
                </span>
                @if (doc.status === 'rejected' && doc.rejectionReason) {
                  <span class="kyc-reason">{{ doc.rejectionReason }}</span>
                }
                <a
                  [href]="doc.url"
                  target="_blank"
                  rel="noopener"
                  class="kyc-view-link"
                  >View current file</a
                >
              } @else {
                <span class="kyc-badge kyc-badge--missing">not uploaded</span>
              }
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              [disabled]="uploadingDoc()[slot.type]"
              (change)="onDocumentFileSelected($event, slot.type)"
            />
          </div>
        }
      </div>
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
    .inactive-banner {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-md);
      flex-wrap: wrap;
    }
    .deactivate-row {
      margin-bottom: var(--zitro-spacing-lg);
    }
    .success-text {
      color: var(--zitro-primary);
      font-size: var(--zitro-font-size-sm);
      margin-bottom: var(--zitro-spacing-md);
    }
    .kyc-section {
      max-width: 640px;
      margin-top: var(--zitro-spacing-xl);
      padding-top: var(--zitro-spacing-lg);
      border-top: 1px solid var(--zitro-divider);
    }
    .kyc-title {
      font-size: var(--zitro-font-size-lg);
      margin: 0 0 var(--zitro-spacing-xs);
    }
    .kyc-hint {
      color: var(--zitro-on-surface-variant);
      font-size: var(--zitro-font-size-sm);
      margin: 0 0 var(--zitro-spacing-lg);
    }
    .kyc-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--zitro-spacing-md);
      padding: var(--zitro-spacing-md) 0;
      border-bottom: 1px solid var(--zitro-divider);
      flex-wrap: wrap;
    }
    .kyc-info {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-sm);
      flex-wrap: wrap;
    }
    .kyc-label {
      font-weight: 500;
    }
    .kyc-badge {
      font-size: var(--zitro-font-size-sm);
      padding: 2px 8px;
      border-radius: var(--zitro-radius-sm);
      text-transform: capitalize;
    }
    .kyc-badge--pending {
      background: #fff3cd;
      color: #856404;
    }
    .kyc-badge--verified {
      background: #d4edda;
      color: #155724;
    }
    .kyc-badge--rejected {
      background: #f8d7da;
      color: #721c24;
    }
    .kyc-badge--missing {
      background: var(--zitro-surface-variant);
      color: var(--zitro-on-surface-variant);
    }
    .kyc-reason {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-error);
    }
    .kyc-view-link {
      font-size: var(--zitro-font-size-sm);
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
  protected togglingActive = signal(false);
  protected f = {
    name: '',
    description: '',
    phone: '',
    fssai: '',
    gst: '',
    pan: '',
  };
  protected documentSlots = DOCUMENT_SLOTS;
  protected uploadingDoc = signal<
    Partial<Record<BusinessDocumentType, boolean>>
  >({});

  protected isOwner(): boolean {
    return this.api.currentUser()?.role === 'owner';
  }

  protected docFor(type: BusinessDocumentType): VerificationDocDto | undefined {
    return this.profile()?.verificationDocs?.find((d) => d.type === type);
  }

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
          pan: p.panNumber ?? '',
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
        panNumber: this.f.pan,
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
                  panNumber: this.f.pan,
                }
              : p,
          );
          this.saving.set(false);
          this.saveSuccess.set(true);
        },
        error: () => this.saving.set(false),
      });
  }

  protected deactivate(): void {
    if (
      !confirm(
        'Deactivate this business? It will be hidden from customers immediately and the portal will be locked to profile/reactivation only until you turn it back on.',
      )
    )
      return;

    this.togglingActive.set(true);
    const id = this.api.businessId()!;
    this.api.deactivateBusiness(id).subscribe({
      next: () => {
        this.profile.update((p) => (p ? { ...p, isActive: false } : p));
        this.togglingActive.set(false);
      },
      error: () => this.togglingActive.set(false),
    });
  }

  protected reactivate(): void {
    this.togglingActive.set(true);
    const id = this.api.businessId()!;
    this.api.reactivateBusiness(id).subscribe({
      next: () => {
        this.profile.update((p) => (p ? { ...p, isActive: true } : p));
        this.togglingActive.set(false);
      },
      error: () => this.togglingActive.set(false),
    });
  }

  protected onDocumentFileSelected(
    event: Event,
    type: BusinessDocumentType,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingDoc.update((m) => ({ ...m, [type]: true }));
    const id = this.api.businessId()!;
    this.api.uploadDocument(id, type, file).subscribe({
      next: (doc) => {
        this.profile.update((p) => {
          if (!p) return p;
          const rest = (p.verificationDocs ?? []).filter(
            (d) => d.type !== type,
          );
          return { ...p, verificationDocs: [...rest, doc] };
        });
        this.uploadingDoc.update((m) => ({ ...m, [type]: false }));
        input.value = '';
      },
      error: () => {
        this.uploadingDoc.update((m) => ({ ...m, [type]: false }));
        input.value = '';
      },
    });
  }
}
