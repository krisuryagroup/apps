import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ManageAddressesComponent } from './manage-addresses.component';
import { UserManagementService, UserAddress } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';
import { RestaurantSwitchingService } from '@zitro/services';

describe('ManageAddressesComponent', () => {
  let component: ManageAddressesComponent;
  let mockUserManagementService: any;
  let mockAuthService: any;
  let mockRestaurantSwitchingService: any;
  let mockRouter: any;
  let mockDialogService: any;

  const mockAddress: UserAddress = {
    name: 'John Doe',
    phone: '+1234567890',
    houseAndStreet: '123 Main St',
    landmark: 'Near Park',
    town: 'Dibiyapur, AURAIYA',
    state: 'Uttar Pradesh',
    pincode: '206244',
    type: 'Home',
    isDefault: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockUserManagementService = {
      getCurrentUserPhone: vi.fn(),
      getUserData: vi.fn(),
      saveUserData: vi.fn(),
      addUserAddress: vi.fn(),
      updateUserAddresses: vi.fn(),
    };

    mockAuthService = {
      isGuestMode: vi.fn(),
    };

    mockRestaurantSwitchingService = {
      getCurrentRestaurant: vi.fn(() => ({
        addressConfig: {
          pincode: '206244',
          town: 'Dibiyapur, AURAIYA',
          state: 'Uttar Pradesh',
          defaultType: 'Home',
        },
      })),
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockDialogService = {
      showConfirmation: vi.fn()
    };

    component = new ManageAddressesComponent(
      mockUserManagementService,
      mockAuthService,
      mockRestaurantSwitchingService,
      mockRouter,
      mockDialogService
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it.each([
      { field: 'addresses', value: [] },
      { field: 'showForm', value: false },
      { field: 'editIndex', value: null },
      { field: 'isLoading', value: false },
      { field: 'isSaving', value: false },
      { field: 'errorMessage', value: '' },
    ])('should initialize $field to $value', ({ field, value }) => {
      expect((component as any)[field]).toEqual(value);
    });

    it('should call loadAddresses on ngOnInit', async () => {
      const loadSpy = vi.spyOn(component, 'loadAddresses').mockResolvedValue();

      await component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('Address Configuration', () => {
    it('should get current address config', () => {
      const config = component.currentAddressConfig;

      expect(config.pincode).toBe('206244');
      expect(config.town).toBe('Dibiyapur, AURAIYA');
      expect(config.state).toBe('Uttar Pradesh');
    });

    it('should return default config on error', () => {
      mockRestaurantSwitchingService.getCurrentRestaurant.mockImplementation(() => {
        throw new Error('No restaurant');
      });

      const config = component.currentAddressConfig;

      expect(config.pincode).toBe('206244');
      expect(config.state).toBe('Uttar Pradesh');
    });
  });

  describe('Load Addresses', () => {
    it('should load addresses successfully', async () => {
      const mockAddresses = [mockAddress];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: mockAddresses });

      await component.loadAddresses();

      expect(component.addresses).toEqual(mockAddresses);
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('');
    });

    it('should handle missing phone number', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue(null);

      await component.loadAddresses();

      expect(component.errorMessage).toBe('Unable to get user phone number');
      expect(component.isLoading).toBe(false);
    });

    it('should handle load errors', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockRejectedValue(new Error('Load failed'));

      await component.loadAddresses();

      expect(component.errorMessage).toBe('Failed to load addresses. Please try again.');
      expect(component.addresses).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should handle empty addresses', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: undefined });

      await component.loadAddresses();

      expect(component.addresses).toEqual([]);
    });
  });

  describe('Open Add Form', () => {
    it('should open add form with defaults', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({
        name: 'John Doe',
        phoneNumber: '+1234567890',
      });

      await component.openAddForm();

      expect(component.showForm).toBe(true);
      expect(component.editIndex).toBeNull();
    });

    it('should set default values from restaurant config', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({});

      await component.openAddForm();

      expect(component.form.pincode).toBe('206244');
      expect(component.form.town).toBe('Dibiyapur, AURAIYA');
      expect(component.form.state).toBe('Uttar Pradesh');
    });
  });

  describe('Open Edit Form', () => {
    it('should populate form with address data', () => {
      component.addresses = [mockAddress];

      component.openEditForm(0);

      expect(component.showForm).toBe(true);
      expect(component.editIndex).toBe(0);
      expect(component.form.name).toBe('John Doe');
      expect(component.form.phone).toBe('+1234567890');
    });
  });

  describe('Cancel Form', () => {
    it('should close form and clear data', () => {
      component.showForm = true;
      component.form = { name: 'Test' };
      component.errorMessage = 'Error';

      component.cancelForm();

      expect(component.showForm).toBe(false);
      expect(component.form).toEqual({});
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Save Address', () => {
    beforeEach(() => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.updateUserAddresses.mockResolvedValue(true);
    });

    it('should add new address', async () => {
      component.form = { ...mockAddress, type: 'Home' };
      component.editIndex = null;
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });

      await component.saveAddress();

      expect(mockUserManagementService.addUserAddress).toHaveBeenCalled();
      expect(component.showForm).toBe(false);
    });

    it('should update existing address', async () => {
      component.addresses = [mockAddress];
      component.form = { ...mockAddress, name: 'Jane Doe', type: 'Home' };
      component.editIndex = 0;
      mockUserManagementService.updateUserAddresses.mockResolvedValue(true);

      await component.saveAddress();

      expect(mockUserManagementService.updateUserAddresses).toHaveBeenCalled();
      expect(component.showForm).toBe(false);
    });

    it('should handle save errors', async () => {
      component.form = {}; // Empty form to trigger validation error

      await component.saveAddress();

      expect(component.errorMessage).toContain('Please fill');
    });

    it('should show error for missing phone', async () => {
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue(null);
      component.form = { ...mockAddress, type: 'Home' };

      await component.saveAddress();

      expect(component.errorMessage).toBe('Unable to get user phone number');
    });
  });

  describe('Delete Address', () => {
    it('should delete address after confirmation', async () => {
      component.addresses = [
        { ...mockAddress, name: 'John Doe' },
        { ...mockAddress, name: 'Jane' },
      ];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.updateUserAddresses.mockResolvedValue(true);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await component.deleteAddress(0);

      expect(component.addresses).toHaveLength(1);
      expect(component.addresses[0].name).toBe('Jane');
    });

    it('should not delete if not confirmed', async () => {
      component.addresses = [mockAddress];
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await component.deleteAddress(0);

      expect(component.addresses).toHaveLength(1);
    });

    it('should handle delete errors', async () => {
      component.addresses = [mockAddress];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.updateUserAddresses.mockRejectedValue(new Error('Delete failed'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await component.deleteAddress(0);

      expect(console.error).toHaveBeenCalled();
      expect(component.errorMessage).toContain('error');
    });
  });

  describe('Set Default Address', () => {
    it('should set address as default', async () => {
      component.addresses = [
        { ...mockAddress, isDefault: false },
        { ...mockAddress, name: 'Jane', isDefault: true },
      ];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: component.addresses });
      mockUserManagementService.saveUserData.mockResolvedValue(undefined);

      await component.setDefaultAddress(0);

      expect(component.addresses[0].isDefault).toBe(true);
      expect(component.addresses[1].isDefault).toBe(false);
    });

    it('should handle set default errors', async () => {
      component.addresses = [mockAddress];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.updateUserAddresses.mockRejectedValue(new Error('Update failed'));

      await component.setDefaultAddress(0);

      expect(console.error).toHaveBeenCalled();
      expect(component.errorMessage).toContain('error');
    });
  });

  describe('Form Validation', () => {
    it.each([
      { field: 'name', value: '', isValid: false },
      { field: 'phone', value: '', isValid: false },
      { field: 'houseAndStreet', value: '', isValid: false },
      { field: 'pincode', value: '', isValid: false },
    ])('should validate required field: $field', ({ field, value }) => {
      component.form = { [field]: value };

      const result = component['validateForm']();

      expect(result).toBe(false);
      expect(component.errorMessage).toContain('Please fill');
    });

    it('should validate complete form', () => {
      component.form = {
        ...mockAddress,
        type: 'Home',
      };

      const result = component['validateForm']();

      expect(result).toBe(true);
    });
  });

  describe('Post-Address Navigation', () => {
    it('should show dialog when redirectAfterAddress is set', async () => {
      localStorage.setItem('redirectAfterAddress', 'checkout');
      mockDialogService.showConfirmation.mockResolvedValue(true);
      component.addresses = [];
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });
      component.form = {
        name: 'John',
        phone: '+1234567890',
        houseAndStreet: '123 Main',
        landmark: 'Near Park',
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        type: 'Home',
        isDefault: true
      };

      await component.saveAddress();

      expect(mockDialogService.showConfirmation).toHaveBeenCalledWith({
        title: 'Address Added Successfully',
        message: 'Where would you like to go?',
        confirmText: 'Go to Cart',
        cancelText: 'Add more items'
      });
      expect(localStorage.getItem('redirectAfterAddress')).toBeNull();
    });

    it('should navigate to cart when user confirms dialog', async () => {
      localStorage.setItem('redirectAfterAddress', 'checkout');
      mockDialogService.showConfirmation.mockResolvedValue(true);
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });
      component.form = {
        name: 'John',
        phone: '+1234567890',
        houseAndStreet: '123 Main',
        landmark: 'Near Park',
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        type: 'Home',
        isDefault: true
      };

      await component.saveAddress();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
    });

    it('should navigate to home when user cancels dialog', async () => {
      localStorage.setItem('redirectAfterAddress', 'checkout');
      mockDialogService.showConfirmation.mockResolvedValue(false);
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });
      component.form = {
        name: 'John',
        phone: '+1234567890',
        houseAndStreet: '123 Main',
        landmark: 'Near Park',
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        type: 'Home',
        isDefault: true
      };

      await component.saveAddress();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should not show dialog when redirectAfterAddress is not set', async () => {
      localStorage.removeItem('redirectAfterAddress');
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue('+1234567890');
      mockUserManagementService.addUserAddress.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({ addresses: [] });
      component.form = {
        name: 'John',
        phone: '+1234567890',
        houseAndStreet: '123 Main',
        landmark: 'Near Park',
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        type: 'Home',
        isDefault: true
      };

      await component.saveAddress();

      expect(mockDialogService.showConfirmation).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
