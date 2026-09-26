# Guía de instalación (SETUP)

## Requisitos

- Node.js 20+ y npm
- Python 3.11+
- (Opcional) Docker + Docker Compose para la base de datos

## Opción A: con Docker Compose (recomendada)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000 (health: `/health`)
- PostgreSQL: puerto 5432 (se siembra con `database/init.sql` + `database/seed.sql`)

## Opción B: manual

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --port 8000
```

Con `DATABASE_URL=sqlite:///./matrixflow.db` (default) la base y los datos demo se crean automáticamente.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

### 3. Verificación

```bash
cd backend && python -m pytest -q    # 51 tests
cd frontend && npm run build         # typecheck + build
```

## Login demo (por DNI)

| DNI | Rol |
|---|---|
| 12345678 | Administrador |
| 22222222 | Gerente |
| 33333333 | Analista |
| 44444444 | Operario |

## Despliegue

- **Frontend**: Vercel (`frontend/`, build `npm run build`, output `dist`)
- **Backend**: Railway/Render (`backend/`, Procfile `web: python -m uvicorn app.main:app --port $PORT`)
- Variables de entorno: ver `.env.example` y `backend/.env.example`
