import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BusinessDetailDto,
  BusinessDocumentType,
  BusinessUserDto,
  OrderSummaryDto,
  PagedResult,
  VerificationDocDto,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  BackButtonComponent,
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
  DocumentViewerComponent,
} from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';
import { AdminBusinessEditFormComponent } from '../business-edit/admin-business-edit-form.component';

type Tab = 'profile' | 'users' | 'orders' | 'documents';

const DOCUMENT_TYPES: BusinessDocumentType[] = [
  'pan',
  'fssai',
  'gst',
  'bank-proof',
];
const DOCUMENT_LABELS: Record<BusinessDocumentType, string> = {
  pan: 'PAN card',
  fssai: 'FSSAI license',
  gst: 'GST certificate',
  'bank-proof': 'Bank proof (cancelled cheque / passbook)',
};

@Component({
  selector: 'lib-admin-business-detail',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DataTableComponent,
    ConfirmationDialogComponent,
    AdminBusinessEditFormComponent,
    BackButtonComponent,
    DocumentViewerComponent,
  ],
  templateUrl: './admin-business-detail.component.html',
  styleUrl: './admin-business-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessDetailComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected biz = signal<BusinessDetailDto | null>(null);
  protected loading = signal(true);
  protected activeTab = signal<Tab>('profile');

  /** Mirrors the `businesses:write` guard on the /businesses/:id/edit route — without
   * this the Edit link was shown to every role, and a Support/read-only admin clicking
   * it would get silently bounced back to the dashboard by the route guard. */
  protected canEdit(): boolean {
    return this.api.hasPermission('businesses:write');
  }

  protected usersLoading = signal(false);
  protected usersError = signal(false);
  protected users = signal<BusinessUserDto[] | null>(null);
  protected usersViewMode = signal<'active' | 'archived'>('active');

  protected setUsersViewMode(mode: 'active' | 'archived'): void {
    if (this.usersViewMode() === mode) return;
    this.usersViewMode.set(mode);
    this.loadUsers();
  }
  protected readonly userColumns: DataTableColumn<BusinessUserDto>[] = [
    { key: 'name', labelKey: 'businesses.userName' },
    { key: 'phoneNumber', labelKey: 'businesses.userPhone' },
    {
      key: 'email',
      labelKey: 'businesses.userEmail',
      format: (r) => r.email ?? '—',
    },
    { key: 'role', labelKey: 'businesses.userRole' },
    {
      key: 'isActive',
      labelKey: 'businesses.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  protected ordersLoading = signal(false);
  protected ordersError = signal(false);
  protected ordersResult = signal<PagedResult<OrderSummaryDto> | null>(null);
  protected ordersPage = signal(1);
  protected readonly ordersPageSize = 20;
  protected ordersPagination = computed<DataTablePagination | null>(() => {
    const r = this.ordersResult();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });
  protected readonly orderColumns: DataTableColumn<OrderSummaryDto>[] = [
    { key: 'orderId', labelKey: 'orders.orderId' },
    { key: 'status', labelKey: 'orders.status' },
    { key: 'total', labelKey: 'orders.total', format: (r) => `₹${r.total}` },
    {
      key: 'createdAt',
      labelKey: 'orders.date',
      format: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

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

  // ── Documents ─────────────────────────────────────────────────────────────
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected reviewingDoc = signal<
    Partial<Record<BusinessDocumentType, boolean>>
  >({});

  protected documentLabel(type: BusinessDocumentType): string {
    return DOCUMENT_LABELS[type];
  }

  protected docFor(type: BusinessDocumentType): VerificationDocDto | undefined {
    return this.biz()?.verificationDocs?.find((d) => d.type === type);
  }

  protected verifyDocument(type: BusinessDocumentType): void {
    this.reviewDocument(type, 'verified');
  }

  protected rejectDocument(type: BusinessDocumentType): void {
    const reason = prompt('Reason for rejecting this document:');
    if (reason === null) return; // cancelled
    this.reviewDocument(type, 'rejected', reason || undefined);
  }

  private reviewDocument(
    type: BusinessDocumentType,
    status: 'verified' | 'rejected',
    rejectionReason?: string,
  ): void {
    const biz = this.biz();
    if (!biz) return;
    this.reviewingDoc.update((m) => ({ ...m, [type]: true }));

    const updatedDocs = (biz.verificationDocs ?? []).map((d) =>
      d.type === type ? { ...d, status, rejectionReason } : d,
    );
    this.api
      .updateBusiness(biz.id, { verificationDocs: updatedDocs })
      .subscribe({
        next: () => {
          this.biz.update((b) =>
            b ? { ...b, verificationDocs: updatedDocs } : b,
          );
          this.reviewingDoc.update((m) => ({ ...m, [type]: false }));
        },
        error: () => this.reviewingDoc.update((m) => ({ ...m, [type]: false })),
      });
  }

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

  protected switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'users' && this.users() === null) {
      this.loadUsers();
    } else if (tab === 'orders' && this.ordersResult() === null) {
      this.loadOrders();
    }
  }

  private loadUsers(): void {
    const id = this.biz()?.id;
    if (!id) return;
    this.usersLoading.set(true);
    this.usersError.set(false);
    this.api
      .listBusinessUsers(id, this.usersViewMode() === 'archived')
      .subscribe({
        next: (u) => {
          this.users.set(u);
          this.usersLoading.set(false);
        },
        error: () => {
          this.usersLoading.set(false);
          this.usersError.set(true);
        },
      });
  }

  // ── Add / edit business user ─────────────────────────────────────────────
  protected showUserForm = signal(false);
  protected editingUser = signal<BusinessUserDto | null>(null);
  protected userSaving = signal(false);
  protected userFormError = signal('');
  protected userForm = {
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'staff',
    isActive: true,
    newPassword: '',
  };
  /** Email becomes read-only once an account already has one — matches the backend's
   * UpdateBusinessUserHandler, which silently ignores an Email on an account that already
   * has one rather than overwriting it. */
  protected emailLocked = computed(() => !!this.editingUser()?.email);

  protected openAddUser(): void {
    this.editingUser.set(null);
    this.userForm = {
      name: '',
      phoneNumber: '',
      email: '',
      password: '',
      role: 'staff',
      isActive: true,
      newPassword: '',
    };
    this.userFormError.set('');
    this.showUserForm.set(true);
  }

  protected openEditUser(user: BusinessUserDto): void {
    this.editingUser.set(user);
    this.userForm = {
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email ?? '',
      password: '',
      role: user.role,
      isActive: user.isActive,
      newPassword: '',
    };
    this.userFormError.set('');
    this.showUserForm.set(true);
  }

  protected canSaveUser(): boolean {
    if (!this.userForm.name || !this.userForm.role) return false;
    if (!this.editingUser()) {
      return !!this.userForm.phoneNumber && !!this.userForm.password;
    }
    return true;
  }

  protected saveUser(): void {
    if (!this.canSaveUser()) return;
    const businessId = this.biz()?.id;
    if (!businessId) return;
    this.userSaving.set(true);
    this.userFormError.set('');

    const editing = this.editingUser();
    const onSuccess = () => {
      this.userSaving.set(false);
      this.closeUserForm();
      this.loadUsers();
    };
    const onError = () => {
      this.userSaving.set(false);
      this.userFormError.set('Could not save this user. Please try again.');
    };

    if (editing) {
      this.api
        .updateBusinessUser(businessId, editing.id, {
          name: this.userForm.name,
          role: this.userForm.role,
          isActive: this.userForm.isActive,
          newPassword: this.userForm.newPassword || null,
          email: this.emailLocked() ? null : this.userForm.email || null,
        })
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.api
        .createBusinessUser(businessId, {
          name: this.userForm.name,
          phoneNumber: this.userForm.phoneNumber,
          email: this.userForm.email || null,
          password: this.userForm.password,
          role: this.userForm.role,
        })
        .subscribe({ next: onSuccess, error: onError });
    }
  }

  protected closeUserForm(): void {
    this.showUserForm.set(false);
    this.editingUser.set(null);
    this.userFormError.set('');
  }

  // ── Delete business user ─────────────────────────────────────────────────
  protected pendingDeleteUser = signal<BusinessUserDto | null>(null);
  protected deleteUserError = signal('');
  protected deleteUserDialogConfig = computed<ConfirmationDialogConfig>(() => ({
    title: this.i18n.translate('common.confirmDeleteTitle'),
    message: this.i18n.translate('common.confirmDeleteMessage', {
      name: this.pendingDeleteUser()?.name ?? '',
    }),
    confirmLabel: this.i18n.translate('common.delete'),
    cancelLabel: this.i18n.translate('common.cancel'),
    destructive: true,
    closeOnBackdropClick: true,
  }));

  protected requestDeleteUser(user: BusinessUserDto): void {
    this.deleteUserError.set('');
    this.pendingDeleteUser.set(user);
  }

  protected confirmDeleteUser(): void {
    const user = this.pendingDeleteUser();
    const businessId = this.biz()?.id;
    if (!user || !businessId) return;
    this.pendingDeleteUser.set(null);
    this.api.deleteBusinessUser(businessId, user.id).subscribe({
      next: () => {
        this.users.update((us) => (us ?? []).filter((u) => u.id !== user.id));
      },
      error: (err) => {
        this.deleteUserError.set(
          err?.error?.errorCode === 'LAST_OWNER'
            ? this.i18n.translate('businesses.lastOwnerError')
            : this.i18n.translate('businesses.deleteUserError'),
        );
      },
    });
  }

  protected onOrdersPageChange(page: number): void {
    this.ordersPage.set(page);
    this.loadOrders();
  }

  private loadOrders(): void {
    const id = this.biz()?.id;
    if (!id) return;
    this.ordersLoading.set(true);
    this.ordersError.set(false);
    this.api
      .listAdminOrders({
        businessId: id,
        page: String(this.ordersPage()),
        pageSize: String(this.ordersPageSize),
      })
      .subscribe({
        next: (r) => {
          this.ordersResult.set(r);
          this.ordersLoading.set(false);
        },
        error: () => {
          this.ordersLoading.set(false);
          this.ordersError.set(true);
        },
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
      error: (err: { error?: { error?: string; errorCode?: string } }) => {
        this.approveError.set(
          err.error?.errorCode === 'INCOMPLETE_LISTING'
            ? (err.error?.error ?? this.i18n.translate('common.error'))
            : this.i18n.translate('common.error'),
        );
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
        this.approveError.set(this.i18n.translate('common.error'));
        this.approving.set(false);
      },
    });
  }
}
