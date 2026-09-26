import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type {
  Company,
  Branch,
  Category,
  Product,
  Sale,
  InventoryMovement,
  Target,
  Vector,
  Matrix,
  Operation,
  OperationType,
  User,
  DashboardStats,
  AuditLog,
  AppNotification,
  NotificationInput,
} from '../types';
import { authApi, companiesApi, branchesApi, productsApi, categoriesApi, salesApi, inventoryApi, targetsApi, vectorsApi, matricesApi, operationsApi, reportsApi, usersApi, auditApi, notificationsApi } from '../services/api';
import { mockAuth, mockCompaniesApi, mockBranchesApi, mockProductsApi, mockCategoriesApi, mockSalesApi, mockInventoryApi, mockTargetsApi, mockVectorsApi, mockMatricesApi, mockOperationsApi, mockReportsApi, mockUsersApi, mockAuditApi, mockNotificationsApi } from '../services/mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const getApi = () => USE_MOCK ? {
  auth: mockAuth,
  companies: mockCompaniesApi,
  branches: mockBranchesApi,
  products: mockProductsApi,
  categories: mockCategoriesApi,
  sales: mockSalesApi,
  inventory: mockInventoryApi,
  targets: mockTargetsApi,
  vectors: mockVectorsApi,
  matrices: mockMatricesApi,
  operations: mockOperationsApi,
  reports: mockReportsApi,
  users: mockUsersApi,
  audit: mockAuditApi,
  notifications: mockNotificationsApi,
} : {
  auth: authApi,
  companies: companiesApi,
  branches: branchesApi,
  products: productsApi,
  categories: categoriesApi,
  sales: salesApi,
  inventory: inventoryApi,
  targets: targetsApi,
  vectors: vectorsApi,
  matrices: matricesApi,
  operations: operationsApi,
  reports: reportsApi,
  users: usersApi,
  audit: auditApi,
  notifications: notificationsApi,
};

export const useAuth = () => {
  const api = getApi();
  return {
    login: (credentials: { dni: string }) => api.auth.login(credentials),
    loginWithFace: (credentials: { dni?: string }) => api.auth.loginWithFace(credentials),
    register: (credentials: { dni: string; name: string }) => api.auth.register(credentials),
    me: () => api.auth.me(),
  };
};

export function useCompanies(options?: UseQueryOptions<Company[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['companies'], queryFn: api.companies.list, ...options });
}

export function useCompany(id: string, options?: UseQueryOptions<Company>) {
  const api = getApi();
  return useQuery({ queryKey: ['companies', id], queryFn: () => api.companies.get(id), enabled: !!id, ...options });
}

export function useBranches(companyId: string, options?: UseQueryOptions<Branch[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['branches', companyId], queryFn: () => api.branches.list(companyId), enabled: !!companyId, ...options });
}

export function useBranch(id: string, options?: UseQueryOptions<Branch>) {
  const api = getApi();
  return useQuery({ queryKey: ['branches', id], queryFn: () => api.branches.get(id), enabled: !!id, ...options });
}

export function useProducts(companyId: string, params?: { categoryId?: string; isActive?: boolean }, options?: UseQueryOptions<Product[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['products', companyId, params], queryFn: () => api.products.list(companyId, params), enabled: !!companyId, ...options });
}

export function useProduct(id: string, options?: UseQueryOptions<Product>) {
  const api = getApi();
  return useQuery({ queryKey: ['products', id], queryFn: () => api.products.get(id), enabled: !!id, ...options });
}

export function useSales(companyId: string, params?: { branchId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }, options?: UseQueryOptions<{ data: Sale[]; total: number }>) {
  const api = getApi();
  return useQuery({ queryKey: ['sales', companyId, params], queryFn: () => api.sales.list(companyId, params), enabled: !!companyId, ...options });
}

export function useSale(id: string, options?: UseQueryOptions<Sale>) {
  const api = getApi();
  return useQuery({ queryKey: ['sales', id], queryFn: () => api.sales.get(id), enabled: !!id, ...options });
}

export function useInventoryMovements(companyId: string, params?: { branchId?: string; productId?: string }, options?: UseQueryOptions<InventoryMovement[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['inventory', 'movements', companyId, params], queryFn: () => api.inventory.list(companyId, params), enabled: !!companyId, ...options });
}

export function useInventoryStock(companyId: string, branchId: string, options?: UseQueryOptions<Record<string, number>>) {
  const api = getApi();
  return useQuery({ queryKey: ['inventory', 'stock', companyId, branchId], queryFn: () => api.inventory.getStock(companyId, branchId), enabled: !!companyId && !!branchId, ...options });
}

export function useTargets(companyId: string, options?: UseQueryOptions<Target[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['targets', companyId], queryFn: () => api.targets.list(companyId), enabled: !!companyId, ...options });
}

export function useVectors(companyId: string, options?: UseQueryOptions<Vector[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['vectors', companyId], queryFn: () => api.vectors.list(companyId), enabled: !!companyId, ...options });
}

export function useVector(id: string, options?: UseQueryOptions<Vector>) {
  const api = getApi();
  return useQuery({ queryKey: ['vectors', id], queryFn: () => api.vectors.get(id), enabled: !!id, ...options });
}

export function useMatrices(companyId: string, options?: UseQueryOptions<Matrix[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['matrices', companyId], queryFn: () => api.matrices.list(companyId), enabled: !!companyId, ...options });
}

export function useMatrix(id: string, options?: UseQueryOptions<Matrix>) {
  const api = getApi();
  return useQuery({ queryKey: ['matrices', id], queryFn: () => api.matrices.get(id), enabled: !!id, ...options });
}

export function useOperations(companyId: string, params?: { page?: number; pageSize?: number }, options?: UseQueryOptions<{ data: Operation[]; total: number }>) {
  const api = getApi();
  return useQuery({ queryKey: ['operations', companyId, params], queryFn: () => api.operations.list(companyId, params), enabled: !!companyId, ...options });
}

export function useOperation(id: string, options?: UseQueryOptions<Operation>) {
  const api = getApi();
  return useQuery({ queryKey: ['operations', id], queryFn: () => api.operations.get(id), enabled: !!id, ...options });
}

export function useExecuteOperation(companyId: string, options?: UseMutationOptions<Operation, Error, { type: OperationType; name: string; description?: string; inputVectorIds: string[]; inputMatrixIds: string[]; parameters: Record<string, unknown> }>) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.operations.execute(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vectors', companyId] });
      queryClient.invalidateQueries({ queryKey: ['matrices', companyId] });
    },
    ...options,
  });
}

export function useDashboardStats(companyId: string, options?: UseQueryOptions<DashboardStats>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'dashboard', companyId], queryFn: () => api.reports.getDashboard(companyId), enabled: !!companyId, ...options });
}

export function useSalesByBranch(companyId: string, params?: { startDate?: string; endDate?: string }, options?: UseQueryOptions<Array<{ branch: Branch; revenue: number; quantity: number }>>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'sales-by-branch', companyId, params], queryFn: () => api.reports.getSalesByBranch(companyId, params), enabled: !!companyId, ...options });
}

export function useSalesByProduct(companyId: string, params?: { startDate?: string; endDate?: string }, options?: UseQueryOptions<Array<{ product: Product; revenue: number; quantity: number }>>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'sales-by-product', companyId, params], queryFn: () => api.reports.getSalesByProduct(companyId, params), enabled: !!companyId, ...options });
}

export function useTargetCompliance(companyId: string, params?: { startDate?: string; endDate?: string }, options?: UseQueryOptions<Array<{ target: Target; compliance: number }>>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'target-compliance', companyId, params], queryFn: () => api.reports.getTargetCompliance(companyId, params), enabled: !!companyId, ...options });
}

export function useInventoryRotation(companyId: string, params?: { branchId?: string }, options?: UseQueryOptions<Array<{ product: Product; rotation: number; daysOfStock: number }>>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'inventory-rotation', companyId, params], queryFn: () => api.reports.getInventoryRotation(companyId, params), enabled: !!companyId, ...options });
}

export function useOperationResults(companyId: string, options?: UseQueryOptions<Operation[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['reports', 'operations', companyId], queryFn: () => api.reports.getOperationResults(companyId), enabled: !!companyId, ...options });
}

export function useUsers(companyId: string, options?: UseQueryOptions<User[]>) {
  const api = getApi();
  return useQuery({ queryKey: ['users', companyId], queryFn: () => api.users.list(companyId), enabled: !!companyId, ...options });
}

export function useCreateUser(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User> & { password: string }) => api.users.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', companyId] }),
  });
}

export function useUpdateUser(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> & { password?: string } }) => api.users.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', companyId] }),
  });
}

export function useDeleteUser(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', companyId] }),
  });
}

export type SalePayload = Omit<Partial<Sale>, 'details'> & {
  details?: Array<{
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    subtotal?: number;
  }>;
};

export function useCreateSale(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SalePayload) => api.sales.create(companyId, data as Partial<Sale>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', companyId] }),
  });
}

export function useUpdateSale(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalePayload }) => api.sales.update(id, data as Partial<Sale>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', companyId] }),
  });
}

export function useDeleteSale(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', companyId] }),
  });
}

export function useCreateMovement(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InventoryMovement>) => api.inventory.createMovement(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', companyId] }),
  });
}

export function useCreateTarget(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Target>) => api.targets.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['targets', companyId] }),
  });
}

export function useUpdateTarget(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Target> }) => api.targets.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['targets', companyId] }),
  });
}

export function useDeleteTarget(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.targets.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['targets', companyId] }),
  });
}

export function useCategories(companyId: string) {
  const api = getApi();
  return useQuery({ queryKey: ['categories', companyId], queryFn: () => api.categories.list(companyId), enabled: !!companyId });
}

export function useCreateCategory(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) => api.categories.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', companyId] }),
  });
}

export function useUpdateCategory(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => api.categories.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', companyId] }),
  });
}

export function useDeleteCategory(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', companyId] }),
  });
}

export function useAuditLogs(companyId: string, params?: { userId?: string; module?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }, options?: UseQueryOptions<{ data: AuditLog[]; total: number }>) {
  const api = getApi();
  return useQuery({ queryKey: ['audit', companyId, params], queryFn: () => api.audit.list(companyId, params), enabled: !!companyId, ...options });
}

export function useCreateVector(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vector>) => api.vectors.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vectors', companyId] }),
  });
}

export function useUpdateVector() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vector> }) => api.vectors.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vectors', id] });
      queryClient.invalidateQueries({ queryKey: ['vectors'] });
    },
  });
}

export function useDeleteVector() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.vectors.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vectors'] }),
  });
}

export function useCreateMatrix(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Matrix>) => api.matrices.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matrices', companyId] }),
  });
}

export function useUpdateMatrix() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Matrix> }) => api.matrices.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['matrices', id] });
      queryClient.invalidateQueries({ queryKey: ['matrices'] });
    },
  });
}

export function useDeleteMatrix() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.matrices.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matrices'] }),
  });
}

export function useCreateBranch(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Branch>) => api.branches.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches', companyId] }),
  });
}

export function useUpdateBranch() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Branch> }) => api.branches.update(id, data),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['branches', id] }),
  });
}

export function useDeleteBranch() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.branches.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useCreateProduct(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => api.products.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', companyId] }),
  });
}

export function useUpdateProduct() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => api.products.update(id, data),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['products', id] }),
  });
}

export function useDeleteProduct() {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

const NOTIF_POLL_MS = 30000;

export function useNotifications(companyId: string, options?: UseQueryOptions<AppNotification[]>) {
  const api = getApi();
  return useQuery({
    queryKey: ['notifications', companyId],
    queryFn: () => api.notifications.list(companyId),
    refetchInterval: NOTIF_POLL_MS,
    ...options,
  });
}

export function useNotificationActions(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
  return {
    read: (id: string) => api.notifications.read(id).then(r => { invalidate(); return r; }),
    dismiss: (id: string) => api.notifications.dismiss(id).then(r => { invalidate(); return r; }),
    readAll: () => api.notifications.readAll(companyId).then(r => { invalidate(); return r; }),
    create: (data: NotificationInput) => api.notifications.create(companyId, data).then(r => { invalidate(); return r; }),
  };
}

const readNotifPrefs = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem('mf_notifications') || '{}'); } catch { return {}; }
};

export function useNotificationSync(companyId: string) {
  const api = getApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const prefs = readNotifPrefs();
      const enabled = (key: string, fallback: boolean) => prefs[key] ?? fallback;
      const items: NotificationInput[] = [];

      if (enabled('stock_alerts', true)) {
        const products = await api.products.list(companyId);
        const low = products.filter(p => p.isActive !== false && p.stock <= p.minStock).slice(0, 8);
        for (const p of low) {
          items.push({
            type: 'stock',
            title: 'Stock bajo',
            message: `${p.name}: ${p.stock} unidades (mínimo ${p.minStock}). Revisa el inventario.`,
            link: '/inventario',
            dedupKey: `stock-${p.id}`,
          });
        }
      }

      if (enabled('target_alerts', true)) {
        const targets = await api.targets.list(companyId);
        const pending = targets.filter(t => t.targetValue > 0 && t.achievedValue < t.targetValue).slice(0, 8);
        for (const t of pending) {
          const compliance = Math.round((t.achievedValue / t.targetValue) * 100);
          items.push({
            type: 'target',
            title: 'Meta pendiente',
            message: `Meta ${t.period || t.type}: ${compliance}% de cumplimiento (S/ ${t.achievedValue.toFixed(0)} de S/ ${t.targetValue.toFixed(0)}).`,
            link: '/reportes?tab=targets',
            dedupKey: `target-${t.id}`,
          });
        }
      }

      if (enabled('operation_alerts', true)) {
        const page = await api.operations.list(companyId);
        const ops = page.data || [];
        const failed = ops.filter(o => o.status === 'failed').slice(0, 5);
        for (const o of failed) {
          items.push({
            type: 'operation',
            title: 'Operación fallida',
            message: `${o.name}: ${o.errorMessage || 'error al ejecutar'}. Corrígela desde el historial.`,
            link: '/historial',
            dedupKey: `op-failed-${o.id}`,
          });
        }
        const last = ops[0];
        if (last) {
          items.push({
            type: 'operation',
            title: 'Nueva operación registrada',
            message: `${last.name} — ${last.status === 'completed' ? 'completada' : last.status}.`,
            link: '/historial',
            dedupKey: `op-last-${last.id}`,
          });
        }
      }

      let created = 0;
      for (const item of items) {
        try {
          await api.notifications.create(companyId, item);
          created++;
        } catch {
          // una notificación que falla no debe romper la sincronía
        }
      }
      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', companyId] }),
  });
}