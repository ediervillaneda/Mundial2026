# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
python app.py                    # Servidor en puerto 2026 (abre navegador automáticamente)
python app.py --no-browser       # Sin abrir navegador
PORT=8080 python app.py          # Puerto personalizado (Linux/Mac)
set PORT=8080 && python app.py   # Puerto personalizado (Windows)

pip install -r requirements.txt  # Instalar dependencias (solo Flask>=3.0)

python build.py                  # Compilar ejecutable (carpeta dist/)
python build.py --onefile        # Compilar un solo .exe portátil
python build.py --clean --onefile
```

## Arquitectura

Aplicación Flask monolítica. Dos módulos Python principales:

**`data_manager.py`** — toda la lógica de negocio:
- `MundialData`: clase singleton (instanciada como `data_mgr` global en `app.py`)
- Lee/escribe `data/mundial.json` en cada operación vía `guardar()`
- `calcular_tabla_grupo()` → ordena por pts → gd → gf → `_desempate_head2head()`
- `obtener_clasificados_a_eliminatorias()` → top 2 de cada grupo + 8 mejores terceros = 32
- `generar_eliminatorias()` → requiere exactamente 32 clasificados; semilla: 1° vs 32°, 2° vs 31°...
- `_propagar_avance(ronda, idx)` → ganador pasa a `next_round[idx // 2]`, slot `team1/team2` por paridad de `idx`

**`app.py`** — rutas Flask:
- Vistas HTML: `/`, `/grupos`, `/grupo/<letra>`, `/partidos`, `/eliminatorias`
- API REST bajo `/api/` → devuelven JSON; no hay autenticación
- `data_mgr` es global compartido entre todas las rutas

**Templates Jinja2** heredan de `base.html`. Los `<style>` inline en templates son intencionales (estilos de página específica). No usar librerías JS externas.

## Convenciones

- Variables y funciones nombradas en **español**
- Sin comentarios en el código (salvo docstrings de módulo)
- Toda lógica de negocio en `data_manager.py`; `app.py` solo orquesta rutas
- Los matches de grupos usan `id` entero; los matches KO usan `id` string (`"KO-1"`, etc.)
- `played: true` se activa automáticamente cuando `fulltime1` y `fulltime2` son no nulos
- El campo `winner` en KO se resuelve por marcador; penales solo si empate en `score`

## Estructura de datos (`data/mundial.json`)

```json
{
  "groups": {"A": ["equipo1", ...], ...},
  "matches": [{"id": 1, "group": "A", "team1": "...", "fulltime1": null, "played": false, ...}],
  "knockout": {
    "round_of_32": {"matches": [{"id": "KO-1", "team1": null, "winner": null, ...}]},
    "round_of_16": {"matches": [...]},
    "quarter_finals": {"matches": [...]},
    "semi_finals": {"matches": [...]},
    "third_place": {"team1": null, ...},
    "final": {"team1": null, ...}
  },
  "knockout_generated": false
}
```

`third_place` y `final` son objetos directos (no arrays). Todas las demás rondas KO tienen `.matches[]`.
