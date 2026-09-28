# Vectores Matriciales — MatrixFlow Enterprise

Sistema empresarial de ventas e inventario con álgebra lineal: RBAC de 4 roles, módulos de ventas/inventario/reportes, motor matemático NumPy y verificación facial con MediaPipe.

## Características

- **RBAC de 4 roles** — Administrador, Gerente, Analista y Operario; acceso con **DNI** o con **verificación facial**.
- **Módulos operativos** — Dashboard ejecutivo, Empresa, Ventas, Inventario, Historial, Reportes (con vista de impresión/PDF), Usuarios y Configuración.
- **Análisis Matemático** — Vectores, Matrices, Operaciones y Combinaciones lineales calculados con NumPy y explicados paso a paso.
- **Identidad Facial** — registro con **1 captura** usando MediaPipe FaceLandmarker (478 puntos), descriptor de 1776 valores (400 puntos de profundidad × 3 + apariencia 24×24) y umbral de confianza configurable (30–70 %). El escáner muestra la malla de profundidad en vivo con guiado **DE FRENTE** y raya de escaneo.
- **Mapa de Ubicaciones** — seguimiento de trabajadores cada 60 s, solo con consentimiento informado (banner, revocable y con registro de consentimientos).
- **Temas** — 6 temas (claro, oscuro, medianoche, océano, matrix y sistema); el color de acento lo define el tema.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`frontend/`)
- **Backend**: Python + FastAPI + SQLAlchemy 2.0 + Alembic + NumPy (`backend/`)
- **Base de datos**: PostgreSQL (Docker/Supabase) o SQLite para desarrollo local
- **Despliegue**: Vercel (frontend) · Railway (backend) · Supabase (BD)

## Estructura del repositorio

```
├── backend/            API REST FastAPI (app/, migraciones Alembic, tests)
├── frontend/           SPA React + Vite (src/)
├── database/           init.sql, seed.sql y migraciones SQL
├── docs/               SETUP.md, API.md, ARCHITECTURE.md, DATABASE.md
├── docker-compose.yml  PostgreSQL + backend + frontend
└── MatrixFlow.bat      arranque rápido del frontend (Windows)
```

## Puesta en marcha

Guía completa en [`docs/SETUP.md`](docs/SETUP.md). Resumen:

### Opción A: Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000 (health: `/health`)
- PostgreSQL: puerto 5432 (se siembra con `database/init.sql` + `database/seed.sql`)

### Opción B: manual

```bash
# Backend (puerto 8000)
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --port 8000

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

Al arrancar el backend ejecuta las migraciones de Alembic y, si la base está vacía, siembra la empresa y los usuarios demo. Con `DATABASE_URL=sqlite:///./matrixflow.db` (default) no se necesita PostgreSQL.

API docs: http://localhost:8000/docs

## Usuarios demo (login por DNI)

| DNI | Rol |
|---|---|
| 12345678 | Administrador |
| 22222222 | Gerente |
| 33333333 | Analista |
| 44444444 | Operario |

También puedes iniciar sesión desde la pestaña **“Con mi rostro”** con el escáner facial (o con el modo demostración si no hay cámara).

## Verificación

```bash
cd backend && python -m pytest -q    # 90 tests
cd backend && python smoke_test.py   # 44 verificaciones API en vivo (backend corriendo)
cd frontend && npx tsc -b && npx oxlint && npm run build
```

> `smoke_test.py` verifica el escenario completo (sucursales, productos, ventas y
> reportes); ese escenario **no vive en producción**: cárgalo antes sobre una base
> local con `python -m app.seed_demo` (solo SQLite; si la BD está vacía, el smoke
> lo indica y reporta solo las verificaciones de esquema/auth).

## Documentación

- [`docs/SETUP.md`](docs/SETUP.md) — instalación y arranque
- [`docs/API.md`](docs/API.md) — endpoints de la API
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura de la solución
- [`docs/DATABASE.md`](docs/DATABASE.md) — modelo de datos
- [`backend/README.md`](backend/README.md) — estructura interna del backend

## Despliegue

- **Frontend**: Vercel → https://vectores-matriciales.vercel.app (`frontend/`, build `npm run build`, output `dist`)
- **Backend**: Railway/Render (`backend/`, Procfile `web: python -m uvicorn app.main:app --port $PORT`)
- **Variables de entorno**: ver `.env.example` (raíz) y `backend/.env.example`
