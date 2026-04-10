import { Injectable } from '@angular/core';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { OrderConfiguration, OrderTypeMessages } from '@zitro/models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderConfigService {
  // Firebase path: /appSettings/restaurantDetails/onlineorders/orderType
  private readonly FIREBASE_PATH = 'appSettings/restaurantDetails/onlineorders/orderType';
  private db: Firestore;
  
  private configSubject = new BehaviorSubject<OrderConfiguration | null>(null);
  public config$: Observable<OrderConfiguration | null> = this.configSubject.asObservable();

  constructor() {
    this.db = getFirestore(getApp());
    this.loadConfiguration();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): OrderConfiguration {
    return {
      restaurantId: '1001',
      orderTypes: {
        dineIn: {
          enabled: true,
          displayName: 'Dine-in',
          icon: 'restaurant',
          description: 'Enjoy your meal at our restaurant'
        },
        takeout: {
          enabled: true,
          displayName: 'Takeout',
          icon: 'shopping_bag',
          description: 'Pick up your order at the counter'
        },
        delivery: {
          enabled: true,
          displayName: 'Home Delivery',
          icon: 'delivery_dining',
          description: 'Get your food delivered to your doorstep'
        }
      },
      dineInConfig: {
        enabled: true,
        showDetails: true,
        tables: [
          { id: 'T1', number: '1', displayName: 'Table 1', capacity: 2, isAvailable: true },
          { id: 'T2', number: '2', displayName: 'Table 2', capacity: 4, isAvailable: true },
          { id: 'T3', number: '3', displayName: 'Table 3', capacity: 4, isAvailable: true },
          { id: 'T4', number: '4', displayName: 'Table 4', capacity: 6, isAvailable: true },
          { id: 'T5', number: '5', displayName: 'Table 5', capacity: 8, isAvailable: true },
          { id: 'T6', number: '6', displayName: 'Table 6', capacity: 2, isAvailable: true },
          { id: 'T7', number: '7', displayName: 'Table 7', capacity: 4, isAvailable: true },
          { id: 'T8', number: '8', displayName: 'Table 8', capacity: 6, isAvailable: true },
          { id: 'T9', number: '9', displayName: 'Table 9', capacity: 4, isAvailable: true },
          { id: 'T10', number: '10', displayName: 'Table 10', capacity: 2, isAvailable: true }
        ],
        defaultGuests: 2,
        minGuests: 1,
        maxGuests: 20
      },
      takeoutConfig: {
        enabled: true,
        showScheduledPickup: false, // Disabled for now
        defaultPickupTime: 30,
        pickupMessage: 'Your order will be ready for pickup in approximately 30 minutes.'
      },
      deliveryConfig: {
        enabled: true,
        showAddressSelection: true
      },
      messages: this.getDefaultMessages(),
      defaultOrderType: 'delivery',
      updatedAt: new Date()
    };
  }

  /**
   * Get default messages
   */
  private getDefaultMessages(): OrderTypeMessages {
    return {
      dineIn: {
        success: 'Your dine-in order has been placed successfully! Please proceed to your table.',
        error: 'Failed to place dine-in order. Please try again.',
        tableRequired: 'Please select a table number',
        guestsRequired: 'Please specify the number of guests',
        tableUnavailable: 'Selected table is currently unavailable. Please choose another table.'
      },
      takeout: {
        success: 'Your takeout order has been placed! We\'ll notify you when it\'s ready for pickup.',
        error: 'Failed to place takeout order. Please try again.',
        pickupTimeRequired: 'Please select a pickup time',
        pickupMessage: 'Your order will be ready for pickup in approximately 30 minutes.'
      },
      delivery: {
        success: 'Your delivery order has been placed successfully! We\'ll deliver it to your address.',
        error: 'Failed to place delivery order. Please try again.',
        addressRequired: 'Please select a delivery address',
        outOfRange: 'Sorry, we don\'t deliver to this address at the moment.'
      },
      general: {
        orderTypeRequired: 'Please select an order type (Dine-in, Takeout, or Delivery)',
        orderPlaced: 'Order placed successfully!',
        orderFailed: 'Failed to place order. Please try again.',
        orderCancelled: 'Order has been cancelled successfully',
        orderConfirmed: 'Your order has been confirmed!'
      }
    };
  }



  /**
   * Load configuration from Firestore
   * Path: /appSettings/restaurantDetails/onlineorders/orderType
   */
  async loadConfiguration(): Promise<OrderConfiguration> {
    try {
      const pathParts = this.FIREBASE_PATH.split('/');
      const docPath = `${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
      const docRef = doc(this.db, docPath);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const config: OrderConfiguration = {
          restaurantId: data['restaurantId'] || '1001',
          orderTypes: data['orderTypes'] || this.getDefaultConfiguration().orderTypes,
          dineInConfig: data['dineInConfig'] || this.getDefaultConfiguration().dineInConfig,
          takeoutConfig: data['takeoutConfig'] || this.getDefaultConfiguration().takeoutConfig,
          deliveryConfig: data['deliveryConfig'] || this.getDefaultConfiguration().deliveryConfig,
          messages: data['messages'] || this.getDefaultMessages(),
          defaultOrderType: data['defaultOrderType'] || 'delivery',
          updatedAt: data['updatedAt']?.toDate() || new Date()
        };
        
        this.configSubject.next(config);
        console.log('✅ Order configuration loaded from:', this.FIREBASE_PATH);
        return config;
      } else {
        console.warn('⚠️ No order configuration found. Using default configuration.');
        console.log('💡 Run setupDefaultConfiguration() to create the configuration in Firebase.');
        const defaultConfig = this.getDefaultConfiguration();
        this.configSubject.next(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('❌ Error loading order configuration:', error);
      const defaultConfig = this.getDefaultConfiguration();
      this.configSubject.next(defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * Save configuration to Firestore
   */
  async saveConfiguration(config: OrderConfiguration): Promise<void> {
    try {
      const pathParts = this.FIREBASE_PATH.split('/');
      const docPath = `${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
      const docRef = doc(this.db, docPath);
      
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date()
      });
      
      this.configSubject.next(config);
      console.log('✅ Order configuration saved to:', this.FIREBASE_PATH);
    } catch (error) {
      console.error('❌ Error saving order configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration synchronously
   */
  getConfiguration(): OrderConfiguration {
    return this.configSubject.value || this.getDefaultConfiguration();
  }

  /**
   * Check if an order type is enabled
   */
  isOrderTypeEnabled(orderType: 'dine-in' | 'takeout' | 'delivery'): boolean {
    const config = this.getConfiguration();
    
    switch (orderType) {
      case 'dine-in':
        return config.orderTypes.dineIn.enabled;
      case 'takeout':
        return config.orderTypes.takeout.enabled;
      case 'delivery':
        return config.orderTypes.delivery.enabled;
      default:
        return false;
    }
  }

  /**
   * Get available order types
   */
  getAvailableOrderTypes(): Array<'dine-in' | 'takeout' | 'delivery'> {
    const config = this.getConfiguration();
    const availableTypes: Array<'dine-in' | 'takeout' | 'delivery'> = [];

    if (config.orderTypes.dineIn.enabled) availableTypes.push('dine-in');
    if (config.orderTypes.takeout.enabled) availableTypes.push('takeout');
    if (config.orderTypes.delivery.enabled) availableTypes.push('delivery');

    // If no types are enabled, enable delivery by default
    if (availableTypes.length === 0) {
      console.warn('⚠️ No order types enabled. Defaulting to delivery.');
      availableTypes.push('delivery');
    }

    return availableTypes;
  }

  /**
   * Get available tables
   */
  getAvailableTables() {
    const config = this.getConfiguration();
    return config.dineInConfig.tables.filter(table => table.isAvailable);
  }

  /**
   * Get all tables (including unavailable)
   */
  getAllTables() {
    const config = this.getConfiguration();
    return config.dineInConfig.tables;
  }

  /**
   * Get message for specific scenario
   */
  getMessage(category: keyof OrderTypeMessages, key: string): string {
    const config = this.getConfiguration();
    const messages = config.messages[category] as any;
    return messages?.[key] || '';
  }

  /**
   * Update table availability
   */
  async updateTableAvailability(tableId: string, isAvailable: boolean): Promise<void> {
    const config = this.getConfiguration();
    const tableIndex = config.dineInConfig.tables.findIndex(t => t.id === tableId);
    
    if (tableIndex !== -1) {
      config.dineInConfig.tables[tableIndex].isAvailable = isAvailable;
      await this.saveConfiguration(config);
      console.log(`✅ Table ${tableId} availability updated to: ${isAvailable}`);
    } else {
      console.warn(`⚠️ Table ${tableId} not found`);
    }
  }

  /**
   * Get order type display name
   */
  getOrderTypeDisplayName(orderType: 'dine-in' | 'takeout' | 'delivery'): string {
    const config = this.getConfiguration();
    
    switch (orderType) {
      case 'dine-in':
        return config.orderTypes.dineIn.displayName;
      case 'takeout':
        return config.orderTypes.takeout.displayName;
      case 'delivery':
        return config.orderTypes.delivery.displayName;
      default:
        return orderType;
    }
  }

  /**
   * Get order type icon
   */
  getOrderTypeIcon(orderType: 'dine-in' | 'takeout' | 'delivery'): string {
    const config = this.getConfiguration();
    
    switch (orderType) {
      case 'dine-in':
        return config.orderTypes.dineIn.icon;
      case 'takeout':
        return config.orderTypes.takeout.icon;
      case 'delivery':
        return config.orderTypes.delivery.icon;
      default:
        return 'help_outline';
    }
  }

  /**
   * Check if dine-in details should be shown
   */
  shouldShowDineInDetails(): boolean {
    const config = this.getConfiguration();
    return config.dineInConfig.enabled && config.dineInConfig.showDetails;
  }

  /**
   * Check if takeout scheduled pickup should be shown
   */
  shouldShowTakeoutScheduledPickup(): boolean {
    const config = this.getConfiguration();
    return config.takeoutConfig.enabled && config.takeoutConfig.showScheduledPickup;
  }
}
