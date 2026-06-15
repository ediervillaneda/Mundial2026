# Mejoras Eliminatorias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el bracket de eliminatorias en una vista viva que se auto-puebla desde la clasificación actual (sin botón "Generar"), con visual mejorado y modal para asignar equipos.

**Architecture:** `get_knockout_live()` calcula R32 teams en vivo desde clasificación (filtrada por ≥1 partido jugado). R16+ persisten teams de propagación de ganadores. El frontend siempre llama `/api/knockout-live` y renderiza con 3 estados por tarjeta: vacío / con-equipos-sin-jugar / jugado.

**Tech Stack:** Python/Flask, Jinja2, vanilla JS, CSS custom properties (`var(--card)`, `var(--accent)`, etc.)

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `data_manager.py` | filtro ≥1 pj en `obtener_clasificados_a_eliminatorias()`; nuevo método `get_knockout_live()` |
| `app.py` | nueva ruta `GET /api/knockout-live`; simplificar ruta `/eliminatorias` |
| `static/style.css` | líneas más gruesas, glow ganador, animación bkt-arrive, styles modal |
| `templates/eliminatorias.html` | quitar botón generar y sección clasificados; agregar `<dialog>` |
| `static/script.js` | `renderMatch()` 3 estados; `fetchAndRenderBracket()` → `/api/knockout-live`; modal; `editKOMatch()`; `triggerArriveAnimation()`; limpiar código obsoleto |

---

## Task 1: Filtro ≥1 partido jugado en clasificación

**Archivos:**
- Modify: `data_manager.py` (método `obtener_clasificados_a_eliminatorias`, línea ~480)

**Contexto:** `calcular_tabla_grupo()` retorna lista de dicts con campo `pj` (partidos jugados). Actualmente `obtener_clasificados_a_eliminatorias()` toma posiciones 0,1,2 sin filtrar equipos con `pj=0`.

- [ ] **Step 1: Localizar y modificar `obtener_clasificados_a_eliminatorias()`**

Reemplazar el bloque `for grupo, tabla in tablas.items():` en `data_manager.py`:

```python
# ANTES (líneas ~486-491):
for grupo, tabla in tablas.items():
    if len(tabla) >= 3:
        t = list(tabla)
        primeros.append({**t[0], "grupo": grupo})
        segundos.append({**t[1], "grupo": grupo})
        terceros.append({**t[2], "grupo": grupo})

# DESPUÉS:
for grupo, tabla in tablas.items():
    elegibles = [t for t in tabla if t.get("pj", 0) >= 1]
    if len(elegibles) >= 1:
        primeros.append({**elegibles[0], "grupo": grupo})
    if len(elegibles) >= 2:
        segundos.append({**elegibles[1], "grupo": grupo})
    if len(elegibles) >= 3:
        terceros.append({**elegibles[2], "grupo": grupo})
```

- [ ] **Step 2: Verificar manualmente**

Arrancar `python app.py --no-browser`. Ir a `/api/knockout-data` (o invocar `data_mgr.obtener_clasificados_a_eliminatorias()` en python shell) con un estado donde algún equipo no ha jugado. Confirmar que ese equipo no aparece en `clasificados["total"]`.

- [ ] **Step 3: Commit**

```bash
git add data_manager.py
git commit -m "feat(data): filtrar equipos sin partidos jugados de clasificacion KO"
```

---

## Task 2: Nuevo método `get_knockout_live()`

**Archivos:**
- Modify: `data_manager.py` (agregar método después de `generar_eliminatorias`)

**Contexto:** `SIGUIENTE_RONDA` ya está definido como dict en el módulo. `deepcopy` ya se importa al inicio del archivo. El seeding es: `todos_ordenados[i]` vs `todos_ordenados[31-i]` para i en range(16).

- [ ] **Step 1: Agregar `get_knockout_live()` en `data_manager.py`**

Insertar después del método `generar_eliminatorias()` (después de línea ~529):

```python
def get_knockout_live(self):
    clasificados = self.obtener_clasificados_a_eliminatorias()
    todos = clasificados["total"]

    todos_ordenados = sorted(
        todos, key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True
    )

    ko = deepcopy(self.data["knockout"])

    for i in range(16):
        match = ko["round_of_32"]["matches"][i]
        if match.get("score1") is None and match.get("score2") is None:
            match["team1"] = todos_ordenados[i]["team"] if i < len(todos_ordenados) else None
            idx2 = 31 - i
            match["team2"] = todos_ordenados[idx2]["team"] if idx2 < len(todos_ordenados) else None

    return {
        "knockout": ko,
        "clasificados_count": len(todos_ordenados),
        "total_requeridos": 32,
    }
```

- [ ] **Step 2: Verificar en shell**

```python
from data_manager import MundialData
dm = MundialData()
result = dm.get_knockout_live()
print(result["clasificados_count"])
print(result["knockout"]["round_of_32"]["matches"][0])
```

Confirmar que `team1`/`team2` en matches[0] son el 1° y 32° clasificado respectivamente.

- [ ] **Step 3: Commit**

```bash
git add data_manager.py
git commit -m "feat(data): agregar get_knockout_live() para bracket dinamico"
```

---

## Task 3: Ruta `/api/knockout-live` + simplificar `/eliminatorias`

**Archivos:**
- Modify: `app.py`

- [ ] **Step 1: Agregar ruta `/api/knockout-live`**

Insertar después de la ruta `/api/knockout-data` (línea ~207):

```python
@app.route("/api/knockout-live")
def api_knockout_live():
    return jsonify(data_mgr.get_knockout_live())
```

- [ ] **Step 2: Simplificar ruta `/eliminatorias`**

Reemplazar la ruta `/eliminatorias` existente:

```python
@app.route("/eliminatorias")
def eliminatorias():
    clasificados = data_mgr.obtener_clasificados_a_eliminatorias()
    return render_template(
        "eliminatorias.html",
        clasificados=clasificados,
    )
```

- [ ] **Step 3: Verificar**

`python app.py --no-browser`. Ir a `http://localhost:2026/api/knockout-live` en el navegador. Confirmar respuesta JSON con `knockout`, `clasificados_count`, `total_requeridos`.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat(api): agregar /api/knockout-live + simplificar ruta /eliminatorias"
```

---

## Task 4: CSS — mejoras visuales, animación, modal

**Archivos:**
- Modify: `static/style.css`

- [ ] **Step 1: Actualizar líneas conectoras y nombres**

Localizar el bloque de líneas (`.bkt-half-l .bkt-pair::after`, etc. ~línea 533) y reemplazar:

```css
/* Líneas conectoras — más gruesas y con tinte dorado */
.bkt-half-l .bkt-pair::after { content: ''; position: absolute; right: calc(-1 * var(--bkt-cw)); top: 25%; height: 50%; width: 2px; background: linear-gradient(to bottom, rgba(240,180,41,0.2), rgba(255,255,255,0.15)); z-index: 1; }
.bkt-half-l .bkt-match-wrap::after { content: ''; position: absolute; right: calc(-1 * var(--bkt-cw)); top: 50%; transform: translateY(-50%); width: var(--bkt-cw); height: 2px; background: linear-gradient(to right, rgba(255,255,255,0.15), rgba(240,180,41,0.2)); z-index: 1; }
.bkt-half-r .bkt-pair::after { content: ''; position: absolute; left: calc(-1 * var(--bkt-cw)); top: 25%; height: 50%; width: 2px; background: linear-gradient(to bottom, rgba(240,180,41,0.2), rgba(255,255,255,0.15)); z-index: 1; }
.bkt-half-r .bkt-match-wrap::after { content: ''; position: absolute; left: calc(-1 * var(--bkt-cw)); top: 50%; transform: translateY(-50%); width: var(--bkt-cw); height: 2px; background: linear-gradient(to left, rgba(255,255,255,0.15), rgba(240,180,41,0.2)); z-index: 1; }
.bkt-col-single .bkt-pair::after { display: none; }
```

Actualizar `.bkt-name` en la misma sección:

```css
.bkt-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; color: var(--text-muted); font-size: 0.75rem; }
```

- [ ] **Step 2: Winner row + score display en tarjeta jugada**

Agregar después de `.bkt-name.winner { ... }`:

```css
.bkt-team.winner-row {
    background: rgba(240,180,41,0.08);
    border-radius: 3px;
    padding: 0 0.1rem;
    margin: 0 -0.1rem;
}
.bkt-name.winner {
    color: var(--accent);
    font-weight: 700;
    text-shadow: 0 0 8px rgba(240,180,41,0.35);
}
.bkt-score-display {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text);
    min-width: 18px;
    text-align: center;
    flex-shrink: 0;
}
.bkt-sep-center {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.6rem;
    margin: 0.04rem 0;
    line-height: 1;
}
.bkt-card.bkt-empty { opacity: 0.35; }
```

- [ ] **Step 3: Animación bkt-arrive**

Agregar al final de la sección de bracket:

```css
@keyframes bkt-arrive {
    0%   { border-color: rgba(240,180,41,0.85); box-shadow: 0 0 14px rgba(240,180,41,0.45); }
    100% { border-color: var(--border); box-shadow: none; }
}
.bkt-card.bkt-arrive {
    animation: bkt-arrive 0.75s ease-out forwards;
}
```

- [ ] **Step 4: Estilos modal asignación**

Agregar al final del archivo:

```css
/* ── Modal asignación equipo ─────────────────────────────────── */
dialog.bkt-modal {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    padding: 1.2rem;
    min-width: 300px;
    max-width: 380px;
    width: 90vw;
}
dialog.bkt-modal::backdrop { background: rgba(0,0,0,0.65); }
.bkt-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
    font-size: 0.9rem;
    font-weight: 600;
}
#bkt-assign-search {
    width: 100%;
    padding: 0.4rem 0.6rem;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 0.85rem;
    margin-bottom: 0.6rem;
    box-sizing: border-box;
}
#bkt-assign-search:focus { outline: none; border-color: var(--border-hi); }
.bkt-assign-list {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.8rem;
}
.bkt-assign-item {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 0.35rem 0.6rem;
    text-align: left;
    cursor: pointer;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.bkt-assign-item:hover { border-color: var(--border-hi); }
.bkt-assign-item.selected { border-color: var(--accent); background: rgba(240,180,41,0.08); }
.bkt-modal-slots { display: flex; gap: 0.5rem; justify-content: center; }
.clasificados-badge {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 4px;
}
```

- [ ] **Step 5: Commit**

```bash
git add static/style.css
git commit -m "style(bracket): lineas mas gruesas, glow ganador, animacion arrive, modal"
```

---

## Task 5: Template `eliminatorias.html` — simplificar + agregar dialog

**Archivos:**
- Modify: `templates/eliminatorias.html`

- [ ] **Step 1: Reemplazar contenido completo del template**

```html
{% extends "base.html" %}
{% block content %}
<div class="eliminatorias-page">
    <div class="page-header">
        <h1>Eliminatorias</h1>
        <div class="header-actions">
            <span class="clasificados-badge" id="clasificados-counter">— / 32 clasificados</span>
            <button class="btn btn-secondary" onclick="reiniciarEliminatorias()">🔄 Reiniciar</button>
        </div>
    </div>

    <div id="bracket-root"></div>
</div>

<dialog id="bkt-assign-modal" class="bkt-modal">
    <div class="bkt-modal-header">
        <span>Asignar equipo</span>
        <button class="btn-tiny" onclick="document.getElementById('bkt-assign-modal').close()">✕</button>
    </div>
    <input type="search" id="bkt-assign-search" placeholder="Buscar equipo..." autocomplete="off">
    <div id="bkt-assign-list" class="bkt-assign-list"></div>
    <div id="bkt-assign-confirm" class="bkt-modal-slots" style="display:none">
        <button class="btn" onclick="confirmarAsignacion('team1')">→ Local</button>
        <button class="btn" onclick="confirmarAsignacion('team2')">→ Visitante</button>
    </div>
</dialog>

<script>
window._clasificadosData = {{ clasificados.total|tojson|safe }};
</script>
{% endblock %}
```

- [ ] **Step 2: Verificar que la página carga sin errores JS**

`python app.py --no-browser`. Ir a `http://localhost:2026/eliminatorias`. Confirmar que la página carga, no hay errores en consola del navegador, y el contador `— / 32 clasificados` aparece en el header.

- [ ] **Step 3: Commit**

```bash
git add templates/eliminatorias.html
git commit -m "refactor(template): simplificar eliminatorias - quitar seccion clasificados y botones"
```

---

## Task 6: JS — `renderMatch()` con 3 estados

**Archivos:**
- Modify: `static/script.js`

**Contexto:** Reemplazar la función `renderMatch` existente (línea ~231). Los 3 estados son: (1) sin equipos → tarjeta fantasma, (2) con equipos sin jugar → inputs activos, (3) jugado → score como texto con botón ✏️. Todas las tarjetas llevan `data-ronda` y `data-idx` en el div raíz para que `editKOMatch()` pueda localizarlas.

- [ ] **Step 1: Reemplazar `renderMatch()`**

```javascript
function renderMatch(match, ronda, idx) {
    const t1 = match.team1 || null;
    const t2 = match.team2 || null;
    const hasTeams = !!(t1 && t2);
    const w = match.winner;
    const isFinal = ronda === 'final' || ronda === 'third_place';
    const cardExtra = ronda === 'final' ? 'bkt-final' : ronda === 'third_place' ? 'bkt-third' : '';

    // Estado 1: sin equipos (o solo uno)
    if (!hasTeams) {
        return `<div class="bkt-card ${cardExtra} bkt-empty" data-ronda="${ronda}" data-idx="${idx}">
            <div class="bkt-team"><span class="bkt-name">${t1 ? flagImg(t1) : '—'}</span></div>
            <div class="bkt-team"><span class="bkt-name">${t2 ? flagImg(t2) : '—'}</span></div>
            <div class="bkt-actions">
                <button class="btn-tiny" data-action="assign" data-ronda="${ronda}" data-idx="${idx}">👤</button>
            </div>
        </div>`;
    }

    const n1 = 'bkt-name assigned' + (w && w === t1 ? ' winner' : '');
    const n2 = 'bkt-name assigned' + (w && w === t2 ? ' winner' : '');
    const row1Extra = (w && w === t1) ? ' winner-row' : '';
    const row2Extra = (w && w === t2) ? ' winner-row' : '';

    // Estado 3: jugado → score como texto
    if (match.played) {
        const s1 = match.score1 ?? '';
        const s2 = match.score2 ?? '';
        const p1 = match.penalties1 != null ? ` (${match.penalties1})` : '';
        const p2 = match.penalties2 != null ? ` (${match.penalties2})` : '';
        return `<div class="bkt-card bkt-played ${cardExtra}" data-ronda="${ronda}" data-idx="${idx}">
            <div class="bkt-team${row1Extra}">
                <span class="${n1}">${flagImg(t1)}</span>
                <span class="bkt-score-display">${s1}${p1}</span>
            </div>
            <div class="bkt-sep-center">—</div>
            <div class="bkt-team${row2Extra}">
                <span class="${n2}">${flagImg(t2)}</span>
                <span class="bkt-score-display">${s2}${p2}</span>
            </div>
            <div class="bkt-actions">
                <button class="btn-tiny" data-action="edit" data-ronda="${ronda}" data-idx="${idx}">✏️</button>
            </div>
        </div>`;
    }

    // Estado 2: con equipos, sin jugar → inputs activos
    const s1v = match.score1 != null ? match.score1 : '';
    const s2v = match.score2 != null ? match.score2 : '';
    const pen1v = match.penalties1 != null ? match.penalties1 : '';
    const pen2v = match.penalties2 != null ? match.penalties2 : '';
    const penDisplay = match.penalties1 != null ? 'flex' : 'none';
    return `<div class="bkt-card ${cardExtra}" data-ronda="${ronda}" data-idx="${idx}">
        <div class="bkt-team">
            <span class="${n1}">${flagImg(t1)}</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-1" value="${s1v}" min="0" placeholder="0">
            <span class="bkt-sep">-</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-2" value="${s2v}" min="0" placeholder="0">
        </div>
        <div class="bkt-team"><span class="${n2}">${flagImg(t2)}</span></div>
        <div class="bkt-penales" id="bkt-pen-${ronda}-${idx}" style="display:${penDisplay}">
            Pen:
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-1" value="${pen1v}" min="0" placeholder="-">
            <span>-</span>
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-2" value="${pen2v}" min="0" placeholder="-">
        </div>
        <div class="bkt-actions">
            <button class="btn-tiny" data-action="save" data-ronda="${ronda}" data-idx="${idx}">💾</button>
            ${!isFinal ? `<button class="btn-tiny" data-action="toggle-pen" data-ronda="${ronda}" data-idx="${idx}">⚽</button>` : ''}
            <button class="btn-tiny" data-action="assign" data-ronda="${ronda}" data-idx="${idx}">👤</button>
        </div>
    </div>`;
}
```

- [ ] **Step 2: Verificar visualmente**

Recargar `/eliminatorias`. Confirmar que tarjetas sin equipos muestran `—` y están semitransparentes. Tarjetas con equipos pero sin jugar muestran inputs. Si hay partidos jugados en KO, muestran score como texto.

- [ ] **Step 3: Commit**

```bash
git add static/script.js
git commit -m "feat(bracket): renderMatch con 3 estados - vacio/activo/jugado"
```

---

## Task 7: JS — `fetchAndRenderBracket()` + labels con fechas + `_lastKnockout`

**Archivos:**
- Modify: `static/script.js`

**Contexto:** Reemplazar `fetchAndRenderBracket()` existente para usar `/api/knockout-live`. Agregar `_lastKnockout` global para que `editKOMatch()` pueda acceder al último estado del bracket. Actualizar `col()` y `singleCol()` para aceptar label desde `RONDA_LABELS`.

- [ ] **Step 1: Agregar `RONDA_LABELS` y `_lastKnockout`**

Insertar antes de la función `renderBracket`:

```javascript
const RONDA_LABELS = {
    'round_of_32':    '16avos · 29 Jun – 3 Jul',
    'round_of_16':    'Octavos · 5 – 8 Jul',
    'quarter_finals': 'Cuartos · 11 – 12 Jul',
    'semi_finals':    'Semis · 15 – 16 Jul',
    'final':          'Final · 19 Jul',
    'third_place':    '3er Puesto · 19 Jul',
};

let _lastKnockout = null;
```

- [ ] **Step 2: Actualizar `renderBracket()` para usar `RONDA_LABELS`**

Reemplazar la función `renderBracket`:

```javascript
function renderBracket(ko) {
    const r32 = ko.round_of_32.matches;
    const r16 = ko.round_of_16.matches;
    const qf  = ko.quarter_finals.matches;
    const sf  = ko.semi_finals.matches;

    const leftHalf = `<div class="bkt-half bkt-half-l">
        ${col(r32.slice(0, 8), 'round_of_32', 0, RONDA_LABELS['round_of_32'])}
        ${col(r16.slice(0, 4), 'round_of_16', 0, RONDA_LABELS['round_of_16'])}
        ${col(qf.slice(0, 2),  'quarter_finals', 0, RONDA_LABELS['quarter_finals'])}
        ${singleCol(sf[0], 'semi_finals', 0, RONDA_LABELS['semi_finals'])}
    </div>`;

    const center = `<div class="bkt-center">
        <div>
            <div class="bkt-center-label">${RONDA_LABELS['final']}</div>
            ${renderMatch(ko.final, 'final', 0)}
        </div>
        <div>
            <div class="bkt-center-label">${RONDA_LABELS['third_place']}</div>
            ${renderMatch(ko.third_place, 'third_place', 0)}
        </div>
    </div>`;

    const rightHalf = `<div class="bkt-half bkt-half-r">
        ${singleCol(sf[1], 'semi_finals', 1, RONDA_LABELS['semi_finals'])}
        ${col(qf.slice(2, 4),  'quarter_finals', 2, RONDA_LABELS['quarter_finals'])}
        ${col(r16.slice(4, 8), 'round_of_16', 4, RONDA_LABELS['round_of_16'])}
        ${col(r32.slice(8, 16),'round_of_32', 8, RONDA_LABELS['round_of_32'])}
    </div>`;

    return `<div class="bkt-wrapper">${leftHalf}${center}${rightHalf}</div>`;
}
```

- [ ] **Step 3: Reemplazar `fetchAndRenderBracket()`**

```javascript
async function fetchAndRenderBracket() {
    try {
        const { knockout, clasificados_count, total_requeridos } = await fetchJSON('/api/knockout-live');
        _lastKnockout = knockout;

        const counter = document.getElementById('clasificados-counter');
        if (counter) counter.textContent = `${clasificados_count} / ${total_requeridos} clasificados`;

        const root = document.getElementById('bracket-root');
        if (!root) return;
        root.innerHTML = renderBracket(knockout);
    } catch (err) {
        console.error('fetchAndRenderBracket:', err);
    }
}
```

- [ ] **Step 4: Verificar**

Recargar `/eliminatorias`. El contador debe mostrar `X / 32 clasificados`. Las columnas del bracket deben mostrar fechas en los labels (ej: `16avos · 29 Jun – 3 Jul`).

- [ ] **Step 5: Commit**

```bash
git add static/script.js
git commit -m "feat(bracket): bracket live desde /api/knockout-live + labels con fechas oficiales"
```

---

## Task 8: JS — `editKOMatch()` + `triggerArriveAnimation()` + modal asignación

**Archivos:**
- Modify: `static/script.js`

- [ ] **Step 1: Agregar `editKOMatch()`**

Insertar después de `togglePenalesBkt()`:

```javascript
function editKOMatch(ronda, idx) {
    if (!_lastKnockout) return;
    const match = (ronda === 'third_place' || ronda === 'final')
        ? _lastKnockout[ronda]
        : _lastKnockout[ronda]?.matches?.[idx];
    if (!match) return;
    const card = document.querySelector(`.bkt-card[data-ronda="${ronda}"][data-idx="${idx}"]`);
    if (!card) return;
    const editHtml = renderMatch({ ...match, played: false }, ronda, idx);
    card.outerHTML = editHtml;
}
```

- [ ] **Step 2: Agregar `triggerArriveAnimation()`**

```javascript
function triggerArriveAnimation(ronda, idx) {
    const SIGUIENTE_JS = {
        'round_of_32':    { ronda: 'round_of_16',    getIdx: i => Math.floor(i / 2) },
        'round_of_16':    { ronda: 'quarter_finals', getIdx: i => Math.floor(i / 2) },
        'quarter_finals': { ronda: 'semi_finals',    getIdx: i => Math.floor(i / 2) },
        'semi_finals':    { ronda: 'final',          getIdx: () => 0 },
    };
    const next = SIGUIENTE_JS[ronda];
    if (!next) return;
    const nextIdx = next.getIdx(idx);
    const card = document.querySelector(`.bkt-card[data-ronda="${next.ronda}"][data-idx="${nextIdx}"]`);
    if (!card) return;
    card.classList.remove('bkt-arrive');
    void card.offsetWidth;
    card.classList.add('bkt-arrive');
    setTimeout(() => card.classList.remove('bkt-arrive'), 750);
}
```

- [ ] **Step 3: Actualizar `guardarKOMatch()` para disparar animación**

Reemplazar el bloque `if (result.success)` dentro de `guardarKOMatch()`:

```javascript
if (result.success) {
    await fetchAndRenderBracket();   // primero re-render, card destino queda en DOM
    triggerArriveAnimation(ronda, idx);  // después animar card ya existente
} else {
    alert('Error al guardar');
}
```

- [ ] **Step 4: Agregar estado `_assignPending` y reemplazar `asignarEquipoBkt()`**

Reemplazar la función `asignarEquipoBkt` existente:

```javascript
let _assignPending = { ronda: null, idx: null, team: null };

function _renderModalTeams(filtro) {
    const equipos = (window._clasificadosData || []).map(e => e.team);
    const filtrados = filtro
        ? equipos.filter(e => e.toLowerCase().includes(filtro.toLowerCase()))
        : equipos;
    const list = document.getElementById('bkt-assign-list');
    if (!list) return;
    list.innerHTML = filtrados
        .map(e => `<button class="bkt-assign-item" data-team="${e}">${flagImg(e)} ${e}</button>`)
        .join('');
}

function asignarEquipoBkt(ronda, idx) {
    _assignPending = { ronda, idx, team: null };
    const modal = document.getElementById('bkt-assign-modal');
    const searchInput = document.getElementById('bkt-assign-search');
    const confirm = document.getElementById('bkt-assign-confirm');
    if (searchInput) searchInput.value = '';
    if (confirm) confirm.style.display = 'none';
    document.querySelectorAll('.bkt-assign-item').forEach(b => b.classList.remove('selected'));
    _renderModalTeams('');
    modal?.showModal();
}

async function confirmarAsignacion(slot) {
    if (!_assignPending.team || !_assignPending.ronda) return;
    const { ronda, idx, team } = _assignPending;
    document.getElementById('bkt-assign-modal').close();
    const d = await fetchJSON('/api/eliminatorias/asignar', {
        method: 'POST',
        body: JSON.stringify({ ronda, idx, slot, team }),
    });
    if (d.success) {
        await fetchAndRenderBracket();
    } else {
        alert('Error: ' + d.error);
    }
}
```

- [ ] **Step 5: Actualizar `reiniciarEliminatorias()`**

Reemplazar la función existente:

```javascript
async function reiniciarEliminatorias() {
    if (!confirm('¿Reiniciar eliminatorias? Se perderán los resultados KO.')) return;
    await fetchJSON('/api/eliminatorias/reiniciar', { method: 'POST' });
    await fetchAndRenderBracket();
}
```

- [ ] **Step 6: Commit**

```bash
git add static/script.js
git commit -m "feat(bracket): editKOMatch, triggerArriveAnimation, modal asignacion"
```

---

## Task 9: JS — event delegation + limpieza de código obsoleto

**Archivos:**
- Modify: `static/script.js`

- [ ] **Step 1: Actualizar event delegation en `DOMContentLoaded`**

Reemplazar el bloque `root.addEventListener('click', ...)` dentro de `DOMContentLoaded`:

```javascript
root.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, ronda } = btn.dataset;
    const idx = +btn.dataset.idx;
    if (action === 'save')       guardarKOMatch(ronda, idx);
    if (action === 'toggle-pen') togglePenalesBkt(ronda, idx);
    if (action === 'assign')     asignarEquipoBkt(ronda, idx);
    if (action === 'edit')       editKOMatch(ronda, idx);
});
```

- [ ] **Step 2: Agregar listeners del modal en `DOMContentLoaded`**

Insertar después del `root.addEventListener`:

```javascript
const assignList = document.getElementById('bkt-assign-list');
if (assignList) {
    assignList.addEventListener('click', e => {
        const btn = e.target.closest('.bkt-assign-item');
        if (!btn) return;
        _assignPending.team = btn.dataset.team;
        document.querySelectorAll('.bkt-assign-item').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const confirm = document.getElementById('bkt-assign-confirm');
        if (confirm) confirm.style.display = 'flex';
    });
}

const assignSearch = document.getElementById('bkt-assign-search');
if (assignSearch) {
    assignSearch.addEventListener('input', e => _renderModalTeams(e.target.value));
}
```

- [ ] **Step 3: Eliminar código obsoleto**

Borrar del archivo `static/script.js`:
- Función `generarEliminatorias()` (ya no hay botón "Generar")
- La lógica de `btn-generar` / `btn-regenerar` dentro del viejo `fetchAndRenderBracket()` (ya reemplazado)

Verificar que el archivo no tenga referencias a `clasificados-section`, `btn-generar`, `btn-regenerar`.

- [ ] **Step 4: Verificar flujo completo**

Arrancar `python app.py`. Ir a `/eliminatorias`.
1. Bracket muestra state actual (tarjetas vacías o con equipos según datos)
2. Labels de columna muestran fechas
3. Counter muestra `X / 32 clasificados`
4. Click 👤 en una tarjeta → modal abre con lista de equipos
5. Buscar equipo en search → lista se filtra
6. Seleccionar equipo → botones "→ Local / → Visitante" aparecen
7. Seleccionar slot → equipo asignado, modal cierra, bracket actualiza
8. Ingresar marcador y guardar → tarjeta muestra score como texto, tarjeta destino hace pulse dorado
9. Click ✏️ en tarjeta jugada → inputs aparecen para editar

- [ ] **Step 5: Commit final**

```bash
git add static/script.js
git commit -m "feat(bracket): event delegation actualizado + listeners modal + limpieza obsoleto"
```

---

## Task 10: Verificación final + PR

- [ ] **Step 1: Smoke test completo**

Verificar todos estos casos en el navegador:
- [ ] `/eliminatorias` carga sin errores en consola
- [ ] Counter actualiza con clasificados actuales
- [ ] Fechas visibles en cada columna del bracket
- [ ] Tarjeta vacía: semitransparente, solo botón 👤
- [ ] Tarjeta con equipos sin jugar: inputs activos, botones 💾 ⚽ 👤
- [ ] Tarjeta jugada: score como texto, botón ✏️
- [ ] Click ✏️ → tarjeta pasa a modo edición
- [ ] Modal: abre, busca, selecciona equipo, elige slot, cierra y actualiza
- [ ] Guardar resultado KO → tarjeta destino hace pulse dorado
- [ ] Botón Reiniciar → limpia resultados KO, bracket muestra clasificación live de nuevo
- [ ] `/grupos`, `/partidos`, `/estadisticas` no regresionan

- [ ] **Step 2: Crear PR**

```bash
git push -u origin feat/eliminatorias-mejoras
gh pr create --title "feat: bracket eliminatorias vivo + visual mejorado + modal asignacion" --body "$(cat <<'EOF'
## Summary
- Bracket auto-puebla desde clasificación viva (sin botón Generar)
- Equipos sin partidos jugados excluidos de clasificación
- 3 estados visuales por tarjeta: vacío / activo / jugado
- Score como texto en tarjetas jugadas, botón ✏️ para editar
- Animación pulse dorado al avanzar ganador
- Líneas conectoras más gruesas con gradiente dorado
- Modal nativo `<dialog>` reemplaza `prompt()` para asignar equipos
- Labels de columna con fechas oficiales del Mundial 2026

## Test plan
- [ ] Bracket carga sin errores en consola
- [ ] Counter muestra clasificados actuales
- [ ] Los 3 estados de tarjeta renderizan correctamente
- [ ] Modal busca y asigna equipos
- [ ] Animación pulse al guardar resultado KO
- [ ] Reiniciar limpia resultados KO
- [ ] Sin regresiones en grupos/partidos/estadísticas

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
