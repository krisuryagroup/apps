import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApiService, BusinessDetailDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { BackButtonComponent } from '@zitro/ui';
import { AdminBusinessEditFormComponent } from './admin-business-edit-form.component';

@Component({
  selector: 'lib-admin-business-edit',
  standalone: true,
  imports: [I18nPipe, BackButtonComponent, AdminBusinessEditFormComponent],
  template: `
    <div class="page-header page-header--with-back">
      <lib-back-button [to]="['/businesses', id()]" ariaLabel="Back" />
      <h1 class="page-title">{{ 'businesses.edit' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (biz(); as b) {
      <lib-admin-business-edit-form [business]="b" (saved)="biz.set($event)" />
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.id.set(id);
    this.api.getBusinessById(id).subscribe({
      next: (b) => {
        this.biz.set(b);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
