import type {
  User,
  Company,
  Branch,
  Product,
  Sale,
  InventoryMovement,
  Target,
  Vector,
  Matrix,
  Operation,
  DashboardStats,
  AuditLog,
  Role
} from '../types';

const MOCK_DELAY = 300;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockUser: User = {
  id: '1',
  email: 'admin@matrixflow.local',
  name: 'Administrador MatrixFlow',
  dni: '12345678',
  role: 'admin',
  companyId: '1',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

export const mockCompany: Company = {
  id: '1',
  name: '',
  legalName: '',
  taxId: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-01-10T10:00:00Z',
};

export const mockBranches: Branch[] = [];

export const mockProducts: Product[] = [];

export const mockSales: Sale[] = [];

export const mockInventoryMovements: InventoryMovement[] = [];

export const mockTargets: Target[] = [];

export const mockVectors: Vector[] = [];

export const mockMatrices: Matrix[] = [];

export const mockOperations: Operation[] = [];

export const mockDashboardStats: DashboardStats = {
  totalSales: 0,
  totalRevenue: 0,
  totalProducts: 0,
  lowStockProducts: 0,
  topSellingProducts: [],
  salesByBranch: [],
  recentSales: [],
  recentMovements: [],
};

export const mockAuditLogs: AuditLog[] = [];

const REGISTERED_KEY = 'mf_registered_users';

type RegisteredUser = { dni: string; name: string; role: Role };

export const DEMO_USERS: Array<{ dni: string; name: string; role: Role }> = [
  { dni: '12345678', name: 'Administrador MatrixFlow', role: 'admin' },
  { dni: '22222222', name: 'Carmen Salazar', role: 'manager' },
  { dni: '33333333', name: 'Diego Quispe', role: 'analyst' },
  { dni: '44444444', name: 'Lucía Huamán', role: 'operator' },
];

const readRegistered = (): RegisteredUser[] => {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_KEY) || '[]') as RegisteredUser[];
  } catch {
    return [];
  }
};

const writeRegistered = (users: RegisteredUser[]) => {
  localStorage.setItem(REGISTERED_KEY, JSON.stringify(users));
};

const isValidDni = (dni: string) => /^\d{8}$/.test(dni);

const findDemoUser = (dni: string) => DEMO_USERS.find(user => user.dni === dni);

const buildSession = (dni: string, name: string, role: Role) => ({
  user: { ...mockUser, id: dni, dni, name, email: `${dni}@matrixflow.local`, role },
  accessToken: `mock-access-${dni}`,
  refreshToken: `mock-refresh-${dni}`,
});

const sessionFor = (dni: string, name: string, role: Role) => buildSession(dni, name, role);

export const mockAuth = {
  login: async (credentials: { dni: string }) => {
    await delay(MOCK_DELAY);
    const dni = (credentials.dni || '').trim();
    if (!isValidDni(dni)) throw new Error('El DNI debe tener exactamente 8 dígitos');
    const demo = findDemoUser(dni);
    if (demo) return sessionFor(demo.dni, demo.name, demo.role);
    const registered = readRegistered().find(u => u.dni === dni);
    if (registered) return sessionFor(dni, registered.name, registered.role);
    throw new Error('DNI no registrado. Crea tu cuenta en la pestaña Registro.');
  },
  loginWithFace: async (credentials: { dni?: string } = {}) => {
    const dni = (credentials.dni || '').trim();
    if (!dni) {
      await delay(MOCK_DELAY);
      const admin = DEMO_USERS[0];
      return sessionFor(admin.dni, admin.name, admin.role);
    }
    return mockAuth.login({ dni });
  },
  register: async (credentials: { dni: string; name: string }) => {
    await delay(MOCK_DELAY);
    const dni = (credentials.dni || '').trim();
    const name = (credentials.name || '').trim();
    if (!isValidDni(dni)) throw new Error('El DNI debe tener exactamente 8 dígitos');
    if (name.length < 3) throw new Error('Ingresa tu nombre completo');
    if (findDemoUser(dni)) throw new Error('Este DNI ya tiene una cuenta de demostración');
    const registered = readRegistered();
    if (registered.some(u => u.dni === dni)) {
      throw new Error('Este DNI ya tiene una cuenta registrada');
    }
    writeRegistered([...registered, { dni, name, role: 'operator' }]);
    return sessionFor(dni, name, 'operator');
  },
  me: async () => {
    await delay(MOCK_DELAY);
    const token = localStorage.getItem('accessToken') || '';
    const dni = token.startsWith('mock-access-') ? token.slice('mock-access-'.length) : '';
    const demo = dni ? findDemoUser(dni) : undefined;
    if (demo) return { ...mockUser, id: dni, dni, name: demo.name, email: `${dni}@matrixflow.local`, role: demo.role };
    if (dni) {
      const registered = readRegistered().find(u => u.dni === dni);
      if (registered) {
        return { ...mockUser, id: dni, dni, name: registered.name, email: `${dni}@matrixflow.local`, role: registered.role };
      }
    }
    return mockUser;
  },
};

export const mockCompaniesApi = {
  list: async () => { await delay(MOCK_DELAY); return [mockCompany]; },
  get: async (_id: string) => { await delay(MOCK_DELAY); return mockCompany; },
};

export const mockBranchesApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockBranches; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockBranches.find(b => b.id === id)!; },
  create: async (companyId: string, data: Partial<Branch>) => {
    await delay(MOCK_DELAY);
    const branch: Branch = {
      id: String(Date.now()), companyId,
      name: data.name || 'Nueva Sede', code: data.code || 'NEW01',
      address: data.address || '', city: data.city || '', country: data.country || '',
      phone: data.phone || '', email: data.email || '', isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockBranches.push(branch);
    return branch;
  },
  update: async (id: string, data: Partial<Branch>) => {
    await delay(MOCK_DELAY);
    const index = mockBranches.findIndex(b => b.id === id);
    const updated = { ...mockBranches[index], ...data, updatedAt: new Date().toISOString() } as Branch;
    mockBranches[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockBranches.findIndex(b => b.id === id);
    if (index >= 0) mockBranches.splice(index, 1);
  },
};

export const mockProductsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockProducts; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockProducts.find(p => p.id === id)!; },
  create: async (companyId: string, data: Partial<Product>) => {
    await delay(MOCK_DELAY);
    const product: Product = {
      id: String(Date.now()), companyId, categoryId: data.categoryId || '1',
      sku: data.sku || 'SKU001', name: data.name || 'Nuevo Producto',
      description: data.description || '', unitPrice: data.unitPrice || 0,
      costPrice: data.costPrice || 0, stock: data.stock || 0, minStock: data.minStock || 0,
      unit: data.unit || 'unidad', isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockProducts.push(product);
    return product;
  },
  update: async (id: string, data: Partial<Product>) => {
    await delay(MOCK_DELAY);
    const index = mockProducts.findIndex(p => p.id === id);
    const updated = { ...mockProducts[index], ...data, updatedAt: new Date().toISOString() } as Product;
    mockProducts[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index >= 0) mockProducts.splice(index, 1);
  },
};

export const mockSalesApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return { data: mockSales, total: mockSales.length }; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockSales.find(s => s.id === id)!; },
};

export const mockInventoryApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockInventoryMovements; },
  getStock: async (_companyId: string, _branchId: string) => { await delay(MOCK_DELAY); return {} as Record<string, number>; },
};

export const mockTargetsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockTargets; },
};

export const mockVectorsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockVectors; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockVectors.find(v => v.id === id)!; },
  create: async (companyId: string, data: Partial<Vector>) => {
    await delay(MOCK_DELAY);
    const values = data.values || [];
    const vector: Vector = {
      id: String(Date.now()), companyId, name: data.name || 'Nuevo Vector',
      description: data.description || '', dimension: data.dimension || values.length,
      values, source: data.source || 'manual', sourceConfig: data.sourceConfig,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockVectors.push(vector);
    return vector;
  },
  update: async (id: string, data: Partial<Vector>) => {
    await delay(MOCK_DELAY);
    const index = mockVectors.findIndex(v => v.id === id);
    const updated = { ...mockVectors[index], ...data, updatedAt: new Date().toISOString() } as Vector;
    mockVectors[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockVectors.findIndex(v => v.id === id);
    if (index >= 0) mockVectors.splice(index, 1);
  },
};

export const mockMatricesApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockMatrices; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockMatrices.find(m => m.id === id)!; },
  create: async (companyId: string, data: Partial<Matrix>) => {
    await delay(MOCK_DELAY);
    const values = data.values || [];
    const matrix: Matrix = {
      id: String(Date.now()), companyId, name: data.name || 'Nueva Matriz',
      description: data.description || '', rows: data.rows || values.length,
      cols: data.cols || (values[0]?.length ?? 0), values,
      rowLabels: data.rowLabels || Array.from({ length: values.length }, (_, i) => `Fila ${i + 1}`),
      colLabels: data.colLabels || Array.from({ length: values[0]?.length ?? 0 }, (_, i) => `Col ${i + 1}`),
      source: data.source || 'manual', sourceConfig: data.sourceConfig,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockMatrices.push(matrix);
    return matrix;
  },
  update: async (id: string, data: Partial<Matrix>) => {
    await delay(MOCK_DELAY);
    const index = mockMatrices.findIndex(m => m.id === id);
    const updated = { ...mockMatrices[index], ...data, updatedAt: new Date().toISOString() } as Matrix;
    mockMatrices[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockMatrices.findIndex(m => m.id === id);
    if (index >= 0) mockMatrices.splice(index, 1);
  },
};

export const mockOperationsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return { data: mockOperations, total: mockOperations.length }; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockOperations.find(o => o.id === id)!; },
  execute: async (companyId: string, data: any) => {
    await delay(500);
    const newOp: Operation = {
      id: String(Date.now()), companyId: '1', userId: '1', type: data.type,
      name: data.name, description: data.description || '', inputVectors: data.inputVectorIds || [],
      inputMatrices: data.inputMatrixIds || [], parameters: data.parameters || {},
      status: 'completed', executionTimeMs: Math.floor(Math.random() * 100) + 10,
      createdAt: new Date().toISOString()
    };
    mockOperations.unshift(newOp);
    return newOp;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockOperations.findIndex(o => o.id === id);
    if (index >= 0) mockOperations.splice(index, 1);
  },
};

export const mockReportsApi = {
  getDashboard: async (_companyId: string) => { await delay(MOCK_DELAY); return mockDashboardStats; },
  getSalesByBranch: async (_companyId: string) => { await delay(MOCK_DELAY); return mockDashboardStats.salesByBranch; },
  getSalesByProduct: async (_companyId: string) => { await delay(MOCK_DELAY); return mockDashboardStats.topSellingProducts; },
  getTargetCompliance: async (_companyId: string) => { await delay(MOCK_DELAY); return mockTargets.map(t => ({ target: t, compliance: (t.achievedValue / t.targetValue) * 100 })); },
  getInventoryRotation: async (_companyId: string) => { await delay(MOCK_DELAY); return mockProducts.map(p => ({ product: p, rotation: Math.random() * 12 + 2, daysOfStock: Math.floor(Math.random() * 60) + 15 })); },
  getOperationResults: async (_companyId: string) => { await delay(MOCK_DELAY); return mockOperations; },
};

export const mockUsersApi = {
  list: async (_companyId: string) => {
    await delay(MOCK_DELAY);
    const registeredUsers: User[] = readRegistered().map(r => ({
      ...mockUser,
      id: r.dni,
      dni: r.dni,
      name: r.name,
      email: `${r.dni}@matrixflow.local`,
      role: r.role,
    }));
    return registeredUsers;
  },
};

export const mockAuditApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return { data: mockAuditLogs, total: mockAuditLogs.length }; },
};