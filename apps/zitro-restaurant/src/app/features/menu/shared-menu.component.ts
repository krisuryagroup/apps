import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BusinessApiService, BrandMasterProductDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

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
    </div>
    <p class="shared-menu-hint">{{ 'restaurant.sharedMenuHint' | i18n }}</p>

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
                  [attr.data-testid]="'shared-menu-available-' + row.productId"
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

  protected loading = signal(true);
  protected saving = signal<Record<string, boolean>>({});
  protected rows = signal<
    (BrandMasterProductDto & {
      draftPriceOverride: number | null;
      draftIsHidden: boolean;
      draftIsAvailable: boolean;
    })[]
  >([]);

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
}
