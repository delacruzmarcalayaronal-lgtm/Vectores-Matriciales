import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type {
  Company,
  Branch,
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
  AuditLog
} from '../types';
import { authApi, companiesApi, branchesApi, productsApi, salesApi, inventoryApi, targetsApi, vectorsApi, matricesApi, operationsApi, reportsApi, usersApi, auditApi } from '../services/api';
import { mockAuth, mockCompaniesApi, mockBranchesApi, mockProductsApi, mockSalesApi, mockInventoryApi, mockTargetsApi, mockVectorsApi, mockMatricesApi, mockOperationsApi, mockReportsApi, mockUsersApi, mockAuditApi } from '../services/mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const getApi = () => USE_MOCK ? {
  auth: mockAuth,
  companies: mockCompaniesApi,
  branches: mockBranchesApi,
  products: mockProductsApi,
  sales: mockSalesApi,
  inventory: mockInventoryApi,
  targets: mockTargetsApi,
  vectors: mockVectorsApi,
  matrices: mockMatricesApi,
  operations: mockOperationsApi,
  reports: mockReportsApi,
  users: mockUsersApi,
  audit: mockAuditApi,
} : {
  auth: authApi,
  companies: companiesApi,
  branches: branchesApi,
  products: productsApi,
  sales: salesApi,
  inventory: inventoryApi,
  targets: targetsApi,
  vectors: vectorsApi,
  matrices: matricesApi,
  operations: operationsApi,
  reports: reportsApi,
  users: usersApi,
  audit: auditApi,
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