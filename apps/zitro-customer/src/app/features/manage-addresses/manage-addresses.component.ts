import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserManagementService, UserAddress } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';
import { Address, AddressFormData } from '@zitro/models';
import { RestaurantSwitchingService } from '@zitro/services';
import { DialogService } from '@zitro/services';
import {
  APP_SETTINGS_CACHE,
  ERROR_MESSAGES,
} from '../../core/constants/app.constants';

@Component({
  selector: 'app-manage-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-addresses.component.html',
  styleUrls: ['./manage-addresses.component.scss'],
})
export class ManageAddressesComponent implements OnInit {
  private userManagementService = inject(UserManagementService);
  private authService = inject(FirebaseAuthService);
  private restaurantSwitchingService = inject(RestaurantSwitchingService);
  private router = inject(Router);
  private dialogService = inject(DialogService);

  addresses: UserAddress[] = [];
  showForm = false;
  editIndex: number | null = null;
  form: Partial<AddressFormData> = {};
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};

  async ngOnInit() {
    await this.loadAddresses();
  }

  /**
   * Get address configuration for current restaurant
   */
  private getAddressConfig() {
    try {
      const currentRestaurant =
        this.restaurantSwitchingService.getCurrentRestaurant();
      return (
        currentRestaurant['addressConfig'] || {
          pincode: '206244',
          town: 'Dibiyapur, AURAIYA',
          state: 'Uttar Pradesh',
          defaultType: 'Home',
        }
      );
    } catch (error) {
      console.error('Error getting restaurant address config:', error);
      // Fallback to default values
      return {
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        defaultType: 'Home',
      };
    }
  }

  /**
   * Get current address config for template use
   */
  get currentAddressConfig() {
    return this.getAddressConfig();
  }

  async loadAddresses() {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (!phoneNumber) {
        this.errorMessage = ERROR_MESSAGES.UNABLE_TO_GET_PHONE;
        return;
      }

      const userData = await this.userManagementService.getUserData(
        phoneNumber,
        true,
      ); // Hard refresh to always get latest addresses
      this.addresses = userData?.addresses || [];
    } catch (error) {
      console.error('Error loading addresses:', error);
      this.errorMessage = 'Failed to load addresses. Please try again.';
      this.addresses = [];
    } finally {
      this.isLoading = false;
    }
  }

  openAddForm() {
    // Navigate to the generic Add Address page
    this.router.navigate(['/add-address'], { queryParams: { mode: 'manage' } });
  }

  openEditForm(idx: number) {
    this.showForm = true;
    this.editIndex = idx;
    const address = this.addresses[idx];

    // Map UserAddress to AddressFormData
    this.form = {
      name: address.name,
      phone: address.phone,
      houseAndStreet: address.houseAndStreet,
      landmark: address.landmark,
      pincode: address.pincode,
      town: address.town,
      state: address.state,
      type: address.type as 'Home' | 'Office' | 'Other',
      isDefault: address.isDefault,
    };
    this.errorMessage = '';
    this.fieldErrors = {};
  }

  async saveAddress() {
    if (!this.validateForm()) {
      return;
    }

    // Get address configuration from current restaurant
    const addressConfig = this.getAddressConfig();

    // Ensure readonly fields are set to correct values from restaurant config
    this.form.pincode = addressConfig.pincode;
    this.form.town = addressConfig.town;
    this.form.state = addressConfig.state;

    try {
      this.isSaving = true;
      this.errorMessage = '';

      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (!phoneNumber) {
        this.errorMessage = ERROR_MESSAGES.UNABLE_TO_GET_PHONE;
        return;
      }

      const formData = this.form as AddressFormData;
      const now = new Date().toISOString();

      if (this.editIndex !== null) {
        // Update existing address
        const updatedAddresses = [...this.addresses];

        // If setting this address as default, unset all other defaults
        if (formData.isDefault) {
          updatedAddresses.forEach((addr, index) => {
            if (index !== this.editIndex) {
              addr.isDefault = false;
            }
          });
        }

        updatedAddresses[this.editIndex] = {
          ...updatedAddresses[this.editIndex],
          name: formData.name,
          phone: formData.phone,
          houseAndStreet: formData.houseAndStreet,
          landmark: formData.landmark,
          pincode: formData.pincode,
          town: formData.town,
          state: formData.state,
          type: formData.type,
          isDefault: formData.isDefault,
          updated_at: now,
        };

        const success = await this.userManagementService.updateUserAddresses(
          phoneNumber,
          updatedAddresses,
        );
        if (success) {
          this.addresses = updatedAddresses;
          this.showForm = false;
          this.form = {};
          this.editIndex = null;
        } else {
          this.errorMessage = 'Failed to update address. Please try again.';
        }
      } else {
        // Add new address

        // If setting this address as default, unset all other defaults
        if (formData.isDefault) {
          const updatedAddresses = [...this.addresses];
          updatedAddresses.forEach((addr) => {
            addr.isDefault = false;
          });
          // Update existing addresses to remove default flag
          await this.userManagementService.updateUserAddresses(
            phoneNumber,
            updatedAddresses,
          );
        }

        const newAddress: Omit<UserAddress, 'created_at' | 'updated_at'> = {
          name: formData.name,
          phone: formData.phone,
          houseAndStreet: formData.houseAndStreet,
          landmark: formData.landmark,
          pincode: formData.pincode,
          town: formData.town,
          state: formData.state,
          type: formData.type,
          isDefault: formData.isDefault,
        };

        const success = await this.userManagementService.addUserAddress(
          phoneNumber,
          newAddress,
        );
        if (success) {
          await this.loadAddresses(); // Reload to get the updated list
          this.showForm = false;
          this.form = {};

          // Check if user came from checkout flow
          await this.handlePostAddressNavigation();
        } else {
          this.errorMessage = 'Failed to add address. Please try again.';
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
      this.errorMessage = 'An error occurred while saving the address.';
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Handle navigation after address is saved
   * If user came from checkout, show dialog asking where to go
   */
  private async handlePostAddressNavigation(): Promise<void> {
    const redirectAfterAddress = localStorage.getItem('redirectAfterAddress');

    if (redirectAfterAddress === 'checkout') {
      localStorage.removeItem('redirectAfterAddress');

      // Show dialog asking where to navigate
      const result = await this.dialogService.showConfirmation({
        title: 'Address Added Successfully',
        message: 'Where would you like to go?',
        confirmText: 'Go to Cart',
        cancelText: 'Add more items',
      });

      if (result) {
        // User chose to go to cart
        this.router.navigate(['/cart']);
      } else {
        // User chose to add more items (go to home)
        this.router.navigate(['/home']);
      }
    }
  }

  async deleteAddress(idx: number) {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      this.errorMessage = '';
      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (!phoneNumber) {
        this.errorMessage = ERROR_MESSAGES.UNABLE_TO_GET_PHONE;
        return;
      }

      const addressToDelete = this.addresses[idx];
      const updatedAddresses = this.addresses.filter(
        (_, index) => index !== idx,
      );

      // If we deleted the default address and there are still addresses left,
      // make the first remaining address the default
      if (addressToDelete.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      const success = await this.userManagementService.updateUserAddresses(
        phoneNumber,
        updatedAddresses,
      );

      if (success) {
        this.addresses = updatedAddresses;
      } else {
        this.errorMessage = 'Failed to delete address. Please try again.';
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      this.errorMessage = 'An error occurred while deleting the address.';
    }
  }

  async setDefaultAddress(idx: number) {
    try {
      this.errorMessage = '';
      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (!phoneNumber) {
        this.errorMessage = ERROR_MESSAGES.UNABLE_TO_GET_PHONE;
        return;
      }

      const updatedAddresses = [...this.addresses];

      // Set all addresses to non-default
      updatedAddresses.forEach((addr) => {
        addr.isDefault = false;
      });

      // Set selected address as default
      updatedAddresses[idx].isDefault = true;

      const success = await this.userManagementService.updateUserAddresses(
        phoneNumber,
        updatedAddresses,
      );

      if (success) {
        this.addresses = updatedAddresses;
      } else {
        this.errorMessage = 'Failed to set default address. Please try again.';
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      this.errorMessage =
        'An error occurred while setting the default address.';
    }
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // Validate name
    if (!this.form.name || this.form.name.trim() === '') {
      this.fieldErrors['name'] = 'Please enter your full name';
      isValid = false;
    }

    // Validate phone
    if (!this.form.phone || this.form.phone.trim() === '') {
      this.fieldErrors['phone'] = 'Please enter your phone number';
      isValid = false;
    } else {
      const phoneRegex = /^[+]?[\d\s-()]{10,15}$/;
      if (!phoneRegex.test(this.form.phone)) {
        this.fieldErrors['phone'] =
          'Please enter a valid phone number (10-15 digits)';
        isValid = false;
      }
    }

    // Validate house and street
    if (!this.form.houseAndStreet || this.form.houseAndStreet.trim() === '') {
      this.fieldErrors['houseAndStreet'] = 'Please enter house no. & street';
      isValid = false;
    }

    // Validate address type
    if (!this.form.type) {
      this.fieldErrors['type'] = 'Please select an address type';
      isValid = false;
    }

    // Get address configuration from current restaurant
    const addressConfig = this.getAddressConfig();

    // Ensure readonly fields have values from restaurant config
    this.form.pincode = addressConfig.pincode;
    this.form.town = addressConfig.town;
    this.form.state = addressConfig.state;

    // Validate pincode (should always be valid from config, but double-check)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(this.form.pincode!)) {
      this.fieldErrors['pincode'] = 'Invalid pincode from configuration';
      isValid = false;
    }

    return isValid;
  }

  cancelForm() {
    this.showForm = false;
    this.form = {};
    this.editIndex = null;
    this.errorMessage = '';
    this.fieldErrors = {};
  }
}
