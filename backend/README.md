# MatrixFlow Enterprise - Backend

API REST con FastAPI, SQLAlchemy 2.0, JWT y NumPy.

## Requisitos

- Python 3.11+
- `pip install -r requirements.txt`

## Arranque

```bash
cp .env.example .env
python -m uvicorn app.main:app --port 8000
```

Al arrancar ejecuta las migraciones de Alembic (`migrations/`) y siembra los datos demo si la base está vacía.

## Estructura

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/        # Endpoints REST por recurso
│   │   └── helpers.py     # new_id, get_or_404, apply_changes
│   ├── core/              # config, security (JWT), deps, database (engine/sesión)
│   ├── models/            # Modelos SQLAlchemy (1 por entidad)
│   ├── schemas/           # Schemas Pydantic de entrada/salida
│   ├── services/          # Lógica de negocio (auth, vectores, operaciones, stock, auditoría)
│   ├── repositories/      # Acceso a datos (notificaciones, historial)
│   ├── algorithms/        # Motor matemático NumPy (vectores, matrices, combinación lineal)
│   ├── main.py            # App FastAPI
│   └── seed.py            # Datos demo
├── migrations/            # Alembic
├── tests/                 # pytest (51 tests)
└── requirements.txt
```

## Pruebas

```bash
python -m pytest -q          # 51 tests
python smoke_test.py         # verificación API en vivo
```

## Login demo

| DNI | Rol |
|---|---|
| 12345678 | Administrador |
| 22222222 | Gerente |
| 33333333 | Analista |
| 44444444 | Operario |
