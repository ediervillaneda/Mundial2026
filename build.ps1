#Requires -Version 5.1
param(
    [switch]$Onefile,
    [switch]$Clean,
    [switch]$NoInstall,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'
$ScriptDir   = $PSScriptRoot
$DataDir     = "F:\apps\python\Mundial2026\data"
$BackupRoot  = "F:\apps\python\Mundial2026\backups"
Set-Location $ScriptDir

# ── Detectar 7-Zip ────────────────────────────────────────────────────────────
$SevenZip = $null
foreach ($candidate in @(
    '7z',
    "$env:ProgramFiles\7-Zip\7z.exe",
    "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
)) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $SevenZip = $candidate
        break
    }
}

# ── Paleta ────────────────────────────────────────────────────────────────────
$C = @{
    Reset   = "`e[0m"
    Bold    = "`e[1m"
    Dim     = "`e[2m"
    Cyan    = "`e[96m"
    Green   = "`e[92m"
    Yellow  = "`e[93m"
    Red     = "`e[91m"
    Magenta = "`e[95m"
    White   = "`e[97m"
    Gray    = "`e[90m"
}

function Write-Banner {
    $line = "─" * 56
    Write-Host ""
    Write-Host "  $($C.Cyan)$($C.Bold)╔$line╗$($C.Reset)"
    Write-Host "  $($C.Cyan)$($C.Bold)║$($C.Reset)$($C.White)$($C.Bold)        Mundial 2026  ·  Build Script              $($C.Reset)$($C.Cyan)$($C.Bold)║$($C.Reset)"
    Write-Host "  $($C.Cyan)$($C.Bold)╚$line╝$($C.Reset)"
    Write-Host ""
}

function Write-Section {
    param([string]$Title)
    Write-Host "  $($C.Gray)┌─ $($C.Reset)$($C.Magenta)$($C.Bold)$Title$($C.Reset)"
}

function Write-Item {
    param([string]$Label, [string]$Value = "", [string]$Color = $C.White)
    $pad = 18
    $lbl = $Label.PadRight($pad)
    if ($Value) {
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Gray)$lbl$($C.Reset)$Color$Value$($C.Reset)"
    } else {
        Write-Host "  $($C.Gray)│  $($C.Reset)$Color$Label$($C.Reset)"
    }
}

function Write-OK {
    param([string]$Label, [string]$Value = "")
    $pad = 18
    $lbl = $Label.PadRight($pad)
    if ($Value) {
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Green)✔$($C.Reset)  $($C.Gray)$lbl$($C.Reset)$($C.Green)$Value$($C.Reset)"
    } else {
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Green)✔  $Label$($C.Reset)"
    }
}

function Write-Warn {
    param([string]$msg)
    Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Yellow)⚠  $msg$($C.Reset)"
}

function Write-Fail {
    param([string]$msg)
    Write-Host ""
    Write-Host "  $($C.Red)$($C.Bold)✖  $msg$($C.Reset)"
    Write-Host ""
}

function Write-Sep {
    Write-Host "  $($C.Gray)│$($C.Reset)"
}

function Write-Done {
    param([string]$Path, [string]$Size)
    Write-Host ""
    Write-Host "  $($C.Green)$($C.Bold)╔══════════════════════════════════════════════════════╗$($C.Reset)"
    Write-Host "  $($C.Green)$($C.Bold)║  ✔  Build completado exitosamente                    ║$($C.Reset)"
    Write-Host "  $($C.Green)$($C.Bold)╚══════════════════════════════════════════════════════╝$($C.Reset)"
    Write-Host ""
    Write-Host "  $($C.Gray)Ejecutable  $($C.Reset)$($C.White)$($C.Bold)$Path$($C.Reset)"
    Write-Host "  $($C.Gray)Tamaño      $($C.Reset)$($C.Cyan)$Size MB$($C.Reset)"
    Write-Host ""
}

# ── Busca el respaldo más reciente (7z o carpeta) ─────────────────────────────
function Get-LatestBackup {
    $zip = Get-ChildItem -Path $BackupRoot -File      -Filter "data_*.7z" -ErrorAction SilentlyContinue |
           Sort-Object Name -Descending | Select-Object -First 1
    $dir = Get-ChildItem -Path $BackupRoot -Directory -Filter "data_*"    -ErrorAction SilentlyContinue |
           Sort-Object Name -Descending | Select-Object -First 1

    if ($zip -and $dir) {
        if ($zip.BaseName -ge $dir.Name) { return $zip } else { return $dir }
    }
    if ($zip) { return $zip }
    if ($dir) { return $dir }
    return $null
}

# ── Restaura $DataDir desde el último respaldo ────────────────────────────────
# ── PROTECCIÓN — data/ NUNCA se elimina desde este script ─────────────────────
function Assert-DataIntact {
    if (Test-Path $DataDir) {
        $files = (Get-ChildItem $DataDir -File).Count
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Green)✔$($C.Reset)  $($C.Gray)data/             $($C.Reset)$($C.Green)intacta — $files archivo(s)$($C.Reset)"
        return
    }

    Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Yellow)⚠  data/ no encontrada — buscando último respaldo...$($C.Reset)"

    if (-not (Test-Path $BackupRoot)) {
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Red)$($C.Bold)✖  No hay respaldos en $BackupRoot. Abortando.$($C.Reset)"
        exit 99
    }

    $ultimo = Get-LatestBackup
    if (-not $ultimo) {
        Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Red)$($C.Bold)✖  Ningún respaldo encontrado en $BackupRoot. Abortando.$($C.Reset)"
        exit 99
    }

    Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Yellow)   Restaurando desde: $($ultimo.Name)$($C.Reset)"

    if ($ultimo.Extension -eq '.7z') {
        if (-not $SevenZip) {
            Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Red)$($C.Bold)✖  7-Zip no disponible para restaurar .7z. Abortando.$($C.Reset)"
            exit 99
        }
        New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
        & $SevenZip x $ultimo.FullName "-o$DataDir" -y | Out-Null
    } else {
        Copy-Item -Path $ultimo.FullName -Destination $DataDir -Recurse
    }

    $files = (Get-ChildItem $DataDir -File).Count
    Write-Host "  $($C.Gray)│  $($C.Reset)$($C.Green)✔  data/ restaurada — $files archivo(s)$($C.Reset)"
}

# ── Restaura data/ en carpeta dist si falta ───────────────────────────────────
function Assert-DistData {
    param([string]$DistDataPath)

    if (Test-Path $DistDataPath) {
        $files = (Get-ChildItem $DistDataPath -File).Count
        Write-OK "data/ en dist" "$files archivo(s) presentes"
        return
    }

    Write-Warn "data/ no encontrada en dist — restaurando..."

    if (-not (Test-Path $BackupRoot)) {
        Write-Warn "Sin respaldos disponibles en $BackupRoot"
        return
    }

    $ultimo = Get-LatestBackup
    if (-not $ultimo) {
        Write-Warn "No se encontraron respaldos"
        return
    }

    New-Item -ItemType Directory -Path $DistDataPath -Force | Out-Null

    if ($ultimo.Extension -eq '.7z') {
        if (-not $SevenZip) {
            Write-Warn "7-Zip no disponible para extraer $($ultimo.Name)"
            return
        }
        & $SevenZip x $ultimo.FullName "-o$DistDataPath" -y | Out-Null
    } else {
        Copy-Item -Path "$($ultimo.FullName)\*" -Destination $DistDataPath -Recurse -Force
    }

    $files = (Get-ChildItem $DistDataPath -File).Count
    Write-OK "data/ en dist" "restaurada desde $($ultimo.Name) — $files archivo(s)"
}

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Banner

# ── Config ────────────────────────────────────────────────────────────────────
Write-Section "Configuración"
Write-Item "Modo"      "$(if ($Onefile) { 'onefile (.exe único)' } else { 'carpeta (dist/Mundial2026/)' })"  $C.Cyan
Write-Item "Clean"     "$(if ($Clean)   { 'sí' } else { 'no' })"  $C.White
Write-Item "Instalar"  "$(if ($NoInstall) { 'omitido' } else { 'sí' })"  $C.White
Write-Item "Backup"    "$(if ($NoBackup) { 'omitido' } else { 'sí' })"  $C.White
Write-Sep

# ── Backup ────────────────────────────────────────────────────────────────────
if (-not $NoBackup) {
    Write-Section "Backup de datos"
    Assert-DataIntact

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    if (-not (Test-Path $BackupRoot)) {
        New-Item -ItemType Directory -Path $BackupRoot | Out-Null
    }

    $backupDir = Join-Path $BackupRoot "data_$timestamp"
    Copy-Item -Path $DataDir -Destination $backupDir -Recurse
    $files = (Get-ChildItem $backupDir -File).Count
    Write-OK "Carpeta"    $backupDir
    Write-OK "Archivos"   "$files archivo(s) copiado(s)"

    if ($SevenZip) {
        $backupFile = Join-Path $BackupRoot "data_$timestamp.7z"
        & $SevenZip a -t7z $backupFile "$backupDir\*" | Out-Null
        Remove-Item -Path $backupDir -Recurse -Force
        $sizeKB = [math]::Round((Get-Item $backupFile).Length / 1KB, 1)
        Write-OK "Comprimido" "data_$timestamp.7z ($sizeKB KB)"
    } else {
        Write-Warn "7-Zip no encontrado — backup queda como carpeta"
    }
    Write-Sep
}

# ── Python ────────────────────────────────────────────────────────────────────
Write-Section "Entorno"
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Fail "Python no encontrado en PATH"
    exit 1
}
$pyVersion = (python --version 2>&1).ToString().Trim()
$sevenZipLabel = if ($SevenZip) {
    (& $SevenZip 2>&1 | Select-String '7-Zip' | Select-Object -First 1).ToString().Trim()
} else { 'no instalado (fallback a carpeta)' }
Write-OK "Python"  $pyVersion
Write-OK "7-Zip"   $sevenZipLabel
Write-Sep

# ── Dependencias ──────────────────────────────────────────────────────────────
if (-not $NoInstall) {
    Write-Section "Dependencias"
    python -m pip install -q -r requirements.txt
    python -m pip install -q "pyinstaller>=6.0"
    Write-OK "Flask + PyInstaller instalados"
    Write-Sep
}

# ── Build ─────────────────────────────────────────────────────────────────────
Write-Section "Compilando"
$buildArgs = @()
if ($Clean)   { $buildArgs += '--clean' }
if ($Onefile) { $buildArgs += '--onefile' }

Write-Item "Ejecutando" "build.py $($buildArgs -join ' ')"  $C.Gray
Write-Sep
$env:PYTHONIOENCODING = 'utf-8'
python build.py @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build fallido (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

# ── Verificación post-build ───────────────────────────────────────────────────
$exeName = "Mundial2026.exe"
$exePath = if ($Onefile) {
    Join-Path $ScriptDir "dist\$exeName"
} else {
    Join-Path $ScriptDir "dist\Mundial2026\$exeName"
}

$distDataPath = if ($Onefile) {
    Join-Path $ScriptDir "dist\data"
} else {
    Join-Path $ScriptDir "dist\Mundial2026\data"
}

Write-Section "Verificación post-build"
Assert-DataIntact
Assert-DistData -DistDataPath $distDataPath
Write-Sep

if (Test-Path $exePath) {
    $size = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
    Write-Done -Path $exePath -Size $size
} else {
    Write-Fail "Ejecutable no encontrado en $exePath"
    exit 1
}
