import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BusinessApiService, StaffDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-staff',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.staff' | i18n }}</h1>
      <button class="btn btn-primary" (click)="openAdd()">+ Add Staff</button>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          @for (s of staff(); track s.id) {
            <tr>
              <td>{{ s.name }}</td>
              <td>{{ s.phoneNumber }}</td>
              <td>{{ s.role }}</td>
              <td>{{ s.isActive ? '✓' : '✗' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="empty">No staff found.</td>
            </tr>
          }
        </tbody>
      </table>
    }
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">Add Staff</h2>
          <div class="form-row">
            <label for="staff-name" class="form-label">Name</label
            ><input id="staff-name" class="input" [(ngModel)]="f.name" />
            <label for="staff-phone" class="form-label">Phone</label
            ><input id="staff-phone" class="input" [(ngModel)]="f.phone" />
            <label for="staff-pass" class="form-label">Password</label
            ><input
              id="staff-pass"
              class="input"
              type="password"
              [(ngModel)]="f.password"
            />
            <label for="staff-role" class="form-label">Role</label>
            <select id="staff-role" class="select" [(ngModel)]="f.role">
              <option value="manager">manager</option>
              <option value="staff">staff</option>
            </select>
          </div>
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.name || !f.phone || saving()"
              (click)="save()"
            >
              {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
            </button>
            <button class="btn btn-outline" (click)="showForm.set(false)">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .table {
      width: 100%;
      border-collapse: collapse;
      th,
      td {
        padding: var(--zitro-spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--zitro-divider);
      }
      th {
        background: var(--zitro-surface-variant);
        font-size: var(--zitro-font-size-sm);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantStaffComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected staff = signal<StaffDto[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected f = { name: '', phone: '', password: '', role: 'staff' };
  ngOnInit() {
    const id = this.api.businessId()!;
    this.api.listStaff(id).subscribe({
      next: (s) => {
        this.staff.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected openAdd() {
    this.f = { name: '', phone: '', password: '', role: 'staff' };
    this.showForm.set(true);
  }
  protected save() {
    this.saving.set(true);
    const id = this.api.businessId()!;
    // Backend requires phoneNumber, not phone — and its response is { id } only
    // (same narrow-response shape as createCategory, commit df5edc4), so reload the
    // full list afterward instead of appending the partial object.
    const req = {
      name: this.f.name,
      phoneNumber: this.f.phone,
      password: this.f.password,
      role: this.f.role,
    };
    this.api.createStaff(id, req).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.api.listStaff(id).subscribe({ next: (s) => this.staff.set(s) });
      },
      error: () => this.saving.set(false),
    });
  }
}

// ── Remaining lean components ─────────────────────────────────────────────────

import {
  InventoryItemDto,
  InventoryAlertDto,
  RatingDto,
  PayoutDto,
  BusinessZoneDto,
} from '@zitro/services';

@Component({
  selector: 'app-restaurant-inventory',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.inventory' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <table class="table" data-testid="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Threshold</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (item of inventory(); track item.productId) {
            <tr>
              <td>{{ item.productName }}</td>
              <td
                [style.color]="
                  item.qtyAvailable <= item.lowStockThreshold
                    ? 'var(--zitro-error)'
                    : 'inherit'
                "
              >
                {{ item.qtyAvailable }}
              </td>
              <td>{{ item.lowStockThreshold }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline"
                  data-testid="inventory-adjust-btn"
                  (click)="openAdjust(item)"
                >
                  Adjust
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
    @if (alerts().length) {
      <div class="alerts-section" data-testid="inventory-alerts-list">
        <h3>Alerts</h3>
        @for (a of alerts(); track a.productId) {
          <div class="alert-row badge badge-pending">
            {{ a.productName }}: {{ a.alertType }}
          </div>
        }
      </div>
    }
    @if (adjustingItem()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            Adjust: {{ adjustingItem()!.productName }}
          </h2>
          <div class="form-row">
            <label for="adj-qty" class="form-label">Qty change</label
            ><input
              id="adj-qty"
              class="input"
              data-testid="inventory-adjust-qty-input"
              type="number"
              [(ngModel)]="adjQty"
            />
            <label for="adj-reason" class="form-label">Reason</label>
            <select
              id="adj-reason"
              class="select"
              data-testid="inventory-adjust-reason-select"
              [(ngModel)]="adjReason"
            >
              <option value="restock">restock</option>
              <option value="correction">correction</option>
              <option value="wastage">wastage</option>
            </select>
          </div>
          @if (adjustError()) {
            <p class="error-text">{{ adjustError() }}</p>
          }
          <div class="panel-actions">
            <button class="btn btn-primary" (click)="saveAdjust()">
              {{ 'common.save' | i18n }}
            </button>
            <button class="btn btn-outline" (click)="adjustingItem.set(null)">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .table {
      width: 100%;
      border-collapse: collapse;
      th,
      td {
        padding: var(--zitro-spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--zitro-divider);
      }
      th {
        background: var(--zitro-surface-variant);
        font-size: var(--zitro-font-size-sm);
      }
    }
    .alerts-section {
      margin-top: var(--zitro-spacing-xl);
    }
    .alert-row {
      display: inline-block;
      margin: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantInventoryComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected inventory = signal<InventoryItemDto[]>([]);
  protected alerts = signal<InventoryAlertDto[]>([]);
  protected loading = signal(true);
  protected adjustingItem = signal<InventoryItemDto | null>(null);
  protected adjQty = 0;
  protected adjReason = 'restock';
  protected adjustError = signal<string | null>(null);
  ngOnInit() {
    const id = this.api.businessId()!;
    this.loading.set(true);
    this.api.getInventory(id).subscribe({
      next: (i) => {
        this.inventory.set(i);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api
      .getInventoryAlerts(id)
      .subscribe({ next: (a) => this.alerts.set(a) });
  }
  protected openAdjust(i: InventoryItemDto) {
    this.adjustingItem.set(i);
    this.adjQty = 0;
    this.adjustError.set(null);
  }
  protected saveAdjust() {
    this.adjustError.set(null);
    const id = this.api.businessId()!;
    this.api
      .adjustInventory(id, {
        productId: this.adjustingItem()!.productId,
        quantity: this.adjQty,
        reason: this.adjReason,
      })
      .subscribe({
        next: () => {
          this.adjustingItem.set(null);
          this.ngOnInit();
        },
        error: (err) => {
          // Previously had no error callback at all — a rejected adjustment (e.g.
          // INSUFFICIENT_STOCK) failed completely silently, panel stayed open with no
          // feedback. Surface the backend's error code/message instead.
          this.adjustError.set(
            err?.error?.errorCode ??
              err?.error?.error ??
              'Could not save adjustment.',
          );
        },
      });
  }
}

@Component({
  selector: 'app-restaurant-ratings',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.ratings' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <div class="ratings-list" data-testid="rating-list">
        @for (r of ratings(); track r.id) {
          <div class="rating-card card">
            <div class="rating-header">
              <span class="stars">{{
                '★'.repeat(r.ratingValue) + '☆'.repeat(5 - r.ratingValue)
              }}</span>
            </div>
            @if (r.reviewText) {
              <p class="rating-comment">{{ r.reviewText }}</p>
            }
            @if (r.replyText) {
              <div class="rating-reply">📩 {{ r.replyText }}</div>
            } @else {
              <div class="reply-form">
                <input
                  class="input"
                  data-testid="rating-reply-input"
                  [(ngModel)]="replies[r.id]"
                  placeholder="Write a reply..."
                />
                <button
                  class="btn btn-sm btn-primary"
                  data-testid="rating-reply-submit-btn"
                  (click)="submitReply(r)"
                >
                  Reply
                </button>
              </div>
            }
          </div>
        } @empty {
          <p class="empty">No ratings yet.</p>
        }
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .empty {
      text-align: center;
      color: var(--zitro-on-surface-variant);
      padding: var(--zitro-spacing-xl);
    }
    .ratings-list {
      display: flex;
      flex-direction: column;
      gap: var(--zitro-spacing-md);
    }
    .rating-header {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-md);
      margin-bottom: var(--zitro-spacing-sm);
    }
    .stars {
      color: #f59e0b;
      letter-spacing: 2px;
    }
    .rating-type {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
    }
    .rating-comment {
      margin: 0 0 var(--zitro-spacing-sm);
      font-size: var(--zitro-font-size-sm);
    }
    .rating-reply {
      background: var(--zitro-surface-variant);
      padding: var(--zitro-spacing-sm);
      border-radius: var(--zitro-radius-md);
      font-size: var(--zitro-font-size-sm);
    }
    .reply-form {
      display: flex;
      gap: var(--zitro-spacing-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantRatingsComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected ratings = signal<RatingDto[]>([]);
  protected loading = signal(true);
  protected replies: Record<string, string> = {};
  ngOnInit() {
    const id = this.api.businessId()!;
    this.api.listRatings(id).subscribe({
      next: (r) => {
        this.ratings.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected submitReply(r: RatingDto) {
    const reply = this.replies[r.id];
    if (!reply) return;
    this.api.replyToRating(this.api.businessId()!, r.id, reply).subscribe({
      next: () => {
        this.ratings.update((rs) =>
          rs.map((x) => (x.id === r.id ? { ...x, replyText: reply } : x)),
        );
        delete this.replies[r.id];
      },
    });
  }
}

@Component({
  selector: 'app-restaurant-payouts',
  standalone: true,
  imports: [I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.payouts' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Gross</th>
            <th>Net</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          @for (p of payouts(); track p.id) {
            <tr>
              <td>{{ p.periodFrom }} – {{ p.periodTo }}</td>
              <td>₹{{ p.grossAmount }}</td>
              <td>₹{{ p.netAmount }}</td>
              <td>
                <span class="badge" [class]="'badge-' + p.status">{{
                  p.status
                }}</span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="empty">No payouts yet.</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .table {
      width: 100%;
      border-collapse: collapse;
      th,
      td {
        padding: var(--zitro-spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--zitro-divider);
      }
      th {
        background: var(--zitro-surface-variant);
        font-size: var(--zitro-font-size-sm);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantPayoutsComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected payouts = signal<PayoutDto[]>([]);
  protected loading = signal(true);
  ngOnInit() {
    const id = this.api.businessId()!;
    this.api.listPayouts(id).subscribe({
      next: (p) => {
        this.payouts.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

@Component({
  selector: 'app-restaurant-delivery-zones',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.deliveryZones' | i18n }}</h1>
      <button
        class="btn btn-primary"
        data-testid="zone-add-btn"
        (click)="openAdd()"
      >
        + Add Zone
      </button>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <div class="zone-list" data-testid="zone-list">
        @for (z of zones(); track z.id) {
          <div class="zone-card card">
            <div class="zone-header">
              <strong>{{ z.name }}</strong
              ><span
                class="badge"
                [class]="z.isActive ? 'badge-confirmed' : 'badge-cancelled'"
                >{{ z.isActive ? 'Active' : 'Inactive' }}</span
              >
            </div>
            <div>Base fee: ₹{{ z.baseFee }}</div>
            <button
              class="btn btn-sm btn-danger"
              data-testid="zone-delete-btn"
              (click)="deleteZone(z)"
            >
              {{ 'common.delete' | i18n }}
            </button>
          </div>
        }
      </div>
    }
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">Add Delivery Zone</h2>
          <div class="form-row">
            <label for="zone-name" class="form-label">Name</label
            ><input id="zone-name" class="input" [(ngModel)]="f.name" />
            <label for="zone-fee" class="form-label">Base fee (₹)</label
            ><input
              id="zone-fee"
              class="input"
              data-testid="zone-fee-base"
              type="number"
              [(ngModel)]="f.baseFee"
            />
          </div>
          @if (saveError()) {
            <p class="error-text">{{ saveError() }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="zone-save-btn"
              [disabled]="!f.name || saving()"
              (click)="save()"
            >
              {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
            </button>
            <button class="btn btn-outline" (click)="showForm.set(false)">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .zone-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--zitro-spacing-md);
    }
    .zone-card {
      display: flex;
      flex-direction: column;
      gap: var(--zitro-spacing-sm);
    }
    .zone-header {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantDeliveryZonesComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected zones = signal<BusinessZoneDto[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected f = { name: '', baseFee: 0, isActive: true };
  ngOnInit() {
    const id = this.api.businessId()!;
    this.api.listDeliveryZones(id).subscribe({
      next: (z) => {
        this.zones.set(z);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected openAdd() {
    this.f = { name: '', baseFee: 0, isActive: true };
    this.saveError.set(null);
    this.showForm.set(true);
  }
  protected save() {
    this.saving.set(true);
    this.saveError.set(null);
    this.api
      .createDeliveryZone(
        this.api.businessId()!,
        this.f as Record<string, unknown>,
      )
      .subscribe({
        next: (z) => {
          this.zones.update((zs) => [...zs, z]);
          this.saving.set(false);
          this.showForm.set(false);
        },
        error: () => {
          this.saving.set(false);
          // This form only collects name + base fee, but the backend also requires
          // PolygonCoords (a zone's geographic boundary) — there's no map or radius UI
          // anywhere in this app to define one (confirmed gap, RS-T-1305), so every save
          // 400s here today. Surfacing a real message instead of failing silently, per
          // RS-T-1903 — a genuine map/radius UI is a separate, larger follow-up.
          this.saveError.set(
            'Could not save zone: this form does not yet support defining a delivery area.',
          );
        },
      });
  }
  protected deleteZone(z: BusinessZoneDto) {
    if (!confirm(`Delete zone "${z.name}"?`)) return;
    this.api.deleteDeliveryZone(this.api.businessId()!, z.id).subscribe({
      next: () => this.zones.update((zs) => zs.filter((x) => x.id !== z.id)),
    });
  }
}

@Component({
  selector: 'app-restaurant-onboarding',
  standalone: true,
  imports: [I18nPipe, RouterLink],
  template: `<div class="page-header">
      <h1 class="page-title">{{ 'restaurant.onboarding' | i18n }}</h1>
    </div>
    <p>
      Complete your profile and KYC to get approved. Go to
      <a routerLink="/profile">Profile & Settings</a> to upload your FSSAI, GST,
      and PAN documents.
    </p>`,
  styles: `
    @use '../../_restaurant-shared' as *;
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantOnboardingComponent {}
