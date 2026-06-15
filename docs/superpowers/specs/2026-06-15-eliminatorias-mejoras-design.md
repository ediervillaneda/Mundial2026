# Mejoras Eliminatorias — Design Spec

**Fecha:** 2026-06-15  
**Rama:** `feat/eliminatorias-mejoras`

---

## Objetivo

1. Bracket vivo: se auto-puebla desde clasificación actual sin botón "Generar".
2. Validación: equipo necesita ≥1 partido jugado para clasificar.
3. Visual minimalista mejorado: tarjetas más limpias, animaciones, líneas más vistosas.
4. Features: fechas oficiales en labels, modal para asignar equipos.

---

## Arquitectura

### Nuevo modelo de datos para bracket

`round_of_32` ya no persiste los equipos en `data/resultados.json`. Los teams de R32 se calculan en vivo desde clasificación actual en cada request.

`round_of_16`, `quarter_finals`, `semi_finals`, `third_place`, `final` siguen persistiendo teams (vienen de propagación de ganadores KO).

**Regla de bloqueo:** si un partido de R32 ya tiene `score1/score2` (fue jugado), sus equipos NO se sobreescriben aunque cambie la clasificación. El `winner` propagado a R16 tampoco cambia.

### Nueva ruta `GET /api/knockout-live`

Devuelve:
```json
{
  "knockout": { ...estructura existente... },
  "clasificados_count": 24,
  "total_requeridos": 32
}
```

`knockout.round_of_32.matches[i].team1/team2` vienen de clasificación viva (semilla 1° vs 32°, 2° vs 31°, …), excepto partidos ya jugados que usan sus equipos originales.

### Ruta `/api/knockout-data` (existente)

Se mantiene sin cambios para no romper compatibilidad, pero el frontend migra a `/api/knockout-live`.

---

## Cambios por archivo

### `data_manager.py`

**`obtener_clasificados_a_eliminatorias()`**  
Agregar filtro: equipo solo clasifica si tiene al menos 1 partido con `played: true` en su grupo. Sin este filtro, equipos sin partidos jugados aparecen en posiciones de clasificación con 0 puntos.

**Nuevo método `get_knockout_live()`**  
```
1. Obtener clasificación actual (con filtro ≥1 jugado)
2. Copiar estructura knockout existente (deepcopy)
3. Para i in range(16):
     match = knockout.round_of_32.matches[i]
     si match NO tiene score1/score2:
       asignar todos_ordenados[i] → team1
       asignar todos_ordenados[31-i] → team2 (si existen)
     si match YA tiene score1/score2: no tocar
4. Retornar knockout modificado + count de clasificados
```

**`reiniciar_eliminatorias()`**  
Eliminar `knockout_generated = False` ya que ese flag pierde relevancia. Solo limpia la estructura KO.

### `app.py`

- Nueva ruta `GET /api/knockout-live` → llama `data_mgr.get_knockout_live()`
- Ruta `/eliminatorias`: ya no necesita pasar `generado` ni `rondas_info`/`rondas_order` al template (se simplifican los argumentos)
- Eliminar ruta `POST /api/eliminatorias/generar` (o mantener pero marcar como deprecated)

### `static/script.js`

**`fetchAndRenderBracket()`**  
Migrar de `/api/knockout-data` a `/api/knockout-live`. Siempre renderiza bracket (aunque clasificados < 32).

**`renderMatch(match, ronda, idx)`**  
Tres estados visuales:

| Estado | Condición | Render |
|--------|-----------|--------|
| Vacío | `!team1 && !team2` | Placeholder `—`, inputs ocultos |
| Con equipos, sin jugar | `team1 && team2 && !played` | Nombres + inputs activos |
| Jugado | `played === true` | Score como texto `3 — 1`, inputs ocultos, botón ✏️ para editar |

Modo edición en tarjeta jugada: click en ✏️ muestra inputs pre-cargados con score actual.

**`renderBracket(ko)`**  
Labels de columna con fechas oficiales:
- `16avos · 29 Jun – 3 Jul`
- `Octavos · 5 – 8 Jul`
- `Cuartos · 11 – 12 Jul`
- `Semis · 15 – 16 Jul`
- `Final · 19 Jul` / `3er Puesto · 19 Jul`

**`asignarEquipoBkt(ronda, idx)`**  
Reemplazar los dos `prompt()` por `<dialog>` nativo con:
- Campo `<input type="search">` para filtrar
- Lista de equipos clasificados como `<button>` clickeables
- Dos pasos: seleccionar equipo → seleccionar slot (team1/team2)
- `dialog` se inserta una vez en el DOM al cargar la página, se reutiliza

**Animación avance ganador**  
Después de `guardarKOMatch()` exitoso, identificar tarjeta destino en ronda siguiente y agregarle clase `bkt-arrive` por 700ms, luego remover.

**Eliminar:**
- `generarEliminatorias()`
- `reiniciarEliminatorias()` → simplificar a solo limpiar KO (sin toggle de sección clasificados)
- Lógica de `btn-generar` / `btn-regenerar`

### `static/style.css`

**Líneas conectoras**
```css
/* antes */
background: var(--bkt-line); /* rgba(255,255,255,0.1) */
/* después */
background: linear-gradient(to right, rgba(240,180,41,0.15), rgba(255,255,255,0.2));
height/width: 2px; /* antes 1px */
```

**Nombres de equipo**
```css
.bkt-name { max-width: 110px; } /* antes 82px */
```

**Fila ganadora**
```css
.bkt-team.winner-row {
  background: rgba(240,180,41,0.08);
  border-radius: 3px;
}
.bkt-name.winner {
  color: var(--accent);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(240,180,41,0.4);
}
```

**Tarjeta jugada**
```css
.bkt-card.bkt-played .bkt-score-display {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
```

**Animación arrive**
```css
@keyframes bkt-arrive {
  0%   { border-color: rgba(240,180,41,0.8); box-shadow: 0 0 12px rgba(240,180,41,0.5); }
  100% { border-color: var(--border); box-shadow: none; }
}
.bkt-card.bkt-arrive {
  animation: bkt-arrive 0.7s ease-out forwards;
}
```

**Modal asignación**
```css
dialog.bkt-modal { ... }
dialog.bkt-modal::backdrop { background: rgba(0,0,0,0.6); }
```

### `templates/eliminatorias.html`

- Eliminar botones "Generar Bracket" y "Re-generar"
- Eliminar `#clasificados-section` (lista de chips dorado/plata/bronce) — ya no necesaria
- Mantener conteo simple: `<span>X / 32 clasificados</span>` en header
- `<dialog id="bkt-assign-modal">` agregado al final del body

---

## Flujo completo post-cambio

1. Usuario entra a `/eliminatorias`
2. Page load → `fetchAndRenderBracket()` → `/api/knockout-live`
3. Backend calcula clasificación live (filtro ≥1 jugado)
4. R32 slots se pueblan con equipos actuales (slots sin equipo muestran `—`)
5. Usuario ingresa resultado KO → `guardarKOMatch()` → animación en tarjeta destino → re-render
6. Si cambia resultado de grupo → bracket R32 se actualiza en próximo fetch (excepto partidos ya jugados)

---

## Qué NO cambia

- Estructura JSON de `data/resultados.json` (knockout persiste R16+)
- Lógica de propagación `_propagar_avance()`
- Penales en KO
- Flags / `BANDERAS_JS`
- Rutas de grupos, partidos, estadísticas
