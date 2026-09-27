import type {
  User,
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
  DashboardStats,
  AuditLog,
  Role,
  AppNotification,
  NotificationInput,
} from '../types';
import type {
  LocationRecord,
  WorkerLastLocation,
  WorkerItem,
  ConsentRecord,
  TrackingStatus,
} from './locationApi';

const MOCK_DELAY = 300;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockUser: User = {
  id: '1',
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
  { dni: '44444444', name: 'LucÃ­a HuamÃ¡n', role: 'operator' },
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

const MOCK_ME_KEY = 'mf_mock_me';

type MockMePatch = { name?: string; role?: Role; avatar?: string | null };

const readMeOverrides = (): Record<string, MockMePatch> => {
  try { return JSON.parse(localStorage.getItem(MOCK_ME_KEY) || '{}') as Record<string, MockMePatch>; } catch { return {}; }
};

const writeMeOverrides = (rows: Record<string, MockMePatch>) => localStorage.setItem(MOCK_ME_KEY, JSON.stringify(rows));

const withMeOverride = <T extends { dni?: string; id: string }>(user: T): T => {
  const patch = readMeOverrides()[user.dni || user.id];
  if (!patch) return user;
  return { ...user, ...patch, avatar: patch.avatar ?? undefined };
};

const buildSession = (dni: string, name: string, role: Role) => ({
  user: withMeOverride({ ...mockUser, id: dni, dni, name, role }),
  accessToken: `mock-access-${dni}`,
  refreshToken: `mock-refresh-${dni}`,
});

const sessionFor = (dni: string, name: string, role: Role) => buildSession(dni, name, role);

export const mockAuth = {
  login: async (credentials: { dni: string }) => {
    await delay(MOCK_DELAY);
    const dni = (credentials.dni || '').trim();
    if (!isValidDni(dni)) throw new Error('El DNI debe tener exactamente 8 dÃ­gitos');
    const demo = findDemoUser(dni);
    if (demo) return sessionFor(demo.dni, demo.name, demo.role);
    const registered = readRegistered().find(u => u.dni === dni);
    if (registered) return sessionFor(dni, registered.name, registered.role);
    throw new Error('DNI no registrado. Crea tu cuenta en la pestaÃ±a Registro.');
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
    if (!isValidDni(dni)) throw new Error('El DNI debe tener exactamente 8 dÃ­gitos');
    if (name.length < 3) throw new Error('Ingresa tu nombre completo');
    if (findDemoUser(dni)) throw new Error('Este DNI ya tiene una cuenta de demostraciÃ³n');
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
    if (demo) return withMeOverride({ ...mockUser, id: dni, dni, name: demo.name, role: demo.role });
    if (dni) {
      const registered = readRegistered().find(u => u.dni === dni);
      if (registered) {
        return withMeOverride({ ...mockUser, id: dni, dni, name: registered.name, role: registered.role });
      }
    }
    return withMeOverride(mockUser);
  },
  updateMe: async (patch: { name?: string; role?: Role; avatar?: string | null }) => {
    await delay(MOCK_DELAY);
    const current = await mockAuth.me();
    const key = current.dni || current.id;
    const overrides = readMeOverrides();
    const next: MockMePatch = { ...overrides[key] };
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.role !== undefined) next.role = patch.role;
    if ('avatar' in patch) next.avatar = patch.avatar ?? null;
    overrides[key] = next;
    writeMeOverrides(overrides);
    return withMeOverride(current);
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
      phone: data.phone || '', isActive: data.isActive ?? true,
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
  create: async (companyId: string, data: Partial<Sale>) => {
    await delay(MOCK_DELAY);
    const sale: Sale = {
      id: String(Date.now()), companyId, branchId: data.branchId || 'br1',
      saleNumber: `V-${String(mockSales.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString(), subtotal: data.subtotal || 0, tax: data.tax || 0,
      total: data.total || 0, status: data.status || 'confirmed', userId: '1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      ...(data as object),
    } as Sale;
    mockSales.push(sale);
    return sale;
  },
  update: async (id: string, data: Partial<Sale>) => {
    await delay(MOCK_DELAY);
    const index = mockSales.findIndex(s => s.id === id);
    const updated = { ...mockSales[index], ...data, updatedAt: new Date().toISOString() } as Sale;
    mockSales[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockSales.findIndex(s => s.id === id);
    if (index >= 0) mockSales.splice(index, 1);
  },
};

export const mockInventoryApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockInventoryMovements; },
  getStock: async (_companyId: string, _branchId: string) => { await delay(MOCK_DELAY); return {} as Record<string, number>; },
  createMovement: async (companyId: string, data: Partial<InventoryMovement>) => {
    await delay(MOCK_DELAY);
    const movement: InventoryMovement = {
      id: String(Date.now()), companyId, branchId: data.branchId || 'br1',
      productId: data.productId || 'p1', type: data.type || 'in',
      quantity: data.quantity || 1, reference: data.reference || '',
      date: new Date().toISOString(), notes: data.notes || '',
      createdAt: new Date().toISOString(), ...(data as object),
    } as InventoryMovement;
    mockInventoryMovements.push(movement);
    return movement;
  },
};

export const mockTargetsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockTargets; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockTargets.find(t => t.id === id)!; },
  create: async (companyId: string, data: Partial<Target>) => {
    await delay(MOCK_DELAY);
    const target: Target = {
      id: String(Date.now()), companyId, branchId: data.branchId || 'br1',
      productId: data.productId || 'p1', period: data.period || '2026-09',
      targetValue: data.targetValue || 0, achievedValue: data.achievedValue || 0,
      type: data.type || 'revenue', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), ...(data as object),
    } as Target;
    mockTargets.push(target);
    return target;
  },
  update: async (id: string, data: Partial<Target>) => {
    await delay(MOCK_DELAY);
    const index = mockTargets.findIndex(t => t.id === id);
    const updated = { ...mockTargets[index], ...data, updatedAt: new Date().toISOString() } as Target;
    mockTargets[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockTargets.findIndex(t => t.id === id);
    if (index >= 0) mockTargets.splice(index, 1);
  },
};

export const mockCategories: Category[] = [];

export const mockCategoriesApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return mockCategories; },
  get: async (id: string) => { await delay(MOCK_DELAY); return mockCategories.find(c => c.id === id)!; },
  create: async (companyId: string, data: Partial<Category>) => {
    await delay(MOCK_DELAY);
    const category: Category = {
      id: String(Date.now()), companyId, name: data.name || 'Nueva categorÃ­a',
      description: data.description || '', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCategories.push(category);
    return category;
  },
  update: async (id: string, data: Partial<Category>) => {
    await delay(MOCK_DELAY);
    const index = mockCategories.findIndex(c => c.id === id);
    const updated = { ...mockCategories[index], ...data, updatedAt: new Date().toISOString() } as Category;
    mockCategories[index] = updated;
    return updated;
  },
  delete: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockCategories.findIndex(c => c.id === id);
    if (index >= 0) mockCategories.splice(index, 1);
  },
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
      role: r.role,
    }));
    return registeredUsers;
  },
  get: async (id: string) => { await delay(MOCK_DELAY); return { ...mockUser, id, dni: id }; },
  create: async (companyId: string, data: Partial<User> & { password?: string }) => {
    await delay(MOCK_DELAY);
    const user: User = {
      ...mockUser, id: String(Date.now()), companyId, name: data.name || 'Nuevo Usuario',
      dni: data.dni || '',
      role: (data.role as Role) || 'operator', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return user;
  },
  update: async (id: string, data: Partial<User>) => {
    await delay(MOCK_DELAY);
    return { ...mockUser, id, ...data } as User;
  },
  delete: async (_id: string) => { await delay(MOCK_DELAY); },
};

export const mockAuditApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return { data: mockAuditLogs, total: mockAuditLogs.length }; },
};

const MOCK_NOTIF_KEY = 'mf_mock_notifications';
const MOCK_NOTIF_STATE_KEY = 'mf_mock_notification_state';

const readMockNotifs = (): StoredNotification[] => {
  try { return JSON.parse(localStorage.getItem(MOCK_NOTIF_KEY) || '[]'); } catch { return []; }
};
const writeMockNotifs = (rows: StoredNotification[]) => localStorage.setItem(MOCK_NOTIF_KEY, JSON.stringify(rows));
const readNotifState = (): Record<string, { readAt?: string; dismissedAt?: string }> => {
  try { return JSON.parse(localStorage.getItem(MOCK_NOTIF_STATE_KEY) || '{}'); } catch { return {}; }
};
const writeNotifState = (state: Record<string, { readAt?: string; dismissedAt?: string }>) =>
  localStorage.setItem(MOCK_NOTIF_STATE_KEY, JSON.stringify(state));

type StoredNotification = AppNotification & { dedupKey?: string };

const withState = (n: AppNotification): AppNotification => {
  const s = readNotifState()[n.id];
  return { ...n, isRead: Boolean(s?.readAt), isDismissed: Boolean(s?.dismissedAt) };
};

export const mockNotificationsApi = {
  list: async (_companyId: string) => { await delay(MOCK_DELAY); return readMockNotifs().map(withState); },
  create: async (_companyId: string, data: NotificationInput) => {
    await delay(MOCK_DELAY);
    const rows = readMockNotifs();
    let existing = rows.find(r => r.dedupKey === data.dedupKey);
    if (!existing) {
      existing = {
        id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`,
        companyId: '1', userId: data.userId ?? null, type: data.type,
        title: data.title, message: data.message, link: data.link,
        createdAt: new Date().toISOString(), isRead: false, isDismissed: false,
        dedupKey: data.dedupKey,
      };
      rows.unshift(existing);
      writeMockNotifs(rows);
    }
    return withState(existing);
  },
  read: async (id: string) => {
    await delay(MOCK_DELAY);
    const state = readNotifState();
    state[id] = { ...state[id], readAt: new Date().toISOString() };
    writeNotifState(state);
    return { message: 'Notificación marcada como leída' };
  },
  dismiss: async (id: string) => {
    await delay(MOCK_DELAY);
    const state = readNotifState();
    state[id] = { ...state[id], dismissedAt: new Date().toISOString(), readAt: state[id]?.readAt || new Date().toISOString() };
    writeNotifState(state);
    return { message: 'Notificación descartada' };
  },
  readAll: async (_companyId: string) => {
    await delay(MOCK_DELAY);
    const state = readNotifState();
    const now = new Date().toISOString();
    let count = 0;
    for (const n of readMockNotifs()) {
      if (!state[n.id]?.readAt && !state[n.id]?.dismissedAt) { state[n.id] = { ...state[n.id], readAt: now }; count++; }
    }
    writeNotifState(state);
    return { message: 'Notificaciones marcadas como leídas', count };
  },
  dismissAll: async (_companyId: string) => {
    await delay(MOCK_DELAY);
    const state = readNotifState();
    const now = new Date().toISOString();
    let count = 0;
    for (const n of readMockNotifs()) {
      if (!state[n.id]?.dismissedAt) { state[n.id] = { ...state[n.id], dismissedAt: now, readAt: state[n.id]?.readAt || now }; count++; }
    }
    writeNotifState(state);
    return { message: 'Notificaciones descartadas', count };
  },
};

const MOCK_WORKERS = [
  { id: 'w1', userId: '3', employeeCode: '44444444', name: 'Operario de Caja', position: 'Cajero', department: 'Ventas', isActive: true, trackingEnabled: true },
  { id: 'w2', userId: '4', employeeCode: '22222222', name: 'Gerente de Operaciones', position: 'Gerente', department: 'Operaciones', isActive: true, trackingEnabled: true },
];

const MOCK_LOCATIONS = [
  { id: 'l1', workerId: 'w1', latitude: -12.0464, longitude: -77.0428, accuracy: 8, isWithinGeofence: true, recordedAt: new Date(Date.now() - 60000).toISOString() },
  { id: 'l2', workerId: 'w2', latitude: -12.0600, longitude: -77.0300, accuracy: 15, isWithinGeofence: false, recordedAt: new Date(Date.now() - 25 * 60000).toISOString() },
];

const MOCK_STATUSES: TrackingStatus[] = ['active', 'idle'];

export const mockLocationsApi = {
  sendLocation: async (data: { latitude: number; longitude: number }): Promise<LocationRecord> => {
    await delay(MOCK_DELAY);
    return { id: `l${Date.now()}`, workerId: 'w1', latitude: data.latitude, longitude: data.longitude, accuracy: 10, isWithinGeofence: true, recordedAt: new Date().toISOString() };
  },
  getLatestLocations: async (): Promise<WorkerLastLocation[]> => {
    await delay(MOCK_DELAY);
    return MOCK_LOCATIONS.map((loc, i) => ({
      workerId: loc.workerId,
      workerName: MOCK_WORKERS[i]?.name ?? 'Trabajador',
      employeeCode: MOCK_WORKERS[i]?.employeeCode ?? '00000000',
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      lastSeen: loc.recordedAt,
      minutesAgo: Math.round((Date.now() - new Date(loc.recordedAt).getTime()) / 60000),
      status: MOCK_STATUSES[i] ?? 'offline',
      address:
        loc.workerId === 'w1'
          ? 'Av. Pardo 528, Miraflores 15074, Lima'
          : 'Av. Arequipa 2450, Lince 15046, Lima',
      distanceKm: loc.workerId === 'w1' ? 5.6 : 7.5,
    }));
  },
  getWorkerHistory: async (workerId: string): Promise<LocationRecord[]> => { await delay(MOCK_DELAY); return MOCK_LOCATIONS.filter(l => l.workerId === workerId); },
  getMapHtml: async (): Promise<string> => { await delay(MOCK_DELAY); return '<html><body style="margin:0;display:flex;height:95vh;align-items:center;justify-content:center;font-family:sans-serif;color:#64748b">Mapa (modo demo — conecta el backend para ver Folium)</body></html>'; },
  getWorkerHistoryMap: async (): Promise<string> => { await delay(MOCK_DELAY); return '<html><body style="margin:0;display:flex;height:95vh;align-items:center;justify-content:center;font-family:sans-serif;color:#64748b">Historial (modo demo)</body></html>'; },
  getGeofenceMapHtml: async (): Promise<string> => { await delay(MOCK_DELAY); return '<html><body style="margin:0;display:flex;height:95vh;align-items:center;justify-content:center;font-family:sans-serif;color:#64748b">Geofence (modo demo)</body></html>'; },
  getWorkersOutsideGeofence: async (): Promise<WorkerLastLocation[]> => { await delay(MOCK_DELAY); return [mockLatestOutside()]; },
  sendConsent: async (consentStatus: 'accepted' | 'denied'): Promise<ConsentRecord> => {
    await delay(MOCK_DELAY);
    return { id: `c${Date.now()}`, workerId: 'w1', consentStatus, consentedAt: new Date().toISOString() };
  },
  listWorkers: async (): Promise<WorkerItem[]> => { await delay(MOCK_DELAY); return MOCK_WORKERS; },
};

const mockLatestOutside = () => ({
  workerId: 'w2',
  workerName: 'Gerente de Operaciones',
  employeeCode: '22222222',
  latitude: -12.0600,
  longitude: -77.0300,
  accuracy: 15,
  lastSeen: MOCK_LOCATIONS[1].recordedAt,
  minutesAgo: 25,
  status: 'idle' as const,
  address: 'Av. Arequipa 2450, Lince 15046, Lima',
  distanceKm: 7.5,
});