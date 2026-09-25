# Vectores Matriciales — MatrixFlow Enterprise

Sistema empresarial de vectores y matrices: RBAC de 4 roles, módulos de ventas/inventario/reportes y motor matemático NumPy.

## Stack

- **Frontend**: React + TypeScript + Vite (`frontend/`)
- **Backend**: Python + FastAPI + SQLAlchemy + NumPy (`backend/`)
- **Base de datos**: SQLite (dev) — PostgreSQL/Supabase (Fase 3)
- **Planes de despliegue**: Vercel (frontend) · Railway (backend) · Supabase (BD)

## Ejecutar en local

```bash
# Backend (puerto 8000)
cd backend
python -m uvicorn app.main:app --port 8000

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

El backend crea y siembra `matrixflow.db` automáticamente al arrancar.

## Usuarios demo (login por DNI)

| DNI | Rol |
|---|---|
| 12345678 | Administrador |
| 22222222 | Gerente |
| 33333333 | Analista |
| 44444444 | Operario |

## Verificación

```bash
cd backend && python smoke_test.py   # 44 verificaciones API
cd frontend && npx tsc -b && npx oxlint && npm run build
```

API docs: http://localhost:8000/docs
