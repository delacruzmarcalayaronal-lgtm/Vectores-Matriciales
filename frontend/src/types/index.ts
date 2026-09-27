export type Role = 'admin' | 'manager' | 'analyst' | 'operator';

export interface User {
  id: string;
  name: string;
  dni?: string;
  role: Role;
  avatar?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  faceRegistered?: boolean;
  facePoints?: number | null;
  faceThreshold?: number | null;
  faceRegisteredAt?: string | null;
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  city?: string;
  country?: string;
  phone: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  companyId: string;
  branchId: string;
  userId: string;
  saleNumber: string;
  date: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  details?: SaleDetail[];
}

export interface SaleDetail {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  product?: Product;
}

export interface InventoryMovement {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reference: string;
  notes?: string;
  date: string;
  createdAt: string;
  product?: Product;
  branch?: Branch;
}

export interface Target {
  id: string;
  companyId: string;
  branchId?: string;
  productId?: string;
  period: string;
  targetValue: number;
  achievedValue: number;
  type: 'sales' | 'units' | 'revenue';
  createdAt: string;
  updatedAt: string;
}

export interface Vector {
  id: string;
  companyId: string;
  name: string;
  description: string;
  dimension: number;
  values: number[];
  source: 'manual' | 'sales' | 'inventory' | 'targets';
  sourceConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Matrix {
  id: string;
  companyId: string;
  name: string;
  description: string;
  rows: number;
  cols: number;
  values: number[][];
  rowLabels: string[];
  colLabels: string[];
  source: 'manual' | 'sales' | 'inventory' | 'targets';
  sourceConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type OperationType =
  | 'vector_add'
  | 'vector_subtract'
  | 'vector_scalar_multiply'
  | 'vector_dot_product'
  | 'matrix_add'
  | 'matrix_subtract'
  | 'matrix_multiply'
  | 'matrix_transpose'
  | 'matrix_scalar_multiply'
  | 'linear_combination';

export interface Operation {
  id: string;
  companyId: string;
  userId: string;
  type: OperationType;
  name: string;
  description: string;
  inputVectors: string[];
  inputMatrices: string[];
  parameters: Record<string, unknown>;
  resultVectorId?: string;
  resultMatrixId?: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  executionTimeMs: number;
  createdAt: string;
}

export interface OperationInput {
  id: string;
  operationId: string;
  vectorId?: string;
  matrixId?: string;
  order: number;
}

export interface OperationResult {
  id: string;
  operationId: string;
  vectorId?: string;
  matrixId?: string;
  scalarValue?: number;
  metadata: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  topSellingProducts: Array<{ product: Product; quantity: number; revenue: number }>;
  salesByBranch: Array<{ branch: Branch; revenue: number; quantity: number }>;
  recentSales: Sale[];
  recentMovements: InventoryMovement[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface LoginCredentials {
  dni: string;
}

export interface RegisterCredentials {
  dni: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type NotificationType = 'stock' | 'target' | 'operation' | 'system' | 'sales' | 'security';

export interface AppNotification {
  id: string;
  companyId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  dedupKey: string;
  userId?: string | null;
}