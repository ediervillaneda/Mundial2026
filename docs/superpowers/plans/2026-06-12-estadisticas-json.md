# Estadísticas en archivo propio + rename fulltime→score

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer `goles`/`estadisticas_colectivas` de `resultados.json` a `data/estadisticas.json`, eliminar campos `halftime`, y renombrar `fulltime1/2` → `score1/2` en todo el proyecto.

**Architecture:** Tres archivos JSON separados en `data/`. `data_manager.py` carga y escribe los tres en cada operación. `reiniciar()` no toca `estadisticas.json`. La fusión ocurre en memoria — el shape del objeto `partido` en RAM no cambia para el resto de la app.

**Tech Stack:** Python 3, Flask, JSON, Jinja2, vanilla JS.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `data_manager.py` | Constantes, cargar(), guardar(), reiniciar(), rename fulltime→score |
| `static/script.js` | Rename fulltime→score, eliminar halftime del reset |
| `templates/partidos.html` | Rename + eliminar línea halftime |
| `templates/grupo_detalle.html` | Rename fulltime→score |
| `templates/index.html` | Rename fulltime→score |
| `templates/estadisticas.html` | Rename fulltime→score |

---

## Task 1: Actualizar constantes en data_manager.py

**Files:**
- Modify: `data_manager.py:1-10` (imports y constantes)
- Modify: `data_manager.py:74-76` (campos)

- [ ] **Step 1: Agregar import sys (ya existe) y constante STATS_FILE**

Reemplazar el bloque de constantes en `data_manager.py` líneas 1-7 y 74-76:

```python
# Líneas 1-7 — agregar STATS_FILE después de RESULTS_FILE
import json
import os
import sys
from copy import deepcopy
from datetime import datetime


def _base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


DATA_FILE = os.path.join(_base_dir(), "data", "mundial.json")
RESULTS_FILE = os.path.join(_base_dir(), "data", "resultados.json")
STATS_FILE = os.path.join(_base_dir(), "data", "estadisticas.json")
```

- [ ] **Step 2: Actualizar _CAMPOS_RESULTADO, _CAMPOS_ESTADISTICAS y _DEFAULTS_RESULTADO**

Reemplazar líneas 74-76 (los tres `_CAMPOS_*` / `_DEFAULTS_*`):

```python
_CAMPOS_CONFIG = ("id", "group", "team1", "team2", "date", "time")
_CAMPOS_RESULTADO = ("score1", "score2", "played")
_CAMPOS_ESTADISTICAS = ("goles", "estadisticas_colectivas")
_DEFAULTS_RESULTADO = {"score1": None, "score2": None, "played": False}
```

- [ ] **Step 3: Actualizar _generar_partidos_grupos_iniciales() — eliminar halftime**

Reemplazar el bloque del partido generado (líneas ~140-154):

```python
partidos.append(
    {
        "id": mid,
        "group": grupo,
        "team1": equipos[i],
        "team2": equipos[j],
        "date": fecha,
        "time": hora,
        "score1": None,
        "score2": None,
        "played": False,
    }
)
```

- [ ] **Step 4: Verificar sintaxis**

```bash
python -m py_compile data_manager.py && echo OK
```

Esperado: `OK`

- [ ] **Step 5: Commit**

```bash
git add data_manager.py
git commit -m "refactor(data): agregar STATS_FILE y actualizar constantes de campos"
```

---

## Task 2: Agregar _cargar_estadisticas() y actualizar cargar()

**Files:**
- Modify: `data_manager.py` — método `_cargar_estadisticas()` nuevo + `cargar()`

- [ ] **Step 1: Agregar método _cargar_estadisticas()**

Insertar después de `_cargar_resultados()` (después de línea ~249):

```python
def _cargar_estadisticas(self):
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"partidos": {}}
```

- [ ] **Step 2: Actualizar cargar() para cargar estadísticas y fusionar**

Reemplazar el método `cargar()` completo (líneas ~188-211):

```python
def cargar(self):
    config = self._cargar_config()
    resultados = self._cargar_resultados(config)
    estadisticas = self._cargar_estadisticas()

    self.data = {
        "groups": config.get("groups", deepcopy(GRUPOS_2026)),
        "matches": [],
        "knockout": resultados.get("knockout", _crear_knockout_vacio()),
        "knockout_generated": resultados.get("knockout_generated", False),
    }

    partidos_res = resultados.get("partidos", {})
    stats_res = estadisticas.get("partidos", {})
    config_matches = config.get("matches", [])
    for m in config_matches:
        partido = {k: m[k] for k in _CAMPOS_CONFIG if k in m}
        partido.update(_DEFAULTS_RESULTADO.copy())
        mid = str(m.get("id", ""))
        if mid in partidos_res:
            partido.update({k: v for k, v in partidos_res[mid].items() if k in _CAMPOS_RESULTADO})
        if mid in stats_res:
            partido.update({k: v for k, v in stats_res[mid].items() if k in _CAMPOS_ESTADISTICAS})
        self.data["matches"].append(partido)

    # Migración: si resultados.json viejo tiene fulltime1 o goles, los mueve
    needs_save = False
    for m in self.data["matches"]:
        mid = str(m.get("id", ""))
        old = partidos_res.get(mid, {})
        if "fulltime1" in old and m.get("score1") is None:
            m["score1"] = old["fulltime1"]
            m["score2"] = old["fulltime2"]
            m["played"] = old.get("played", False)
            needs_save = True
        if "goles" in old and not m.get("goles"):
            m["goles"] = old["goles"]
            needs_save = True
        if "estadisticas_colectivas" in old and not m.get("estadisticas_colectivas"):
            m["estadisticas_colectivas"] = old["estadisticas_colectivas"]
            needs_save = True
    if needs_save:
        self.guardar()
```

- [ ] **Step 3: Verificar sintaxis**

```bash
python -m py_compile data_manager.py && echo OK
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add data_manager.py
git commit -m "feat(data): agregar _cargar_estadisticas() y migración automática en cargar()"
```

---

## Task 3: Actualizar guardar() para escribir tres archivos

**Files:**
- Modify: `data_manager.py` — método `guardar()`

- [ ] **Step 1: Reemplazar guardar() completo** (líneas ~251-273):

```python
def guardar(self):
    data_dir = os.path.dirname(DATA_FILE)
    os.makedirs(data_dir, exist_ok=True)

    config = {
        "groups": self.data["groups"],
        "matches": [{k: m[k] for k in _CAMPOS_CONFIG if k in m} for m in self.data["matches"]],
    }
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    partidos_res = {}
    for m in self.data["matches"]:
        if m.get("played") or m.get("score1") is not None:
            partidos_res[str(m["id"])] = {k: m[k] for k in _CAMPOS_RESULTADO if k in m}

    resultados = {
        "partidos": partidos_res,
        "knockout": self.data["knockout"],
        "knockout_generated": self.data["knockout_generated"],
    }
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(resultados, f, indent=2, ensure_ascii=False)

    partidos_stats = {}
    for m in self.data["matches"]:
        entry = {k: m[k] for k in _CAMPOS_ESTADISTICAS if k in m}
        if entry:
            partidos_stats[str(m["id"])] = entry

    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump({"partidos": partidos_stats}, f, indent=2, ensure_ascii=False)
```

- [ ] **Step 2: Verificar sintaxis**

```bash
python -m py_compile data_manager.py && echo OK
```

Esperado: `OK`

- [ ] **Step 3: Test rápido — cargar, guardar, verificar tres archivos**

```bash
python -c "
import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')
from data_manager import MundialData, STATS_FILE, RESULTS_FILE
dm = MundialData()
dm.guardar()
print('STATS_FILE existe:', os.path.exists(STATS_FILE))
with open(RESULTS_FILE, encoding='utf-8') as f:
    r = json.load(f)
primer = list(r['partidos'].values())[0] if r['partidos'] else {}
print('Keys en resultados:', list(primer.keys()))
print('NO contiene fulltime1:', 'fulltime1' not in primer)
print('NO contiene goles:', 'goles' not in primer)
"
```

Esperado:
```
STATS_FILE existe: True
Keys en resultados: ['score1', 'score2', 'played']
NO contiene fulltime1: True
NO contiene goles: True
```

- [ ] **Step 4: Commit**

```bash
git add data_manager.py
git commit -m "feat(data): guardar() escribe tres archivos JSON separados"
```

---

## Task 4: Actualizar reiniciar() para no tocar estadisticas.json

**Files:**
- Modify: `data_manager.py` — método `reiniciar()`

- [ ] **Step 1: Reemplazar reiniciar()** (líneas ~567-569):

```python
def reiniciar(self):
    estadisticas = self._cargar_estadisticas()
    self.data = crear_estructura_inicial()
    # Restaurar estadísticas — sobreviven el reset
    for m in self.data["matches"]:
        mid = str(m["id"])
        if mid in estadisticas.get("partidos", {}):
            m.update({k: v for k, v in estadisticas["partidos"][mid].items() if k in _CAMPOS_ESTADISTICAS})
    self.guardar()
```

- [ ] **Step 2: Verificar sintaxis**

```bash
python -m py_compile data_manager.py && echo OK
```

Esperado: `OK`

- [ ] **Step 3: Test — reiniciar no borra estadísticas**

```bash
python -c "
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from data_manager import MundialData
dm = MundialData()
# Simular que partido 1 tiene goles
dm.data['matches'][0]['goles'] = [{'minuto': 8, 'equipo': 'Test', 'autor': 'Test Player'}]
dm.guardar()
# Reiniciar
dm.reiniciar()
goles = dm.data['matches'][0].get('goles', [])
print('Goles sobreviven reset:', len(goles) > 0)
print('score1 reseteado:', dm.data['matches'][0]['score1'] is None)
"
```

Esperado:
```
Goles sobreviven reset: True
score1 reseteado: True
```

- [ ] **Step 4: Commit**

```bash
git add data_manager.py
git commit -m "feat(data): reiniciar() preserva estadisticas.json"
```

---

## Task 5: Rename fulltime→score en data_manager.py

**Files:**
- Modify: `data_manager.py` — todos los usos de `fulltime1`/`fulltime2`

- [ ] **Step 1: Rename en _cargar_resultados()** (línea ~246):

```python
if resultado.get("played") or resultado.get("score1") is not None:
```

- [ ] **Step 2: Rename en actualizar_partido()** (líneas ~304-315):

```python
def actualizar_partido(self, match_id, datos):
    partido = self.get_partido(match_id)
    if partido:
        datos.pop("date", None)
        datos.pop("time", None)
        partido.update(datos)
        if (
            partido.get("score1") is not None
            and partido.get("score2") is not None
        ):
            partido["played"] = True
        else:
            partido["played"] = False
        self.guardar()
        return True
    return False
```

- [ ] **Step 3: Rename en calcular_tabla_grupo()** (línea ~346):

```python
g1, g2 = p["score1"], p["score2"]
```

- [ ] **Step 4: Rename en _desempate_head2head()** (línea ~412):

```python
g1, g2 = p["score1"], p["score2"]
```

- [ ] **Step 5: Rename en get_estadisticas()** (línea ~584):

```python
(m["score1"] or 0) + (m["score2"] or 0)
```

- [ ] **Step 6: Rename en obtener_estadisticas_pagina()** (líneas ~618, ~664, ~674):

```python
# línea ~618
g1, g2 = m["score1"], m["score2"]

# línea ~664
key=lambda m: (m["score1"] + m["score2"]),

# línea ~674
(m["score1"] or 0) + (m["score2"] or 0) for m in partidos_jugados
```

- [ ] **Step 7: Verificar que no queda ningún fulltime**

```bash
python -c "
import re
with open('data_manager.py') as f:
    content = f.read()
matches = re.findall(r'fulltime', content)
print('Ocurrencias fulltime restantes:', len(matches))
"
```

Esperado: `Ocurrencias fulltime restantes: 0`

- [ ] **Step 8: Verificar sintaxis y carga completa**

```bash
python -c "
import sys
sys.stdout.reconfigure(encoding='utf-8')
from data_manager import MundialData
dm = MundialData()
jugados = [m for m in dm.get_todos_partidos() if m['played']]
print('Partidos jugados:', len(jugados))
for m in jugados:
    print(f'  id={m[\"id\"]} score={m[\"score1\"]}-{m[\"score2\"]}')
"
```

Esperado: lista de partidos con claves `score1`/`score2`.

- [ ] **Step 9: Commit**

```bash
git add data_manager.py
git commit -m "refactor(data): rename fulltime1/2 -> score1/2 en data_manager.py"
```

---

## Task 6: Rename en templates HTML

**Files:**
- Modify: `templates/grupo_detalle.html:58`
- Modify: `templates/index.html:63`
- Modify: `templates/partidos.html:43-44`
- Modify: `templates/estadisticas.html:104,106,124,209`

- [ ] **Step 1: grupo_detalle.html línea 58**

```html
<strong>{{ p.score1 }} – {{ p.score2 }}</strong>
```

- [ ] **Step 2: index.html línea 63**

```html
<strong>{{ p.score1 }} – {{ p.score2 }}</strong>
```

- [ ] **Step 3: partidos.html — rename + eliminar línea halftime**

Línea 43 — cambiar a:
```html
<strong>{{ p.score1 }} – {{ p.score2 }}</strong>
```

Línea 44 — **eliminar** completamente:
```html
{% if p.halftime1 is not none %}<small>({{ p.halftime1 }}-{{ p.halftime2 }})</small>{% endif %}
```

- [ ] **Step 4: estadisticas.html — 4 ocurrencias**

Línea 104:
```html
<span class="mejor-score">{{ p.score1 }} – {{ p.score2 }}</span>
```

Línea 106:
```html
<span class="mejor-total">{{ p.score1 + p.score2 }} goles</span>
```

Línea 124:
```html
<span class="det-teams">{{ p.team1 | flag }} <strong>{{ p.score1 }} – {{ p.score2 }}</strong> {{ p.team2 | flag_r }}</span>
```

Línea 209:
```html
<option value="{{ p.id }}">{{ p.group }} · {{ p.team1 }} {{ p.score1 }}–{{ p.score2 }} {{ p.team2 }}</option>
```

- [ ] **Step 5: Verificar que no queda fulltime en templates**

```bash
python -c "
import os, re
count = 0
for root, _, files in os.walk('templates'):
    for f in files:
        path = os.path.join(root, f)
        text = open(path, encoding='utf-8').read()
        n = len(re.findall(r'fulltime|halftime', text))
        if n:
            print(f'{path}: {n} ocurrencias')
            count += n
print('Total:', count)
"
```

Esperado: `Total: 0`

- [ ] **Step 6: Commit**

```bash
git add templates/
git commit -m "refactor(templates): rename fulltime->score, eliminar halftime"
```

---

## Task 7: Rename en script.js

**Files:**
- Modify: `static/script.js:94` y `static/script.js:130`

- [ ] **Step 1: Línea 94 — rename en autoguardado**

```js
body: JSON.stringify({ score1: s1, score2: s2 }),
```

- [ ] **Step 2: Línea 130 — rename + eliminar halftime del reset**

```js
body: JSON.stringify({ score1: null, score2: null }),
```

- [ ] **Step 3: Verificar que no queda fulltime ni halftime en JS**

```bash
python -c "
import re
with open('static/script.js') as f:
    text = f.read()
n = len(re.findall(r'fulltime|halftime', text))
print('Ocurrencias restantes:', n)
"
```

Esperado: `Ocurrencias restantes: 0`

- [ ] **Step 4: Commit**

```bash
git add static/script.js
git commit -m "refactor(js): rename fulltime->score, eliminar halftime del reset"
```

---

## Task 8: Prueba end-to-end y PR

- [ ] **Step 1: Arrancar servidor**

```bash
python app.py --no-browser
```

- [ ] **Step 2: Guardar marcador via API y verificar tres archivos**

```bash
curl -s -X POST http://localhost:2026/api/partido/2/actualizar \
  -H "Content-Type: application/json" \
  -d "{\"score1\": 1, \"score2\": 0}"

python -c "
import sys, json, os
sys.stdout.reconfigure(encoding='utf-8')
from data_manager import RESULTS_FILE, STATS_FILE, DATA_FILE
for path, label in [(RESULTS_FILE, 'resultados'), (STATS_FILE, 'estadisticas')]:
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    keys = list(d['partidos'].get('2', {}).keys())
    print(f'{label} partido 2 keys: {keys}')
"
```

Esperado:
```
resultados partido 2 keys: ['score1', 'score2', 'played']
estadisticas partido 2 keys: []   # vacío hasta cargar stats
```

- [ ] **Step 3: Verificar que reiniciar no borra estadísticas via API**

```bash
# Primero cargar stats en partido 1 (ya tiene goles reales)
# Luego reiniciar
curl -s -X POST http://localhost:2026/api/reiniciar

python -c "
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from data_manager import MundialData, STATS_FILE
with open(STATS_FILE, encoding='utf-8') as f:
    stats = json.load(f)
print('estadisticas.json sobrevive reset:', bool(stats['partidos']))
"
```

Esperado: `estadisticas.json sobrevive reset: True`

- [ ] **Step 4: Resetear partido de prueba**

```bash
curl -s -X POST http://localhost:2026/api/partido/2/actualizar \
  -H "Content-Type: application/json" \
  -d "{\"score1\": null, \"score2\": null}"
```

- [ ] **Step 5: Crear PR**

```bash
gh pr create \
  --title "feat(data): estadisticas.json separado + rename fulltime->score + eliminar halftime" \
  --body "Separa goles/stats_colectivas en data/estadisticas.json. Rename fulltime1/2->score1/2. Elimina halftime sin uso en UI. reiniciar() preserva estadísticas."
```
