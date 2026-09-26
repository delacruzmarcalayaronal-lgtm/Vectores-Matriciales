-- MatrixFlow Enterprise - Esquema inicial (PostgreSQL)
-- Generado desde los modelos SQLAlchemy del backend.


CREATE TABLE audit_logs (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"userId" VARCHAR(40) NOT NULL, 
	action VARCHAR(40) NOT NULL, 
	module VARCHAR(40) NOT NULL, 
	"entityType" VARCHAR(40) NOT NULL, 
	"entityId" VARCHAR(40) NOT NULL, 
	"oldValues" JSON, 
	"newValues" JSON, 
	"ipAddress" VARCHAR(60), 
	"userAgent" VARCHAR(255), 
	status VARCHAR(20) NOT NULL, 
	"errorMessage" TEXT, 
	"createdAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE branches (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	address VARCHAR(255) NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	country VARCHAR(100) NOT NULL, 
	phone VARCHAR(50) NOT NULL, 
	"isActive" BOOLEAN NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE categories (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	description TEXT NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE companies (
	id VARCHAR(40) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	"legalName" VARCHAR(200) NOT NULL, 
	"taxId" VARCHAR(40) NOT NULL, 
	address VARCHAR(255) NOT NULL, 
	city VARCHAR(100), 
	country VARCHAR(100), 
	phone VARCHAR(50) NOT NULL, 
	logo VARCHAR(255), 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE matrices (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	rows INTEGER NOT NULL, 
	cols INTEGER NOT NULL, 
	values JSON NOT NULL, 
	"rowLabels" JSON NOT NULL, 
	"colLabels" JSON NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	"sourceConfig" JSON, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE notifications (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"userId" VARCHAR(40), 
	type VARCHAR(40) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	message TEXT NOT NULL, 
	link VARCHAR(255) NOT NULL, 
	"dedupKey" VARCHAR(120) NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE operations (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"userId" VARCHAR(40) NOT NULL, 
	type VARCHAR(40) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	"inputVectors" JSON NOT NULL, 
	"inputMatrices" JSON NOT NULL, 
	parameters JSON NOT NULL, 
	"resultVectorId" VARCHAR(40), 
	"resultMatrixId" VARCHAR(40), 
	status VARCHAR(20) NOT NULL, 
	"errorMessage" TEXT, 
	"executionTimeMs" FLOAT NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE products (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"categoryId" VARCHAR(40) NOT NULL, 
	sku VARCHAR(40) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	"unitPrice" FLOAT NOT NULL, 
	"costPrice" FLOAT NOT NULL, 
	stock INTEGER NOT NULL, 
	"minStock" INTEGER NOT NULL, 
	unit VARCHAR(30) NOT NULL, 
	"isActive" BOOLEAN NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE sales (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"branchId" VARCHAR(40) NOT NULL, 
	"userId" VARCHAR(40) NOT NULL, 
	"saleNumber" VARCHAR(40) NOT NULL, 
	date VARCHAR(40) NOT NULL, 
	subtotal FLOAT NOT NULL, 
	tax FLOAT NOT NULL, 
	total FLOAT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	notes TEXT, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE targets (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"branchId" VARCHAR(40), 
	"productId" VARCHAR(40), 
	period VARCHAR(20) NOT NULL, 
	"targetValue" FLOAT NOT NULL, 
	"achievedValue" FLOAT NOT NULL, 
	type VARCHAR(20) NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE users (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	dni VARCHAR(20), 
	role VARCHAR(20) NOT NULL, 
	avatar TEXT, 
	"isActive" BOOLEAN NOT NULL, 
	"passwordHash" VARCHAR(200), 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE vectors (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	dimension INTEGER NOT NULL, 
	values JSON NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	"sourceConfig" JSON, 
	"createdAt" VARCHAR(40) NOT NULL, 
	"updatedAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id)
);


CREATE TABLE inventory_movements (
	id VARCHAR(40) NOT NULL, 
	"companyId" VARCHAR(40) NOT NULL, 
	"branchId" VARCHAR(40) NOT NULL, 
	"productId" VARCHAR(40) NOT NULL, 
	type VARCHAR(20) NOT NULL, 
	quantity INTEGER NOT NULL, 
	reference VARCHAR(80) NOT NULL, 
	notes TEXT, 
	date VARCHAR(40) NOT NULL, 
	"createdAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY("branchId") REFERENCES branches (id), 
	FOREIGN KEY("productId") REFERENCES products (id)
);


CREATE TABLE notification_reads (
	id VARCHAR(40) NOT NULL, 
	"notificationId" VARCHAR(40) NOT NULL, 
	"userId" VARCHAR(40) NOT NULL, 
	"readAt" VARCHAR(40), 
	"dismissedAt" VARCHAR(40), 
	"createdAt" VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY("notificationId") REFERENCES notifications (id)
);


CREATE TABLE sale_details (
	id VARCHAR(40) NOT NULL, 
	"saleId" VARCHAR(40) NOT NULL, 
	"productId" VARCHAR(40) NOT NULL, 
	quantity INTEGER NOT NULL, 
	"unitPrice" FLOAT NOT NULL, 
	discount FLOAT NOT NULL, 
	subtotal FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY("saleId") REFERENCES sales (id), 
	FOREIGN KEY("productId") REFERENCES products (id)
);
