# Diseño: Separar estadísticas en archivo propio + renombrar campos

**Fecha:** 2026-06-12  
**Estado:** Aprobado

## Objetivo

Extraer `goles` y `estadisticas_colectivas` de `resultados.json` a un nuevo archivo `data/estadisticas.json`. Eliminar campos `halftime1`/`halftime2` sin uso en UI. Renombrar `fulltime1`/`fulltime2` → `score1`/`score2`.

## Estructura de archivos resultante

```
data/
  mundial.json        # config estática — grupos, equipos, fechas (sin cambios)
  resultados.json     # marcadores + knockout (sin halftime, sin stats)
  estadisticas.json   # NUEVO — goles + estadisticas_colectivas por partido
```

## Esquemas JSON

### `resultados.json` (después)
```json
{
  "partidos": {
    "1": { "score1": 2, "score2": 0, "played": true }
  },
  "knockout": { "round_of_32": { "matches": [...] }, ... },
  "knockout_generated": false
}
```

### `estadisticas.json` (nuevo)
```json
{
  "partidos": {
    "1": {
      "goles": [
        { "minuto": 8, "equipo": "México", "autor": "Julián Quiñones" }
      ],
      "estadisticas_colectivas": {
        "posicion_balon": { "México": "61%", "Sudáfrica": "39%" }
      }
    }
  }
}
```

## Comportamiento

- `reiniciar()` resetea `resultados.json` y `mundial.json` pero **no toca** `estadisticas.json`
- `guardar()` escribe los tres archivos en cada operación
- Al cargar, los tres archivos se leen y se fusionan en memoria
- Si `estadisticas.json` no existe, se crea vacío `{ "partidos": {} }`
- Migración automática: al primer `guardar()`, `goles`/`estadisticas_colectivas` migran del `resultados.json` viejo al nuevo archivo

## Cambios por archivo

### `data_manager.py`
- Nueva constante `STATS_FILE`
- `_CAMPOS_RESULTADO` = `("score1", "score2", "played")` — elimina halftime y stats
- `_CAMPOS_ESTADISTICAS` = `("goles", "estadisticas_colectivas")` — nueva constante
- `_DEFAULTS_RESULTADO` = `{"score1": None, "score2": None, "played": False}` — sin halftime
- `cargar()` — carga `estadisticas.json` y fusiona en memoria
- `guardar()` — escribe los 3 archivos separados
- `reiniciar()` — solo resetea data/resultados, no stats
- Rename global `fulltime1`/`fulltime2` → `score1`/`score2` en toda la lógica
- Método `_cargar_estadisticas()` para lectura segura del nuevo archivo

### `app.py`
- Rename `fulltime1`/`fulltime2` → `score1`/`score2` en rutas que los referencian

### `static/script.js`
- Reset de partido: eliminar `halftime1`/`halftime2`, renombrar `fulltime` → `score`

### `templates/*.html`
- Rename `fulltime1`/`fulltime2` → `score1`/`score2` en todos los templates
- Eliminar línea de halftime en `partidos.html`

## Invariantes

- `score1` y `score2` son `null` hasta que se registre el resultado
- `played: true` se activa automáticamente cuando ambos scores son no nulos
- Stats de un partido sobreviven aunque se reinicie el torneo
- La fusión en memoria mantiene el mismo shape de objeto partido que hoy
