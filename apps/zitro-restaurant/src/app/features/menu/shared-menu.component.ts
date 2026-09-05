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
  BrandMasterProductDto,
  hasRole,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';

/**
 * Menu screen for a branch on menu_mode = 'shared'. It doesn't own products directly
 * (see RestaurantMenuComponent, which handles the 'independent' case) — it reads the
 * brand's master catalog and can only layer branch-level exceptions on top: a
 * different price here, hide an item here, or mark it temporarily unavailable here.
 * Editing the master item itself happens at the brand level (admin), not here.
 */
@Component({
  selector: 'app-restaurant-shared-menu',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.menu' | i18n }}</h1>
      @if (canManage()) {
        <button
          class="btn btn-outline"
          type="button"
          data-testid="shared-menu-bulk-adjust-btn"
          (click)="showBulkAdjust.set(true)"
        >
          {{ 'products.bulkPriceAdjust' | i18n }}
        </button>
      }
    </div>
    <p class="shared-menu-hint">{{ 'restaurant.sharedMenuHint' | i18n }}</p>

    @if (showBulkAdjust()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'products.bulkPriceAdjust' | i18n }}</h2>
          <p class="shared-menu-hint">
            {{ 'restaurant.bulkOverrideHint' | i18n }}
          </p>
          <div class="form-row">
            <label for="bulk-direction" class="form-label">{{
              'products.bulkDirection' | i18n
            }}</label>
            <select
              id="bulk-direction"
              class="select"
              data-testid="bulk-adjust-direction"
              [(ngModel)]="bulkIsIncrease"
            >
              <option [ngValue]="true">
                {{ 'products.bulkIncrease' | i18n }}
              </option>
              <option [ngValue]="false">
                {{ 'products.bulkDecrease' | i18n }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label for="bulk-type" class="form-label">{{
              'products.bulkType' | i18n
            }}</label>
            <select
              id="bulk-type"
              class="select"
              data-testid="bulk-adjust-type"
              [(ngModel)]="bulkIsPercentage"
            >
              <option [ngValue]="true">
                {{ 'products.bulkPercentage' | i18n }}
              </option>
              <option [ngValue]="false">
                {{ 'products.bulkFlatAmount' | i18n }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label for="bulk-value" class="form-label">{{
              'products.bulkValue' | i18n
            }}</label>
            <input
              id="bulk-value"
              class="input"
              type="number"
              min="0"
              step="0.01"
              data-testid="bulk-adjust-value"
              [(ngModel)]="bulkValue"
              placeholder="{{
                bulkIsPercentage
                  ? ('products.bulkValuePercentPlaceholder' | i18n)
                  : ('products.bulkValueFlatPlaceholder' | i18n)
              }}"
            />
          </div>

          @if (bulkResultMessage()) {
            <p class="shared-menu-hint" data-testid="bulk-adjust-result">
              {{ bulkResultMessage() }}
            </p>
          }
          @if (bulkError()) {
            <p class="error-text" data-testid="bulk-adjust-error">
              {{ bulkError() }}
            </p>
          }

          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="bulk-adjust-apply-btn"
              [disabled]="bulkApplying() || !bulkValue || bulkValue <= 0"
              (click)="applyBulkAdjust()"
            >
              {{
                bulkApplying()
                  ? ('common.saving' | i18n)
                  : ('products.bulkApply' | i18n)
              }}
            </button>
            <button class="btn btn-outline" (click)="closeBulkAdjust()">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <table class="item-table" data-testid="shared-menu-table">
        <thead>
          <tr>
            <th>{{ 'products.name' | i18n }}</th>
            <th>{{ 'restaurant.masterPrice' | i18n }}</th>
            <th>{{ 'restaurant.yourPrice' | i18n }}</th>
            <th>{{ 'restaurant.hidden' | i18n }}</th>
            <th>{{ 'products.available' | i18n }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.productId) {
            <tr [class.row-hidden]="row.isHidden">
              <td>{{ row.name }}</td>
              <td>₹{{ row.price }}</td>
              @if (canManage()) {
                <td>
                  <input
                    class="input input-sm"
                    type="number"
                    [placeholder]="'₹' + row.price"
                    [(ngModel)]="row.draftPriceOverride"
                    [attr.data-testid]="'shared-menu-price-' + row.productId"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    [(ngModel)]="row.draftIsHidden"
                    [attr.data-testid]="'shared-menu-hidden-' + row.productId"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    [(ngModel)]="row.draftIsAvailable"
                    [attr.data-testid]="
                      'shared-menu-available-' + row.productId
                    "
                  />
                </td>
                <td>
                  <button
                    class="btn btn-sm btn-outline"
                    [disabled]="saving()[row.productId]"
                    [attr.data-testid]="'shared-menu-save-' + row.productId"
                    (click)="saveRow(row)"
                  >
                    {{
                      saving()[row.productId]
                        ? ('common.saving' | i18n)
                        : ('common.save' | i18n)
                    }}
                  </button>
                </td>
              } @else {
                <td>{{ row.priceOverride ? '₹' + row.priceOverride : '—' }}</td>
                <td>{{ row.isHidden ? '✓' : '—' }}</td>
                <td>{{ row.isAvailable ? '✓' : '—' }}</td>
                <td></td>
              }
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="empty">
                {{ 'restaurant.noMasterMenu' | i18n }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .shared-menu-hint {
      color: var(--zitro-on-surface-variant);
      font-size: var(--zitro-font-size-sm);
      margin: 0 0 var(--zitro-spacing-md);
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      th,
      td {
        padding: var(--zitro-spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--zitro-divider);
      }
      th {
        font-size: var(--zitro-font-size-sm);
        color: var(--zitro-on-surface-variant);
        background: var(--zitro-surface-variant);
      }
    }
    .row-hidden {
      opacity: 0.5;
    }
    .input-sm {
      width: 96px;
    }
    .empty {
      text-align: center;
      color: var(--zitro-on-surface-variant);
      padding: var(--zitro-spacing-xl);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedMenuComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  private readonly i18n = inject(I18nService);

  /** Manager+ only — see RESTAURANT-RBAC-PLAN.md. Unlike the independent-menu screen,
   * this screen has no separate availability-only toggle (price/hidden/available are
   * one combined save), so staff gets a read-only table rather than a partial control. */
  protected canManage(): boolean {
    return hasRole(this.api.currentUser()?.role, 'manager');
  }

  protected loading = signal(true);
  protected saving = signal<Record<string, boolean>>({});
  protected rows = signal<
    (BrandMasterProductDto & {
      draftPriceOverride: number | null;
      draftIsHidden: boolean;
      draftIsAvailable: boolean;
    })[]
  >([]);

  // ── Bulk price adjust ────────────────────────────────────────────────────
  protected showBulkAdjust = signal(false);
  protected bulkIsIncrease = true;
  protected bulkIsPercentage = true;
  protected bulkValue: number | null = null;
  protected bulkApplying = signal(false);
  protected bulkResultMessage = signal('');
  protected bulkError = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.api.businessId()!;
    this.loading.set(true);
    this.api.getBrandMasterProducts(id).subscribe({
      next: (products) => {
        this.rows.set(
          products.map((p) => ({
            ...p,
            draftPriceOverride: p.priceOverride ?? null,
            draftIsHidden: p.isHidden,
            draftIsAvailable: p.isAvailable,
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected saveRow(
    row: BrandMasterProductDto & {
      draftPriceOverride: number | null;
      draftIsHidden: boolean;
      draftIsAvailable: boolean;
    },
  ): void {
    const id = this.api.businessId()!;
    this.saving.update((m) => ({ ...m, [row.productId]: true }));

    // No exceptions left to record — remove the override row entirely instead of
    // upserting a no-op one, so it cleanly reverts to the brand master's own values.
    const isDefault =
      row.draftPriceOverride == null &&
      !row.draftIsHidden &&
      row.draftIsAvailable;

    const call$ = isDefault
      ? this.api.deleteBranchOverride(id, row.productId)
      : this.api.upsertBranchOverride(id, {
          productId: row.productId,
          priceOverride: row.draftPriceOverride,
          isHidden: row.draftIsHidden,
          isAvailable: row.draftIsAvailable,
        });

    call$.subscribe({
      next: () => {
        this.saving.update((m) => ({ ...m, [row.productId]: false }));
        row.priceOverride = row.draftPriceOverride ?? undefined;
        row.isHidden = row.draftIsHidden;
        row.isAvailable = row.draftIsAvailable;
      },
      error: () =>
        this.saving.update((m) => ({ ...m, [row.productId]: false })),
    });
  }

  protected applyBulkAdjust(): void {
    if (!this.bulkValue || this.bulkValue <= 0) return;
    const id = this.api.businessId()!;
    this.bulkApplying.set(true);
    this.bulkResultMessage.set('');
    this.bulkError.set('');

    this.api
      .bulkAdjustBranchOverridePrices(id, {
        isPercentage: this.bulkIsPercentage,
        isIncrease: this.bulkIsIncrease,
        value: this.bulkValue,
      })
      .subscribe({
        next: (res) => {
          this.bulkApplying.set(false);
          this.bulkResultMessage.set(
            this.i18n.translate('products.bulkResult', {
              count: String(res.updatedCount),
            }),
          );
          this.load();
        },
        error: () => {
          this.bulkApplying.set(false);
          this.bulkError.set(this.i18n.translate('products.bulkError'));
        },
      });
  }

  protected closeBulkAdjust(): void {
    this.showBulkAdjust.set(false);
    this.bulkIsIncrease = true;
    this.bulkIsPercentage = true;
    this.bulkValue = null;
    this.bulkResultMessage.set('');
    this.bulkError.set('');
  }
}
