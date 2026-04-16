// Builders (domain models — @zitro/models shapes)
export * from './builders/catalog.builders';
export * from './builders/customer.builders';
export * from './builders/restaurant.builders';
export * from './builders/order.builders';
export * from './builders/cart.builders';
export * from './builders/coupon.builders';
export * from './builders/address.builders';

// Factories (API DTOs — @zitro/mappers shapes)
export * from './factories';

// MSW handlers (use in test setup files)
export { handlers } from './msw/handlers';

// Raw fixtures (JSON data — use sparingly, prefer builders)
export { Fixtures } from './loaders/fixture-loader';
