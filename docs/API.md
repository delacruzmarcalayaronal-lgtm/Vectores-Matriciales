# API (API.md)

Base: `http://localhost:8000/api/v1` — JSON, autenticación `Authorization: Bearer <accessToken>` salvo indicación.

## Salud

| Método | Ruta | Auth |
|---|---|---|
| GET | `/health` | — |

## Auth (`/auth`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login por DNI (8 dígitos) → `AuthResponse` |
| POST | `/auth/login/face` | Login por identidad facial |
| POST | `/auth/register` | Registro de operario por DNI |
| POST | `/auth/refresh` | Renueva tokens con `refreshToken` |
| POST | `/auth/logout` | Cierra sesión (audita) |
| GET/PUT | `/auth/me` | Perfil del usuario actual |

## Empresas, sucursales, catálogo

| Método | Ruta | Auth |
|---|---|---|
| GET/POST | `/companies` | admin |
| GET/PUT | `/companies/{company_id}` | admin |
| GET/POST | `/companies/{company_id}/branches` | roles empresa |
| GET/PUT/DELETE | `/branches/{branch_id}` | roles empresa |
| GET/POST | `/companies/{company_id}/categories` | roles empresa |
| GET/PUT/DELETE | `/categories/{category_id}` | roles empresa |
| GET/POST | `/companies/{company_id}/products` | roles empresa |
| GET/PUT/DELETE | `/products/{product_id}` | roles empresa |

## Ventas e inventario

| Método | Ruta | Auth |
|---|---|---|
| GET/POST | `/companies/{company_id}/sales` | roles venta |
| GET/PUT/DELETE | `/sales/{sale_id}` | roles venta |
| GET/POST | `/companies/{company_id}/inventory/movements` | roles inventario |
| GET | `/companies/{company_id}/branches/{branch_id}/inventory/stock` | roles inventario |

## Análisis matemático

| Método | Ruta | Auth |
|---|---|---|
| GET/POST | `/companies/{company_id}/vectors` | admin, analyst |
| GET/PUT/DELETE | `/vectors/{vector_id}` | admin, analyst |
| GET/POST | `/companies/{company_id}/matrices` | admin, analyst |
| GET/PUT/DELETE | `/matrices/{matrix_id}` | admin, analyst |
| POST | `/companies/{company_id}/operations` | admin, analyst (ejecuta y registra) |
| GET | `/operations/{operation_id}` | roles empresa |
| GET | `/companies/{company_id}/targets` + CRUD `/targets/{target_id}` | roles empresa |

## Reportes, usuarios y notificaciones

| Método | Ruta | Auth |
|---|---|---|
| GET | `/companies/{company_id}/reports/dashboard` | roles empresa |
| GET | `/companies/{company_id}/audit` | admin |
| GET/POST | `/companies/{company_id}/users` | admin |
| GET/PUT/DELETE | `/users/{user_id}` | admin |
| GET/POST | `/companies/{company_id}/notifications` | sesión |
| POST | `/notifications/{id}/read` · `/dismiss` | sesión |
| POST | `/companies/{id}/notifications/read-all` · `/dismiss-all` | sesión |

## Códigos comunes

- `400` validación (DNI, nombre, valores de vector)
- `401` token ausente/expirado
- `403` rol insuficiente o empresa distinta
- `404` recurso inexistente
- `201` creación exitosa (POST)
