import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BusinessSummaryDto,
  PagedResult,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-businesses',
  standalone: true,
  imports: [FormsModule, RouterLink, I18nPipe, DataTableComponent],
  templateUrl: './admin-businesses.component.html',
  styleUrl: './admin-businesses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  protected result = signal<PagedResult<BusinessSummaryDto> | null>(null);
  protected loading = signal(true);
  protected search = '';
  protected statusFilter = '';
  protected typeFilter = '';

  protected showInviteForm = signal(false);
  protected inviteName = '';
  protected invitePhone = '';
  protected inviteEmail = '';
  protected inviteOwnerName = '';
  protected inviteType = 'restaurant';
  protected inviteTown = '';
  protected inviting = signal(false);

  protected readonly columns: DataTableColumn<BusinessSummaryDto>[] = [
    { key: 'name', labelKey: 'businesses.name' },
    { key: 'slug', labelKey: 'businesses.slug' },
    { key: 'businessType', labelKey: 'businesses.type' },
    { key: 'town', labelKey: 'businesses.town' },
    {
      key: 'onboardingStatus',
      labelKey: 'businesses.status',
      format: (r) => r.onboardingStatus,
    },
    {
      key: 'isActive',
      labelKey: 'businesses.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    const p: Record<string, string> = {};
    if (this.search) p['search'] = this.search;
    if (this.statusFilter) p['onboardingStatus'] = this.statusFilter;
    if (this.typeFilter) p['businessType'] = this.typeFilter;
    this.api.listBusinesses(p).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onRowClick(row: BusinessSummaryDto): void {
    this.router.navigate(['/businesses', row.id]);
  }

  protected submitInvite(): void {
    this.inviting.set(true);
    this.api
      .createBusiness({
        name: this.inviteName,
        businessType: this.inviteType,
        town: this.inviteTown,
      })
      .subscribe({
        next: (biz) => {
          this.api
            .inviteBusinessOwner(biz.id, {
              name: this.inviteOwnerName,
              phone: this.invitePhone,
              email: this.inviteEmail,
              sendInvite: true,
            })
            .subscribe({
              next: () => {
                this.showInviteForm.set(false);
                this.inviting.set(false);
                this.load();
              },
              error: () => this.inviting.set(false),
            });
        },
        error: () => this.inviting.set(false),
      });
  }
}
