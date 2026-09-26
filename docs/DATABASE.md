# Base de datos (DATABASE)

## Motor

- **Desarrollo**: SQLite (`backend/matrixflow.db`) — se crea y siembra automáticamente.
- **Producción**: PostgreSQL (Supabase o el servicio de la plataforma).
- **Migraciones**: Alembic (`backend/migrations/`, config `backend/alembic.ini`).
- **SQL versionado**: `database/init.sql` (DDL), `database/seed.sql` (demo), `database/migrations/001_init.sql`.

## Tablas (15)

| Tabla | Descripción |
|---|---|
| companies | Empresa matriz (perfil corporativo) |
| users | Usuarios y roles (login por DNI, `passwordHash` opcional) |
| branches | Sucursales por empresa |
| categories | Categorías de productos |
| products | Catálogo (precio, costo, stock, stock mínimo) |
| sales | Ventas (subtotal, IGV, total, estado) |
| sale_details | Detalle de venta (producto, cantidad, descuento) |
| inventory_movements | Movimientos de stock (in/out/adjustment/transfer) |
| targets | Metas por período (ventas, unidades, ingresos) |
| vectors | Vectores matemáticos (values JSON, dimensión, origen) |
| matrices | Matrices (values, etiquetas de fila/columna) |
| operations | Historial de operaciones ejecutadas (resultado, tiempo) |
| notifications | Notificaciones (globales o por usuario, `dedupKey`) |
| notification_reads | Estado de lectura/omisión por usuario |
| audit_logs | Auditoría de acciones (quién, qué, cuándo, IP) |

## Relaciones principales

- `users.companyId → companies.id`
- `branches.companyId → companies.id`
- `sales.companyId/branchId → companies/branches`
- `sale_details.saleId → sales.id`, `productId → products.id`
- `inventory_movements.branchId → branches.id`, `productId → products.id`
- `notification_reads.notificationId → notifications.id`

## Semilla

`database/seed.sql` incluye la empresa demo, 4 usuarios por rol, sucursales, categorías, productos con stock, ventas de ejemplo, metas y vectores/matrices de demostración.
