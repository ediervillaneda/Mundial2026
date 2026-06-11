# Bracket Visual — Diseño

**Fecha:** 2026-06-11
**Alcance:** Reemplazar el bracket actual de `/eliminatorias` con una gráfica visual tipo torneo (izquierda-derecha hacia el centro) con actualización automática sin recarga de página tras guardar resultados.

---

## 1. Arquitectura

### Nuevo endpoint
`GET /api/knockout-data` en `app.py`:
- Devuelve `{ "knockout": {...}, "knockout_generated": bool }`
- No recalcula tablas — solo expone `data_mgr.data["knockout"]` y `data_mgr.data["knockout_generated"]`

### División de responsabilidades
| Capa | Responsabilidad |
|---|---|
| Jinja2 (`eliminatorias.html`) | Shell de página: encabezado, botón "Generar bracket", botón "Re-generar", sección de clasificados (pre-bracket), `<div id="bracket-root">` vacío |
| JS (`script.js`) | Fetch de datos, render completo del bracket, manejo de inputs/botones, event delegation |
| CSS (`style.css`) | Layout de columnas, tarjetas, líneas conectoras, estados ganador/pendiente |

### Flujo de datos
```
DOMContentLoaded
    └─ fetchAndRenderBracket()
           └─ GET /api/knockout-data
                  └─ renderBracket(knockout) → bracket-root.innerHTML

guardarKOMatch(ronda, idx)
    └─ POST /api/eliminatorias/actualizar
           └─ [éxito] fetchAndRenderBracket()   ← sin location.reload()
```

Los flujos de `generarEliminatorias()` y `reiniciarEliminatorias()` también llaman `fetchAndRenderBracket()` en lugar de `location.reload()`.

---

## 2. Layout visual

### Estructura de columnas (9 columnas totales)

```
[R32-L] [R16-L] [QF-L] [SF-L] | FINAL+3ro | [SF-R] [QF-R] [R16-R] [R32-R]
```

- **Mitad izquierda:** R32 índices 0-7 → R16 índices 0-3 → QF índices 0-1 → SF índice 0
- **Centro:** Final (arriba) + Tercer Puesto (abajo, separado por gap)
- **Mitad derecha (espejo):** SF índice 1 → QF índices 2-3 → R16 índices 4-7 → R32 índices 8-15

La mitad derecha fluye de derecha a izquierda hacia el centro — el orden visual de las columnas se invierte respecto a la izquierda.

### Espaciado vertical por ronda
El espacio entre tarjetas se duplica al avanzar hacia el centro, generando el embudo:

| Ronda | Tarjetas | Gap entre pares |
|---|---|---|
| R32 | 8 | 0 (adyacentes en pares) |
| R16 | 4 | 1 tarjeta |
| QF | 2 | 3 tarjetas |
| SF | 1 | 7 tarjetas |

Implementado con `justify-content: space-around` en columnas flex verticales.

### Líneas conectoras (CSS puro)
Cada par de tarjetas hermanas se envuelve en `.match-pair`. El wrapper dibuja:
- Borde derecho vertical que une las dos tarjetas
- Borde horizontal que sale del centro del par hacia la derecha (hacia la siguiente ronda)

Para la mitad derecha, los conectores usan `border-left` en vez de `border-right` — mismo patrón de wrapper, dirección opuesta. No se usa `transform: scaleX(-1)` para evitar voltear el texto.

### Tarjeta de partido
```
┌──────────────────────────┐
│ Team1           [2] ──── │──→ (conector)
│ Team2           [1]      │
│           [💾] [⚽ Pen]  │
└──────────────────────────┘
```
- Ganador: `border-left: 3px solid #2ecc71` + nombre en `font-weight: bold`
- Equipo no asignado: texto `—` en color `var(--text-muted)`
- Partido jugado: fondo ligeramente distinto (`rgba(46,204,113,0.05)`)
- Score inputs: `width: 40px`, centrados
- Fila de penales: `display:none` por defecto, toggle con ⚽ Pen
- Partido de Final y Tercer Puesto: tarjeta más ancha (`.final-card`)

---

## 3. Motor JS de renderizado

### `fetchAndRenderBracket()`
```js
async function fetchAndRenderBracket() {
    const { knockout, knockout_generated } = await fetchJSON('/api/knockout-data');
    const root = document.getElementById('bracket-root');
    if (!knockout_generated) { root.innerHTML = ''; return; }
    root.innerHTML = renderBracket(knockout);
}
```

### `renderBracket(knockout)`
Retorna string HTML con:
1. `.bracket-wrapper` (flex row, `overflow-x: auto`)
2. `.bracket-half.left` con columnas: R32[0-7], R16[0-3], QF[0-1], SF[0]
3. `.bracket-center` con Final + separador + Tercer Puesto
4. `.bracket-half.right` con columnas (orden inverso): SF[1], QF[2-3], R16[4-7], R32[8-15]

### `renderRound(matches, ronda, idxOffset)`
Renderiza una columna entera. `idxOffset` indica el índice de inicio en el array de la ronda (ej: R16 derecho empieza en idx 4). Agrupa en `.match-pair` de a 2.

### `renderMatch(match, ronda, idx)`
Retorna HTML de una tarjeta. Datos de `match`: `team1`, `team2`, `score1`, `score2`, `penalties1`, `penalties2`, `winner`, `played`.

Botones llevan `data-action`, `data-ronda`, `data-idx` para event delegation.

### Event delegation
Único listener en `#bracket-root` — sobrevive a re-renders:
```js
document.getElementById('bracket-root').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, ronda, idx } = btn.dataset;
    if (action === 'save')       guardarKOMatch(ronda, +idx);
    if (action === 'toggle-pen') togglePenales(ronda, +idx);
    if (action === 'assign')     asignarEquipoKO(ronda, +idx);
});
```

### Funciones actualizadas
- `guardarKOMatch` → reemplaza `location.reload()` con `fetchAndRenderBracket()`
- `generarEliminatorias` → igual
- `reiniciarEliminatorias` → igual
- `togglePenales` → opera sobre el DOM re-renderizado (busca por `data-ronda`/`data-idx`)
- `asignarEquipoKO` → sin cambios en lógica, llama `fetchAndRenderBracket()` al final

---

## 4. Manejo de errores y estados

| Estado | Comportamiento |
|---|---|
| `knockout_generated = false` | `bracket-root` vacío; sección de clasificados visible |
| Fetch falla | `console.error`; bracket no se borra (muestra última versión) |
| Save falla | `alert('Error al guardar')` — sin re-render (datos no cambiaron) |
| Equipo `null` | Muestra `—`; inputs de score deshabilitados hasta tener ambos equipos |

---

## 5. Archivos modificados

| Archivo | Cambio |
|---|---|
| `app.py` | Añadir `GET /api/knockout-data` |
| `data_manager.py` | Sin cambios |
| `templates/eliminatorias.html` | Eliminar bracket Jinja2; dejar shell + `<div id="bracket-root">` |
| `static/script.js` | Añadir `fetchAndRenderBracket`, `renderBracket`, `renderRound`, `renderMatch`; actualizar handlers |
| `static/style.css` | Añadir estilos de bracket: columnas, conectores, tarjetas, ganador |
