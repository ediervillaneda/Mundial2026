# AGENTS.md — Guía para asistentes IA

## Proyecto: Mundial 2026 Tracker

Aplicación Flask monolítica para seguimiento de la Copa Mundial 2026.

### Stack

- **Backend**: Python 3.10+, Flask 3.x, sin ORM
- **Frontend**: Jinja2 templates, CSS vanilla, JavaScript vanilla
- **Datos**: Archivo JSON (`data/mundial.json`)
- **Build**: PyInstaller (`build.py`)

### Estructura clave

| Archivo | Propósito |
|---|---|
| `app.py` | Rutas Flask, endpoints API REST, entry point `__main__` en puerto 2026 |
| `data_manager.py` | Clase `MundialData`: carga/guarda JSON, cálculos de tabla, desempates, bracket |
| `build.py` | Script PyInstaller para generar ejecutable multiplataforma |
| `templates/*.html` | Templates Jinja2 con herencia via `base.html` |
| `static/style.css` | Tema oscuro, variables CSS, responsive |
| `static/script.js` | Funciones frontend async, fetch API, modales |

### Convenciones de código

- Sin comentarios en el código fuente (salvo docstrings de módulo)
- Nombres de variables y funciones en español
- Templates Jinja2 sin lógica compleja (todo en el backend)
- Las rutas API comienzan con `/api/` y retornan JSON
- La instancia de `MundialData` es singleton global en `app.py`

### API REST (resumen)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/api/tablas` | Tablas de todos los grupos |
| GET | `/api/grupos` | Equipos por grupo |
| GET | `/api/estadisticas` | Estadísticas del torneo |
| GET | `/api/partido/<id>` | Obtener partido |
| POST | `/api/partido/<id>/actualizar` | Actualizar marcador |
| POST | `/api/partido/<id>/eliminar` | Eliminar partido |
| POST | `/api/partido/agregar` | Agregar partido |
| POST | `/api/eliminatorias/generar` | Generar bracket R32 |
| POST | `/api/eliminatorias/actualizar` | Actualizar match KO |
| POST | `/api/eliminatorias/asignar` | Asignar equipo a slot KO |
| POST | `/api/reiniciar` | Reiniciar todos los datos |

### Formato de datos (JSON)

```json
{
  "groups": {"A": ["México", "Sudáfrica", ...], ...},
  "matches": [
    {
      "id": 1, "group": "A",
      "team1": "México", "team2": "Sudáfrica",
      "date": "", "time": "", "stadium": "",
      "halftime1": null, "halftime2": null,
      "fulltime1": null, "fulltime2": null,
      "played": false
    }
  ],
  "knockout": {
    "round_of_32": {"matches": [{"id": "KO-1", "team1": null, ...}]},
    "round_of_16": {"matches": [...]},
    "quarter_finals": {"matches": [...]},
    "semi_finals": {"matches": [...]},
    "third_place": {"team1": null, ...},
    "final": {"team1": null, ...}
  },
  "knockout_generated": false
}
```

### Comandos frecuentes

```bash
python app.py                    # Iniciar servidor
python app.py --no-browser       # Sin abrir navegador
python build.py                  # Compilar .exe
python build.py --onefile        # Compilar un solo archivo
pip install -r requirements.txt  # Instalar dependencias
```

### Notas para el agente

- Las rutas de templates usan `url_for()` de Flask
- La herencia de templates es: `base.html` → `index.html`, `grupos.html`, etc.
- El modal de edición de partidos está en `partidos.html` (no reutilizado vía include)
- Los estilos inline `<style>` en templates son intencionales (específicos de página)
- No usar librerías JS externas (sin jQuery, React, etc.)
- El bracket muestra las rondas horizontalmente con scroll en móvil
