/**
 * Stores Index - Export all stores from a single location
 * This file provides a centralized export for all Zustand stores
 */

// Auth Store - handles authentication state
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useUserRole,
  useHasHydrated,
  useCanAccessOwnerInterface,
  useCanAccessAdminPanel,
} from './useAuthStore';
export type { User, UserRole } from './useAuthStore';

// Cart Store - handles shopping cart
export {
  useCartStore,
  useCartItems,
  useCartTotal,
  useCartSubtotal,
} from './useCartStore';
export type { CartItemData } from './useCartStore';

// Data Cache Store - handles offline-first data cache
export {
  useDataCacheStore,
  useSyncStatus,
  useIsOnline,
  useCarBrands,
  useCarModels,
  useProductBrands,
  useCategories,
  useProducts,
  useOrders,
} from './useDataCacheStore';
export type { SyncStatus } from './useDataCacheStore';

// Legacy App Store - for backward compatibility
// This maintains the monolithic store for existing components
export {
  useAppStore,
  useColorMood,
  COLOR_MOODS,
  NEON_NIGHT_THEME,
} from './appStore';
export type { ColorMood, Notification } from './appStore';
