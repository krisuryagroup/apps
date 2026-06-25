import { Injectable, inject } from '@angular/core';
import { OrderConfiguration, OrderTypeMessages } from '@zitro/models';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ConfigApiService, OrderConfigShape } from './api/config-api.service';
import { BusinessContextService } from './business-context.service';

@Injectable({ providedIn: 'root' })
export class OrderConfigService {
  private readonly configApi = inject(ConfigApiService);
  private readonly businessContext = inject(BusinessContextService);

  private configSubject = new BehaviorSubject<OrderConfiguration | null>(null);
  public config$: Observable<OrderConfiguration | null> =
    this.configSubject.asObservable();

  private get defaultConfig(): OrderConfiguration {
    return {
      restaurantId: this.businessContext.businessId() || '',
      orderTypes: {
        dineIn: { enabled: true, displayName: 'Dine In', icon: 'restaurant' },
        takeout: {
          enabled: true,
          displayName: 'Takeout',
          icon: 'shopping_bag',
        },
        delivery: {
          enabled: true,
          displayName: 'Home Delivery',
          icon: 'delivery_dining',
        },
      },
      dineInConfig: {
        enabled: true,
        showDetails: true,
        tables: [],
        defaultGuests: 2,
        minGuests: 1,
        maxGuests: 20,
      },
      takeoutConfig: {
        enabled: true,
        showScheduledPickup: false,
        defaultPickupTime: 30,
        pickupMessage:
          'Your order will be ready for pickup in approximately 30 minutes.',
      },
      deliveryConfig: { enabled: true, showAddressSelection: true },
      messages: this.defaultMessages(),
      defaultOrderType: 'delivery',
      updatedAt: new Date(),
    };
  }

  private defaultMessages(): OrderTypeMessages {
    return {
      dineIn: {
        success: 'Dine-in order placed!',
        error: 'Failed. Please try again.',
        tableRequired: 'Please select a table',
        guestsRequired: 'Please enter guest count',
        tableUnavailable: 'Table unavailable',
      },
      takeout: {
        success: 'Takeout order placed!',
        error: 'Failed. Please try again.',
        pickupTimeRequired: 'Select pickup time',
        pickupMessage: 'Ready in ~30 minutes.',
      },
      delivery: {
        success: 'Delivery order placed!',
        error: 'Failed. Please try again.',
        addressRequired: 'Please select an address',
        outOfRange: 'Outside delivery range.',
      },
      general: {
        orderTypeRequired: 'Please select order type',
        orderPlaced: 'Order placed!',
        orderFailed: 'Order failed.',
        orderCancelled: 'Order cancelled.',
        orderConfirmed: 'Order confirmed!',
      },
    };
  }

  async loadConfiguration(): Promise<OrderConfiguration> {
    const slug = this.businessContext.businessId();
    if (!slug) {
      const config = this.defaultConfig;
      this.configSubject.next(config);
      return config;
    }
    try {
      const apiConfig = await firstValueFrom(
        this.configApi.getBusinessConfig(slug),
      );
      const config = this.mapToOrderConfiguration(apiConfig.orderConfig);
      this.configSubject.next(config);
      return config;
    } catch {
      const config = this.defaultConfig;
      this.configSubject.next(config);
      return config;
    }
  }

  private mapToOrderConfiguration(
    shape: OrderConfigShape | null,
  ): OrderConfiguration {
    if (!shape) return this.defaultConfig;
    return {
      restaurantId: this.businessContext.businessId() || '',
      orderTypes: {
        dineIn: {
          enabled: shape.orderTypes.dineIn.enabled,
          displayName: shape.orderTypes.dineIn.displayName,
          icon: shape.orderTypes.dineIn.icon,
        },
        takeout: {
          enabled: shape.orderTypes.takeout.enabled,
          displayName: shape.orderTypes.takeout.displayName,
          icon: shape.orderTypes.takeout.icon,
        },
        delivery: {
          enabled: shape.orderTypes.delivery.enabled,
          displayName: shape.orderTypes.delivery.displayName,
          icon: shape.orderTypes.delivery.icon,
        },
      },
      dineInConfig: {
        enabled: shape.dineInConfig.enabled,
        showDetails: shape.dineInConfig.showDetails,
        tables: [],
        defaultGuests: shape.dineInConfig.defaultGuests,
        minGuests: shape.dineInConfig.minGuests,
        maxGuests: shape.dineInConfig.maxGuests,
      },
      takeoutConfig: {
        enabled: shape.takeoutConfig.enabled,
        showScheduledPickup: shape.takeoutConfig.showScheduledPickup,
        defaultPickupTime: shape.takeoutConfig.defaultPickupTime,
        pickupMessage: shape.takeoutConfig.pickupMessage,
      },
      deliveryConfig: {
        enabled: shape.deliveryConfig.enabled,
        showAddressSelection: shape.deliveryConfig.showAddressSelection,
      },
      messages: this.defaultMessages(),
      defaultOrderType:
        (shape.defaultOrderType as 'delivery' | 'dine-in' | 'takeout') ||
        'delivery',
      updatedAt: new Date(),
    };
  }

  getConfiguration(): OrderConfiguration {
    return this.configSubject.value ?? this.defaultConfig;
  }

  isOrderTypeEnabled(orderType: 'dine-in' | 'takeout' | 'delivery'): boolean {
    const config = this.getConfiguration();
    if (orderType === 'dine-in') return config.orderTypes.dineIn.enabled;
    if (orderType === 'takeout') return config.orderTypes.takeout.enabled;
    if (orderType === 'delivery') return config.orderTypes.delivery.enabled;
    return false;
  }

  getAvailableOrderTypes(): Array<'dine-in' | 'takeout' | 'delivery'> {
    const config = this.getConfiguration();
    const types: Array<'dine-in' | 'takeout' | 'delivery'> = [];
    if (config.orderTypes.dineIn.enabled) types.push('dine-in');
    if (config.orderTypes.takeout.enabled) types.push('takeout');
    if (config.orderTypes.delivery.enabled) types.push('delivery');
    return types.length ? types : ['delivery'];
  }

  getAvailableTables() {
    return this.getConfiguration().dineInConfig.tables.filter(
      (t) => t.isAvailable,
    );
  }
  getAllTables() {
    return this.getConfiguration().dineInConfig.tables;
  }

  getMessage(category: keyof OrderTypeMessages, key: string): string {
    const messages = this.getConfiguration().messages[category] as Record<
      string,
      string
    >;
    return messages?.[key] ?? '';
  }

  getOrderTypeDisplayName(
    orderType: 'dine-in' | 'takeout' | 'delivery',
  ): string {
    const config = this.getConfiguration();
    if (orderType === 'dine-in') return config.orderTypes.dineIn.displayName;
    if (orderType === 'takeout') return config.orderTypes.takeout.displayName;
    if (orderType === 'delivery') return config.orderTypes.delivery.displayName;
    return orderType;
  }

  getOrderTypeIcon(orderType: 'dine-in' | 'takeout' | 'delivery'): string {
    const config = this.getConfiguration();
    if (orderType === 'dine-in') return config.orderTypes.dineIn.icon;
    if (orderType === 'takeout') return config.orderTypes.takeout.icon;
    if (orderType === 'delivery') return config.orderTypes.delivery.icon;
    return 'help_outline';
  }

  shouldShowDineInDetails(): boolean {
    const c = this.getConfiguration();
    return c.dineInConfig.enabled && c.dineInConfig.showDetails;
  }
  shouldShowTakeoutScheduledPickup(): boolean {
    const c = this.getConfiguration();
    return c.takeoutConfig.enabled && c.takeoutConfig.showScheduledPickup;
  }
}
