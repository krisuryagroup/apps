import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BusinessApiService, MenuImportParseResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-menu-import',
  standalone: true,
  imports: [FormsModule, I18nPipe, RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'restaurant.menuImport' | i18n }}</h1>
    </div>

    @if (featureDisabled()) {
      <div class="info-card">
        <p>🤖 {{ 'restaurant.aiImportDisabled' | i18n }}</p>
        <a class="btn btn-primary" routerLink="/menu">{{
          'restaurant.addManually' | i18n
        }}</a>
      </div>
    } @else {
      <div class="upload-section">
        <label for="menu-files" class="upload-label">{{
          'restaurant.uploadMenuPhotos' | i18n
        }}</label>
        <input
          id="menu-files"
          type="file"
          multiple
          accept="image/*,.pdf"
          (change)="onFilesChange($event)"
        />
        <button
          class="btn btn-primary"
          [disabled]="!files.length || parsing()"
          (click)="parse()"
        >
          {{
            parsing()
              ? ('common.loading' | i18n)
              : ('restaurant.parseMenu' | i18n)
          }}
        </button>
      </div>

      @if (parseResult()) {
        <div class="preview-section">
          <h2>{{ 'restaurant.reviewParsedMenu' | i18n }}</h2>
          @for (cat of $any(parseResult()!.categories); track cat.name) {
            <div class="cat-preview">
              <h3>{{ cat.name }}</h3>
              @for (item of cat.items; track item.name) {
                <div class="item-preview">
                  {{ item.name }} — ₹{{ item.price }}
                </div>
              }
            </div>
          }
          <button
            class="btn btn-primary"
            [disabled]="committing()"
            (click)="commit()"
          >
            {{
              committing()
                ? ('common.saving' | i18n)
                : ('restaurant.importAll' | i18n)
            }}
          </button>
        </div>
      }
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .info-card {
      padding: var(--zitro-spacing-xl);
      background: var(--zitro-surface-variant);
      border-radius: var(--zitro-radius-lg);
    }
    .upload-section {
      margin-bottom: var(--zitro-spacing-xl);
      display: flex;
      flex-direction: column;
      gap: var(--zitro-spacing-md);
      max-width: 400px;
    }
    .upload-label {
      font-size: var(--zitro-font-size-sm);
      font-weight: 500;
    }
    .preview-section {
      margin-top: var(--zitro-spacing-xl);
    }
    .cat-preview {
      margin-bottom: var(--zitro-spacing-lg);
    }
    .item-preview {
      padding: var(--zitro-spacing-xs) 0;
      border-bottom: 1px solid var(--zitro-divider);
      font-size: var(--zitro-font-size-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantMenuImportComponent {
  private readonly api = inject(BusinessApiService);
  protected files: File[] = [];
  protected parsing = signal(false);
  protected committing = signal(false);
  protected featureDisabled = signal(false);
  protected parseResult = signal<MenuImportParseResult | null>(null);

  protected onFilesChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.files = Array.from(input.files ?? []);
  }

  protected parse(): void {
    this.parsing.set(true);
    const id = this.api.businessId()!;
    this.api.parseMenuImages(id, this.files).subscribe({
      next: (res) => {
        if (!res.enabled) {
          this.featureDisabled.set(true);
        } else {
          this.parseResult.set(res);
        }
        this.parsing.set(false);
      },
      error: () => this.parsing.set(false),
    });
  }

  protected commit(): void {
    const result = this.parseResult();
    if (!result?.categories) return;
    this.committing.set(true);
    const id = this.api.businessId()!;
    this.api.commitMenuImport(id, result.categories).subscribe({
      next: () => {
        this.parseResult.set(null);
        this.committing.set(false);
      },
      error: () => this.committing.set(false),
    });
  }
}
