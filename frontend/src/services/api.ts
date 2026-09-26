import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  ApiError,
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
  AuditLog,
  DashboardStats,
  User,
  
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
  api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  delete api.defaults.headers.common['Authorization'];
};

export const initializeAuth = () => {
  const storedAccess = localStorage.getItem('accessToken');
  const storedRefresh = localStorage.getItem('refreshToken');
  if (storedAccess && storedRefresh) {
    accessToken = storedAccess;
    refreshToken = storedRefresh;
    api.defaults.headers.common['Authorization'] = `Bearer ${storedAccess}`;
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
        setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const unwrap = <T>(promise: Promise<{ data: T }>): Promise<T> => promise.then((res) => res.data);

export const authApi = {
  login: (credentials: { dni: string }) =>
    unwrap(api.post<AuthResponse>('/auth/login', credentials)),
  loginWithFace: (credentials: { dni?: string }) =>
    unwrap(api.post<AuthResponse>('/auth/login/face', credentials)),
  register: (credentials: { dni: string; name: string }) =>
    unwrap(api.post<AuthResponse>('/auth/register', credentials)),
  logout: () => unwrap(api.post<void>('/auth/logout')),
  me: () => unwrap(api.get<User>('/auth/me')),
  refresh: (token: string) => unwrap(api.post<AuthResponse>('/auth/refresh', { refreshToken: token })),
};

export const companiesApi = {
  list: () => unwrap(api.get<Company[]>('/companies')),
  get: (id: string) => unwrap(api.get<Company>(`/companies/${id}`)),
  create: (data: Partial<Company>) => unwrap(api.post<Company>('/companies', data)),
  update: (id: string, data: Partial<Company>) => unwrap(api.put<Company>(`/companies/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/companies/${id}`)),
};

export const branchesApi = {
  list: (companyId: string) => unwrap(api.get<Branch[]>(`/companies/${companyId}/branches`)),
  get: (id: string) => unwrap(api.get<Branch>(`/branches/${id}`)),
  create: (companyId: string, data: Partial<Branch>) =>
    unwrap(api.post<Branch>(`/companies/${companyId}/branches`, data)),
  update: (id: string, data: Partial<Branch>) => unwrap(api.put<Branch>(`/branches/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/branches/${id}`)),
};

export const productsApi = {
  list: (companyId: string, params?: { categoryId?: string; isActive?: boolean }) =>
    unwrap(api.get<Product[]>(`/companies/${companyId}/products`, { params })),
  get: (id: string) => unwrap(api.get<Product>(`/products/${id}`)),
  create: (companyId: string, data: Partial<Product>) =>
    unwrap(api.post<Product>(`/companies/${companyId}/products`, data)),
  update: (id: string, data: Partial<Product>) => unwrap(api.put<Product>(`/products/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/products/${id}`)),
};

export const categoriesApi = {
  list: (companyId: string) => unwrap(api.get<Category[]>(`/companies/${companyId}/categories`)),
  get: (id: string) => unwrap(api.get<Category>(`/categories/${id}`)),
  create: (companyId: string, data: Partial<Category>) =>
    unwrap(api.post<Category>(`/companies/${companyId}/categories`, data)),
  update: (id: string, data: Partial<Category>) => unwrap(api.put<Category>(`/categories/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/categories/${id}`)),
};

export const salesApi = {
  list: (companyId: string, params?: { branchId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    unwrap(api.get<{ data: Sale[]; total: number }>(`/companies/${companyId}/sales`, { params })),
  get: (id: string) => unwrap(api.get<Sale>(`/sales/${id}`)),
  create: (companyId: string, data: Partial<Sale>) =>
    unwrap(api.post<Sale>(`/companies/${companyId}/sales`, data)),
  update: (id: string, data: Partial<Sale>) => unwrap(api.put<Sale>(`/sales/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/sales/${id}`)),
};

export const inventoryApi = {
  list: (companyId: string, params?: { branchId?: string; productId?: string }) =>
    unwrap(api.get<InventoryMovement[]>(`/companies/${companyId}/inventory/movements`, { params })),
  getStock: (companyId: string, branchId: string) =>
    unwrap(api.get<Record<string, number>>(`/companies/${companyId}/branches/${branchId}/inventory/stock`)),
  createMovement: (companyId: string, data: Partial<InventoryMovement>) =>
    unwrap(api.post<InventoryMovement>(`/companies/${companyId}/inventory/movements`, data)),
};

export const targetsApi = {
  list: (companyId: string) => unwrap(api.get<Target[]>(`/companies/${companyId}/targets`)),
  get: (id: string) => unwrap(api.get<Target>(`/targets/${id}`)),
  create: (companyId: string, data: Partial<Target>) =>
    unwrap(api.post<Target>(`/companies/${companyId}/targets`, data)),
  update: (id: string, data: Partial<Target>) => unwrap(api.put<Target>(`/targets/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/targets/${id}`)),
};

export const vectorsApi = {
  list: (companyId: string) => unwrap(api.get<Vector[]>(`/companies/${companyId}/vectors`)),
  get: (id: string) => unwrap(api.get<Vector>(`/vectors/${id}`)),
  create: (companyId: string, data: Partial<Vector>) =>
    unwrap(api.post<Vector>(`/companies/${companyId}/vectors`, data)),
  update: (id: string, data: Partial<Vector>) => unwrap(api.put<Vector>(`/vectors/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/vectors/${id}`)),
};

export const matricesApi = {
  list: (companyId: string) => unwrap(api.get<Matrix[]>(`/companies/${companyId}/matrices`)),
  get: (id: string) => unwrap(api.get<Matrix>(`/matrices/${id}`)),
  create: (companyId: string, data: Partial<Matrix>) =>
    unwrap(api.post<Matrix>(`/companies/${companyId}/matrices`, data)),
  update: (id: string, data: Partial<Matrix>) => unwrap(api.put<Matrix>(`/matrices/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/matrices/${id}`)),
};

export const operationsApi = {
  list: (companyId: string, params?: { page?: number; pageSize?: number }) =>
    unwrap(api.get<{ data: Operation[]; total: number }>(`/companies/${companyId}/operations`, { params })),
  get: (id: string) => unwrap(api.get<Operation>(`/operations/${id}`)),
  execute: (companyId: string, data: {
    type: OperationType;
    name: string;
    description?: string;
    inputVectorIds: string[];
    inputMatrixIds: string[];
    parameters: Record<string, unknown>;
  }) => unwrap(api.post<Operation>(`/companies/${companyId}/operations`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/operations/${id}`)),
};

export const reportsApi = {
  getDashboard: (companyId: string) => unwrap(api.get<DashboardStats>(`/companies/${companyId}/reports/dashboard`)),
  getSalesByBranch: (companyId: string, params?: { startDate?: string; endDate?: string }) =>
    unwrap(api.get<Array<{ branch: Branch; revenue: number; quantity: number }>>(
      `/companies/${companyId}/reports/sales-by-branch`,
      { params }
    )),
  getSalesByProduct: (companyId: string, params?: { startDate?: string; endDate?: string }) =>
    unwrap(api.get<Array<{ product: Product; revenue: number; quantity: number }>>(
      `/companies/${companyId}/reports/sales-by-product`,
      { params }
    )),
  getTargetCompliance: (companyId: string, params?: { startDate?: string; endDate?: string }) =>
    unwrap(api.get<Array<{ target: Target; compliance: number }>>(
      `/companies/${companyId}/reports/target-compliance`,
      { params }
    )),
  getInventoryRotation: (companyId: string, params?: { branchId?: string }) =>
    unwrap(api.get<Array<{ product: Product; rotation: number; daysOfStock: number }>>(
      `/companies/${companyId}/reports/inventory-rotation`,
      { params }
    )),
  getOperationResults: (companyId: string) => unwrap(api.get<Operation[]>(`/companies/${companyId}/reports/operations`)),
};

export const usersApi = {
  list: (companyId: string) => unwrap(api.get<User[]>(`/companies/${companyId}/users`)),
  get: (id: string) => unwrap(api.get<User>(`/users/${id}`)),
  create: (companyId: string, data: Partial<User> & { password: string }) =>
    unwrap(api.post<User>(`/companies/${companyId}/users`, data)),
  update: (id: string, data: Partial<User>) => unwrap(api.put<User>(`/users/${id}`, data)),
  delete: (id: string) => unwrap(api.delete<void>(`/users/${id}`)),
};

export const auditApi = {
  list: (companyId: string, params?: { userId?: string; module?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    unwrap(api.get<{ data: AuditLog[]; total: number }>(`/companies/${companyId}/audit`, { params })),
};
