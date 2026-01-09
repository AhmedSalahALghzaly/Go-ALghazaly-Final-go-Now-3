/**
 * Data Cache Store - Handles cached data for offline-first
 * Split from monolithic appStore for better performance
 * v2.0 - Added Offline Action Queue for robust offline support
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Offline Action Types
export type OfflineActionType = 
  | 'cart_add' 
  | 'cart_update' 
  | 'cart_clear' 
  | 'order_create' 
  | 'favorite_toggle';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
  errorMessage?: string;
}

interface DataCacheState {
  // Sync State
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  isOnline: boolean;
  syncError: string | null;

  // Offline Action Queue
  offlineActionsQueue: OfflineAction[];
  isProcessingQueue: boolean;

  // Data cache for offline-first
  carBrands: any[];
  carModels: any[];
  productBrands: any[];
  categories: any[];
  products: any[];
  suppliers: any[];
  distributors: any[];
  partners: any[];
  admins: any[];
  subscribers: any[];
  customers: any[];
  orders: any[];

  // Actions
  setOnline: (isOnline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: number) => void;

  // Offline Queue Actions
  addToOfflineQueue: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => void;
  removeFromOfflineQueue: (actionId: string) => void;
  updateQueueAction: (actionId: string, updates: Partial<OfflineAction>) => void;
  clearOfflineQueue: () => void;
  setProcessingQueue: (isProcessing: boolean) => void;
  getQueueLength: () => number;

  // Data Actions
  setCarBrands: (data: any[]) => void;
  setCarModels: (data: any[]) => void;
  setProductBrands: (data: any[]) => void;
  setCategories: (data: any[]) => void;
  setProducts: (data: any[]) => void;
  setSuppliers: (data: any[]) => void;
  setDistributors: (data: any[]) => void;
  setPartners: (data: any[]) => void;
  setAdmins: (data: any[]) => void;
  setSubscribers: (data: any[]) => void;
  setCustomers: (data: any[]) => void;
  setOrders: (data: any[]) => void;
}

// Generate unique ID for actions
const generateActionId = (): string => {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useDataCacheStore = create<DataCacheState>()(
  persist(
    (set, get) => ({
      syncStatus: 'idle',
      lastSyncTime: null,
      isOnline: true,
      syncError: null,
      
      // Offline Queue
      offlineActionsQueue: [],
      isProcessingQueue: false,

      // Data
      carBrands: [],
      carModels: [],
      productBrands: [],
      categories: [],
      products: [],
      suppliers: [],
      distributors: [],
      partners: [],
      admins: [],
      subscribers: [],
      customers: [],
      orders: [],

      setOnline: (isOnline) => set({ isOnline }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setSyncError: (error) => set({ syncError: error }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // Offline Queue Actions
      addToOfflineQueue: (action) => set((state) => ({
        offlineActionsQueue: [
          ...state.offlineActionsQueue,
          {
            ...action,
            id: generateActionId(),
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending' as const,
          },
        ],
      })),

      removeFromOfflineQueue: (actionId) => set((state) => ({
        offlineActionsQueue: state.offlineActionsQueue.filter((a) => a.id !== actionId),
      })),

      updateQueueAction: (actionId, updates) => set((state) => ({
        offlineActionsQueue: state.offlineActionsQueue.map((a) =>
          a.id === actionId ? { ...a, ...updates } : a
        ),
      })),

      clearOfflineQueue: () => set({ offlineActionsQueue: [] }),

      setProcessingQueue: (isProcessing) => set({ isProcessingQueue: isProcessing }),

      getQueueLength: () => get().offlineActionsQueue.length,

      // Data Actions
      setCarBrands: (data) => set({ carBrands: data }),
      setCarModels: (data) => set({ carModels: data }),
      setProductBrands: (data) => set({ productBrands: data }),
      setCategories: (data) => set({ categories: data }),
      setProducts: (data) => set({ products: data }),
      setSuppliers: (data) => set({ suppliers: data }),
      setDistributors: (data) => set({ distributors: data }),
      setPartners: (data) => set({ partners: data }),
      setAdmins: (data) => set({ admins: data }),
      setSubscribers: (data) => set({ subscribers: data }),
      setCustomers: (data) => set({ customers: data }),
      setOrders: (data) => set({ orders: data }),
    }),
    {
      name: 'alghazaly-data-cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Essential sync data
        lastSyncTime: state.lastSyncTime,
        offlineActionsQueue: state.offlineActionsQueue,
        
        // Essential cached data (limited size for performance)
        carBrands: state.carBrands.slice(0, 100),
        carModels: state.carModels.slice(0, 200),
        productBrands: state.productBrands.slice(0, 50),
        categories: state.categories,
        
        // Products: Only cache first 100 for offline display
        products: state.products.slice(0, 100),
        
        // Don't persist large lists - they'll be fetched fresh
        // suppliers, distributors, partners, admins, subscribers, customers, orders
      }),
    }
  )
);

// Selectors
export const useSyncStatus = () => useDataCacheStore((state) => state.syncStatus);
export const useIsOnline = () => useDataCacheStore((state) => state.isOnline);
export const useOfflineQueue = () => useDataCacheStore((state) => state.offlineActionsQueue);
export const useIsProcessingQueue = () => useDataCacheStore((state) => state.isProcessingQueue);
export const useCarBrands = () => useDataCacheStore((state) => state.carBrands);
export const useCarModels = () => useDataCacheStore((state) => state.carModels);
export const useProductBrands = () => useDataCacheStore((state) => state.productBrands);
export const useCategories = () => useDataCacheStore((state) => state.categories);
export const useProducts = () => useDataCacheStore((state) => state.products);
export const useOrders = () => useDataCacheStore((state) => state.orders);

export default useDataCacheStore;
