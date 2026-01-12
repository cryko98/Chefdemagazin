export type Language = 'RO' | 'HU';

// Changed to string to allow custom inputs as requested
export type OrderMethod = string;

export type Unit = 'pcs' | 'kg' | 'box';

export interface Supplier {
  id: string;
  name: string;
  contact: string; // Email or Phone number
  orderMethod: OrderMethod;
  orderDay: string;
  deliveryDay: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  supplierId: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  supplierId: string;
  isAdHoc: boolean; // True if manually typed, false if from inventory
}

export interface WishlistItem {
  id: string;
  name: string;
  addedDate: string;
  notes?: string;
}

export interface Translation {
  dashboard: string;
  inventory: string;
  suppliers: string;
  orders: string;
  wishlist: string;
  advisor: string;
  scanner: string;
  
  // Dashboard
  totalSuppliers: string;
  productsListed: string;
  activeOrders: string;
  wishlistItems: string;
  welcome: string;
  
  // Actions
  add: string;
  save: string;
  delete: string;
  cancel: string;
  edit: string;
  addToOrder: string;
  generateOrder: string;
  
  // Form Labels
  name: string;
  contact: string;
  method: string;
  customMethod: string;
  orderDay: string;
  deliveryDay: string;
  category: string;
  stock: string;
  price: string;
  quantity: string;
  unit: string;
  supplier: string;
  notes: string;
  
  // Units
  units: {
    pcs: string;
    kg: string;
    box: string;
  };

  // Sections
  addProduct: string;
  addSupplier: string;
  addWishlist: string;
  orderList: string;
  selectSupplier: string;
  
  // AI
  askAi: string;
  aiPlaceholder: string;
  loading: string;
  emailPreview: string;
  send: string;
  close: string;
  
  // Scanner
  startScan: string;
  stopScan: string;
  scannedCodes: string;
  copy: string;
  cameraError: string;
  
  // General
  role: string;
  language: string;
  noData: string;
  confirmDelete: string;
  other: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}