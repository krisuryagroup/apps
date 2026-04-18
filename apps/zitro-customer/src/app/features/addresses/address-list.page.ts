import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import {
  AddressListComponent,
  AddAddressFormComponent,
  EvolvedLoaderComponent,
} from '@zitro/ui';
import { AddressApiService } from '@zitro/services';
import { Address, AddressFormData } from '@zitro/models';

@Component({
  selector: 'app-address-list-page',
  standalone: true,
  imports: [
    I18nPipe,
    AddressListComponent,
    AddAddressFormComponent,
    EvolvedLoaderComponent,
  ],
  templateUrl: './address-list.page.html',
  styleUrl: './address-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressListPage implements OnInit {
  private readonly addressApi = inject(AddressApiService);
  private readonly router = inject(Router);

  readonly addresses = signal<Address[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly showForm = signal(false);
  readonly editingAddress = signal<Address | null>(null);

  ngOnInit(): void {
    this.loadAddresses();
  }

  private loadAddresses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.addressApi.getAddresses().subscribe({
      next: addrs => {
        this.addresses.set(addrs);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('common.error');
        this.isLoading.set(false);
      },
    });
  }

  onAddNew(): void {
    this.router.navigate(['/add-address'], { queryParams: { mode: 'manage' } });
  }

  onEdit(address: Address): void {
    this.editingAddress.set(address);
    this.showForm.set(true);
  }

  onDelete(id: string): void {
    if (!confirm('Delete this address?')) return;
    this.addressApi.deleteAddress(id).subscribe({
      next: () => this.loadAddresses(),
      error: () => this.errorMessage.set('common.error'),
    });
  }

  onSelect(address: Address): void {
    this.router.navigate(['/cart']);
  }

  onFormSubmitted(data: AddressFormData): void {
    const editing = this.editingAddress();
    if (!editing) return;

    this.isSaving.set(true);
    this.addressApi
      .updateAddress(editing.id, data)
      .subscribe({
        next: () => {
          this.showForm.set(false);
          this.editingAddress.set(null);
          this.isSaving.set(false);
          this.loadAddresses();
        },
        error: () => {
          this.errorMessage.set('common.error');
          this.isSaving.set(false);
        },
      });
  }

  onFormCancelled(): void {
    this.showForm.set(false);
    this.editingAddress.set(null);
  }
}
