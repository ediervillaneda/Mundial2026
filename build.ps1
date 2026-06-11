#Requires -Version 5.1
param(
    [switch]$Onefile,
    [switch]$Clean,
    [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot

Set-Location $ScriptDir

function Write-Step { param($msg) Write-Host ">> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "OK  $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "ERR $msg" -ForegroundColor Red }

# Verificar Python
Write-Step "Verificando Python..."
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Fail "Python no encontrado en PATH"
    exit 1
}
$pyVersion = python --version 2>&1
Write-OK $pyVersion

# Instalar dependencias
if (-not $NoInstall) {
    Write-Step "Instalando dependencias..."
    python -m pip install -q -r requirements.txt
    python -m pip install -q "pyinstaller>=6.0"
    Write-OK "Dependencias instaladas"
}

# Construir
$buildArgs = @()
if ($Clean)   { $buildArgs += '--clean' }
if ($Onefile) { $buildArgs += '--onefile' }

Write-Step "Compilando ejecutable$(if ($Onefile) { ' (onefile)' })..."
$env:PYTHONIOENCODING = 'utf-8'
python build.py @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build fallido (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
}

# Mostrar resultado
$exeName = "Mundial2026.exe"
$exePath = if ($Onefile) {
    Join-Path $ScriptDir "dist\$exeName"
} else {
    Join-Path $ScriptDir "dist\Mundial2026\$exeName"
}

if (Test-Path $exePath) {
    $size = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
    Write-OK "Ejecutable: $exePath ($size MB)"
} else {
    Write-Fail "No se encontro el ejecutable en $exePath"
    exit 1
}
