# Arquitectura (ARCHITECTURE)

## Visión general

```
┌────────────────┐     HTTPS/JSON      ┌────────────────┐      ┌────────────┐
│  React + Vite  │ ──────────────────► │ FastAPI (app)  │ ───► │ PostgreSQL │
│  frontend/     │  Bearer JWT         │ backend/       │      │  (o SQLite)│
└────────────────┘                     └────────────────┘      └────────────┘
```

## Estructura del repositorio

```
matrixflow-enterprise/
├── frontend/               # SPA React + TypeScript + Vite
│   └── src/
│       ├── components/     # ui, layout, charts, notifications, ...
│       ├── pages/          # pantallas por módulo
│       ├── hooks/          # useApi, useNotice
│       ├── services/       # api.ts (cliente HTTP), mockApi.ts
│       ├── contexts/       # AuthContext (sesión/roles)
│       ├── types/          # tipos compartidos
│       ├── schemas/        # validaciones Zod
│       ├── utils/          # format (moneda/fechas)
│       └── lib/            # permisos, tema, utilidades
├── backend/                # API FastAPI (ver backend/README.md)
├── database/               # init.sql, seed.sql, migrations/
├── docs/                   # esta documentación
└── docker-compose.yml
```

## Backend por capas

1. **api/routes**: transporte HTTP, validación de roles (`require_roles`), respuestas Pydantic.
2. **services**: lógica de negocio (auth_service, vector_service, operation_service, stock, audit).
3. **repositories**: consultas reutilizables (base.py → NotificationRepository, OperationRepository).
4. **models**: SQLAlchemy por entidad (paquete `app/models/`).
5. **algorithms**: motor NumPy (`vector_ops`, `matrix_ops`, `linear_comb` con dispatcher `run_operation`).

## Autenticación y autorización

- Login por DNI → JWT `accessToken` (30 min) + `refreshToken` (7 días).
- `get_current_user` resuelve el usuario desde el Bearer token.
- `require_roles("admin", ...)` protege por rol; `ensure_company` valida el scope de empresa.
- 4 roles: `admin`, `manager`, `analyst`, `operator`.

## Tema y apariencia

- Color de acento configurable en **Configuración → Apariencia** (`--color-primary` en `:root`, persistido en `localStorage`).
- La cabecera y el sidebar se tiñen con `var(--color-primary)`.
- Modos: light, dark, system + presets (midnight, ocean, matrix).
