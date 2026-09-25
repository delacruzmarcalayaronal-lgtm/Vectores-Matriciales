# Verificación del Frontend MatrixFlow Enterprise
# Ejecutar desde la raíz del proyecto: .\verify-frontend.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MATRIXFLOW ENTERPRISE - VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "D:\Users\USUARIO\Desktop\Vectores Matriciales ind"
$frontendPath = "$projectPath\frontend"

# 1. Verificar estructura de directorios
Write-Host "1. Verificando estructura de directorios..." -ForegroundColor Yellow
$dirs = @(
    "src/types",
    "src/services", 
    "src/hooks",
    "src/contexts",
    "src/components/ui",
    "src/components/layout",
    "src/pages"
)

$missingDirs = @()
foreach ($dir in $dirs) {
    $fullPath = "$frontendPath\$dir"
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dir (FALTA)" -ForegroundColor Red
        $missingDirs += $dir
    }
}

# 2. Verificar archivos clave
Write-Host ""
Write-Host "2. Verificando archivos clave..." -ForegroundColor Yellow
$files = @(
    "package.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "vite.config.ts",
    "index.html",
    ".env",
    "src/main.tsx",
    "src/App.tsx",
    "src/index.css",
    "src/types/index.ts",
    "src/services/api.ts",
    "src/services/mockApi.ts",
    "src/hooks/useApi.ts",
    "src/contexts/AuthContext.tsx",
    "src/components/ui/Button.tsx",
    "src/components/ui/Input.tsx",
    "src/components/ui/Card.tsx",
    "src/components/ui/Table.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/layout/Layout.tsx",
    "src/pages/Login.tsx",
    "src/pages/Dashboard.tsx",
    "src/pages/Empresa.tsx",
    "src/pages/Branches.tsx",
    "src/pages/Products.tsx",
    "src/pages/Sales.tsx",
    "src/pages/Inventory.tsx",
    "src/pages/Vectors.tsx",
    "src/pages/Matrices.tsx",
    "src/pages/Operations.tsx",
    "src/pages/LinearCombinations.tsx",
    "src/pages/History.tsx",
    "src/pages/Reports.tsx",
    "src/pages/Users.tsx",
    "src/pages/Settings.tsx"
)

$missingFiles = @()
foreach ($file in $files) {
    $fullPath = "$frontendPath\$file"
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (FALTA)" -ForegroundColor Red
        $missingFiles += $file
    }
}

# 3. Verificar package.json dependencias
Write-Host ""
Write-Host "3. Verificando dependencias clave..." -ForegroundColor Yellow
$packageJson = Get-Content "$frontendPath\package.json" | ConvertFrom-Json
$deps = @(
    "react", "react-dom", "react-router-dom",
    "@tanstack/react-query", "axios", "lucide-react",
    "react-hook-form", "@hookform/resolvers", "zod",
    "recharts", "clsx", "tailwind-merge",
    "tailwindcss", "@tailwindcss/postcss", "autoprefixer",
    "vite", "typescript"
)

foreach ($dep in $deps) {
    $found = $false
    if ($packageJson.dependencies -and $packageJson.dependencies.$dep) { $found = $true }
    if ($packageJson.devDependencies -and $packageJson.devDependencies.$dep) { $found = $true }
    if ($found) {
        Write-Host "  ✓ $dep" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dep (FALTA)" -ForegroundColor Red
    }
}

# 4. Verificar node_modules
Write-Host ""
Write-Host "4. Verificando node_modules..." -ForegroundColor Yellow
if (Test-Path "$frontendPath\node_modules") {
    Write-Host "  ✓ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "  ✗ node_modules NO existe - ejecutar: npm install" -ForegroundColor Red
}

# 5. Verificar build
Write-Host ""
Write-Host "5. Verificando build (TypeScript + Vite)..." -ForegroundColor Yellow
Write-Host "  Ejecutando: npm run build" -ForegroundColor Gray
$buildResult = & cd $frontendPath; npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Build exitoso" -ForegroundColor Green
} else {
    Write-Host "  ✗ Build falló" -ForegroundColor Red
    Write-Host "  Errores:" -ForegroundColor Red
    $buildResult | Select-String "error" | Select-Object -First 10 | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Red
    }
}

# 6. Resumen
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$totalIssues = $missingDirs.Count + $missingFiles.Count
if ($totalIssues -eq 0) {
    Write-Host "✓ Todo verificado correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar el servidor de desarrollo:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Acceder a: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "Credenciales demo: admin@matrixflow.com / admin123" -ForegroundColor Cyan
} else {
    Write-Host "✗ Se encontraron $totalIssues problemas:" -ForegroundColor Red
    if ($missingDirs.Count -gt 0) {
        Write-Host "  Directorios faltantes: $($missingDirs.Count)" -ForegroundColor Red
    }
    if ($missingFiles.Count -gt 0) {
        Write-Host "  Archivos faltantes: $($missingFiles.Count)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan