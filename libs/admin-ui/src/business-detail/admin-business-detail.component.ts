import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApiService, BusinessDetailDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

type Tab = 'profile' | 'users' | 'orders';

@Component({
  selector: 'lib-admin-business-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, I18nPipe],
  templateUrl: './admin-business-detail.component.html',
  styleUrl: './admin-business-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessDetailComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected biz = signal<BusinessDetailDto | null>(null);
  protected loading = signal(true);
  protected activeTab = signal<Tab>('profile');

  protected rejectionReason = '';
  protected customReason = '';
  protected approving = signal(false);
  protected approveSuccess = signal(false);
  protected approveError = signal<string | null>(null);

  protected readonly REJECTION_REASONS = [
    'Incomplete documents',
    'Invalid FSSAI',
    'Duplicate listing',
    'Other',
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getBusinessById(id).subscribe({
      next: (b) => {
        this.biz.set(b);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected approve(): void {
    this.approving.set(true);
    this.approveError.set(null);
    this.api.approveBusiness(this.biz()!.id, true).subscribe({
      next: () => {
        this.biz.update((b) =>
          b ? { ...b, onboardingStatus: 'approved', isActive: true } : b,
        );
        this.approveSuccess.set(true);
        this.approving.set(false);
      },
      error: () => {
        this.approveError.set('common.error');
        this.approving.set(false);
      },
    });
  }

  protected reject(): void {
    const reason =
      this.rejectionReason === 'Other'
        ? this.customReason
        : this.rejectionReason;
    if (!reason) return;
    this.approving.set(true);
    this.approveError.set(null);
    this.api.approveBusiness(this.biz()!.id, false, reason).subscribe({
      next: () => {
        this.biz.update((b) =>
          b ? { ...b, onboardingStatus: 'rejected' } : b,
        );
        this.approving.set(false);
      },
      error: () => {
        this.approveError.set('common.error');
        this.approving.set(false);
      },
    });
  }
}
