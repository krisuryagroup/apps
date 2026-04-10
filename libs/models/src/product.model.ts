export interface ProductVariation {
  id: string;                // Unique ID for the variation (e.g., "small", "medium", "large")
  label: string;             // Display label (e.g., "Small", "Medium", "Large")
  price: number;             // Price for this variation
  stock?: number;            // Stock for this variation (optional)
  image?: string;            // Image specific to this variation (optional)
  isEnabled?: boolean;       // If this variation is available for order
  weight?: string;           // Weight or size description (optional)
  isDefault?: boolean;       // If this is the default variation
  // Add more fields as needed (e.g., dietaryPreferences, isSpicy, etc.)
}
export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  imageURL?: string;
  weight?: string;
  description?: string;
  category?: string; // Category ID
  categoryName?: string; // Category name for display
  isOfferDisabled?: boolean; // Flag to determine if offers are disabled for this item
  isMRPItem?: boolean; // Additional flag for MRP items like Coke
  isEnabledForOnlineOrders: boolean; // Whether this product is available for online ordering
  
  // Fields for Firebase compatibility
  status?: boolean; // Product availability status
  stock?: number; // Stock quantity
  created_at?: string; // Creation timestamp
  updated_at?: string; // Update timestamp
  popularity?: number; // Legacy popularity field
  priority?: number; // Highest values will be at the top
  isRecommended?: boolean; // Legacy recommended field
  isNew?: boolean; // Whether product is new
  isSpicy?: boolean; // Whether product is spicy
  dietaryPreferences?: string[]; // Dietary preferences
  
  // UI/Cart functionality
  qty?: number; // Quantity in cart

  // Variations support
  hasVariations?: boolean; // True if this product has variations
  variations?: ProductVariation[]; // Array of variations
  selectedVariationId?: string; // For UI/cart: which variation is selected
}

export interface CartItem extends Product {
  qty: number;
}

export interface CartItemDisplay extends CartItem {
  offerEligible: boolean;
  offerMessage?: string;
}
