"""
Build script for Mundial 2026 Tracker
Generates standalone executables for Windows, Linux, and macOS using PyInstaller.

Usage:
    python build.py          # Build for current platform
    python build.py --all    # Build for all platforms (cross-compile may need setup)
    python build.py --onefile  # Single file executable (slower startup)
"""

import os
import sys
import shutil
import subprocess
import platform

APP_NAME = "Mundial2026"
MAIN_SCRIPT = "app.py"
DIST_DIR = "dist"
BUILD_DIR = "build"
DATA_DIRS = [
    ("templates", "templates"),
    ("static", "static"),
    ("data", "data"),
]

REQUIREMENTS = [
    "flask>=3.0",
    "pyinstaller>=6.0",
]


def clean():
    for d in [DIST_DIR, BUILD_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
    spec_file = f"{APP_NAME}.spec"
    if os.path.exists(spec_file):
        os.remove(spec_file)
    print("✓ Directorios de build limpiados")


def install_deps():
    print("📦 Instalando dependencias...")
    for req in REQUIREMENTS:
        subprocess.check_call([sys.executable, "-m", "pip", "install", req])
    print("✓ Dependencias instaladas")


def build_exe(onefile=False):
    print(f"🏗️  Construyendo ejecutable para {platform.system()}...")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name",
        APP_NAME,
        "--distpath",
        DIST_DIR,
        "--workpath",
        BUILD_DIR,
        "--noconfirm",
        "--clean",
    ]

    if onefile:
        cmd.append("--onefile")
    else:
        cmd.append("--onedir")

    icon_path = os.path.join("static", "icon.ico")
    if os.path.exists(icon_path):
        cmd.extend(["--icon", icon_path])

    for src, dst in DATA_DIRS:
        sep = ";" if platform.system() == "Windows" else ":"
        cmd.extend(["--add-data", f"{src}{sep}{dst}"])

    cmd.extend(
        [
            "--hidden-import",
            "flask",
            "--hidden-import",
            "json",
            MAIN_SCRIPT,
        ]
    )

    print(f"Ejecutando: {' '.join(cmd)}")
    subprocess.check_call(cmd)

    exe_name = f"{APP_NAME}.exe" if platform.system() == "Windows" else APP_NAME
    if onefile:
        exe_path = os.path.join(DIST_DIR, exe_name)
    else:
        exe_path = os.path.join(DIST_DIR, APP_NAME, exe_name)

    if os.path.exists(exe_path):
        print(f"\n✅ Ejecutable creado: {exe_path}")
        print(f"   Tamaño: {os.path.getsize(exe_path) / 1024 / 1024:.1f} MB")
    else:
        print(f"\n❌ Error: No se encontró el ejecutable en {exe_path}")


def main():
    onefile = "--onefile" in sys.argv
    do_clean = "--clean" in sys.argv

    if do_clean:
        clean()

    if "--install" in sys.argv or not _is_installed("pyinstaller"):
        install_deps()

    build_exe(onefile=onefile)

    if platform.system() == "Windows" and not onefile:
        print("\n💡 Tip: Para generar un solo .exe (sin carpeta), usa --onefile")
    print("\n📋 Para distribución:")
    if onefile:
        print(f"   Copia {os.path.join(DIST_DIR, f'{APP_NAME}.exe')} a cualquier PC")
    else:
        print(f"   Copia toda la carpeta {os.path.join(DIST_DIR, APP_NAME)}")


def _is_installed(pkg):
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "show", pkg],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except subprocess.CalledProcessError:
        return False


if __name__ == "__main__":
    main()
