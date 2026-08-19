import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApiService, BusinessDetailDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'lib-admin-business-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, I18nPipe, FormFieldComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'businesses.edit' | i18n }}</h1>
      <a class="btn btn-outline" [routerLink]="['/businesses', id()]"
        >← {{ 'common.back' | i18n }}</a
      >
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (biz()) {
      <form class="form-grid" (ngSubmit)="save()">
        <lib-form-field labelKey="businesses.name" [error]="null"
          ><input
            class="input"
            id="edit-name"
            [(ngModel)]="form.name"
            name="name"
            data-testid="business-edit-name"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.description" [error]="null"
          ><input
            class="input"
            id="edit-desc"
            [(ngModel)]="form.description"
            name="description"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.phone" [error]="null"
          ><input
            class="input"
            id="edit-phone"
            [(ngModel)]="form.phone"
            name="phone"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.commissionRate" [error]="null">
          <input
            class="input"
            id="edit-commission"
            type="number"
            [(ngModel)]="form.commissionPercentage"
            name="commissionPercentage"
            data-testid="business-edit-commission-rate"
          />
        </lib-form-field>
        <label class="checkbox-label" for="edit-featured">
          <input
            id="edit-featured"
            type="checkbox"
            [(ngModel)]="form.isFeatured"
            name="isFeatured"
            data-testid="business-edit-featured-toggle"
          />
          {{ 'businesses.featured' | i18n }}
        </label>
        <div class="panel-actions">
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
          </button>
        </div>
        @if (saveError()) {
          <p class="error-text">{{ 'common.error' | i18n }}</p>
        }
        @if (saveSuccess()) {
          <p class="success-text">{{ 'common.saved' | i18n }}</p>
        }
      </form>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-xs);
        font-size: var(--zitro-font-size-sm);
      }
      .form-grid {
        max-width: 520px;
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessEditComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);

  protected id = signal('');
  protected biz = signal<BusinessDetailDto | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);
  protected saveError = signal(false);
  protected saveSuccess = signal(false);
  protected form = {
    name: '',
    description: '',
    phone: '',
    commissionPercentage: 0,
    isFeatured: false,
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.id.set(id);
    this.api.getBusinessById(id).subscribe({
      next: (b) => {
        this.biz.set(b);
        this.form = {
          name: b.name,
          description: b.description ?? '',
          phone: b.phone ?? '',
          commissionPercentage: b.commissionPercentage ?? 0,
          isFeatured: false,
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected save(): void {
    this.saving.set(true);
    this.api
      .updateBusiness(this.id(), this.form as Record<string, unknown>)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saveSuccess.set(true);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set(true);
        },
      });
  }
}
