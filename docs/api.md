# Referencia de API REST

Todas las rutas API están prefijadas con `/api/` y retornan JSON.

---

## Tablas y grupos

### GET /api/tablas

Retorna las tablas de posiciones de los 12 grupos.

**Respuesta:**
```json
{
  "A": [
    {"team": "México", "pos": 1, "pj": 3, "pg": 2, "pe": 1, "pp": 0, "gf": 5, "gc": 2, "gd": 3, "pts": 7},
    {"team": "Corea del Sur", "pos": 2, "pj": 3, "pg": 1, "pe": 1, "pp": 1, "gf": 3, "gc": 3, "gd": 0, "pts": 4}
  ],
  "B": [ ... ]
}
```

### GET /api/grupos

Retorna los equipos organizados por grupo.

**Respuesta:**
```json
{
  "A": ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
  "B": ["Canadá", "Suiza", "Catar", "Bosnia y Herzegovina"]
}
```

### GET /api/estadisticas

Retorna estadísticas generales del torneo.

**Respuesta:**
```json
{
  "total_partidos": 72,
  "partidos_jugados": 45,
  "partidos_pendientes": 27,
  "goles_totales": 128,
  "equipos_clasificados": 32,
  "eliminatorias_generadas": false
}
```

---

## Partidos (fase de grupos)

### GET /api/partido/<id>

Obtiene los datos de un partido específico.

**Parámetros:** `id` (int) — ID del partido

**Respuesta:**
```json
{
  "id": 1,
  "group": "A",
  "team1": "México",
  "team2": "Sudáfrica",
  "date": "2026-06-11",
  "time": "16:00",
  "stadium": "Estadio Azteca (Cd. de México)",
  "halftime1": 1,
  "halftime2": 0,
  "fulltime1": 3,
  "fulltime2": 1,
  "played": true
}
```

### POST /api/partido/agregar

Crea un nuevo partido.

**Body (JSON):**
```json
{
  "group": "A",
  "team1": "México",
  "team2": "Corea del Sur",
  "date": "2026-06-16",
  "time": "18:00",
  "stadium": "Estadio Azteca (Cd. de México)",
  "halftime1": null,
  "halftime2": null,
  "fulltime1": null,
  "fulltime2": null
}
```

**Respuesta:** `{"success": true}`

### POST /api/partido/<id>/actualizar

Actualiza los datos de un partido existente.

**Body (JSON):** Campos a actualizar (parcial):
```json
{
  "fulltime1": 2,
  "fulltime2": 1,
  "halftime1": 0,
  "halftime2": 0
}
```

**Notas:**
- Si `fulltime1` y `fulltime2` no son `null`, el partido se marca automáticamente como `played: true`
- Se pueden actualizar todos los campos opcionalmente

**Respuesta:** `{"success": true}` | `404` si no existe

### POST /api/partido/<id>/eliminar

Elimina un partido.

**Respuesta:** `{"success": true}`

---

## Eliminatorias

### POST /api/eliminatorias/generar

Genera el bracket de 16avos de Final con los 32 equipos clasificados.

**Condiciones:**
- Deben haber exactamente 32 equipos clasificados
- Solo se puede generar una vez (a menos que se reinicie)

**Respuesta exitosa:**
```json
{"success": true, "error": null}
```

**Respuesta fallida:**
```json
{"success": false, "error": "Deben haber 32 equipos clasificados"}
```

### POST /api/eliminatorias/reiniciar

Limpia el bracket eliminatorio y permite regenerarlo.

**Respuesta:** `{"success": true}`

### POST /api/eliminatorias/actualizar

Actualiza el marcador de un partido eliminatorio.

**Body (JSON):**
```json
{
  "ronda": "round_of_32",
  "idx": 0,
  "match": {
    "score1": 2,
    "score2": 1
  }
}
```

**Con penales (cuando hay empate en el marcador):**
```json
{
  "ronda": "round_of_16",
  "idx": 3,
  "match": {
    "score1": 1,
    "score2": 1,
    "penalties1": 4,
    "penalties2": 3
  }
}
```

**Rondas disponibles:**
| ronda | Descripción |
|---|---|
| `round_of_32` | 16avos de Final (16 partidos) |
| `round_of_16` | Octavos de Final (8 partidos) |
| `quarter_finals` | Cuartos de Final (4 partidos) |
| `semi_finals` | Semifinales (2 partidos) |
| `third_place` | Tercer Puesto (1 partido) |
| `final` | Final (1 partido) |

**Notas:**
- `idx` es el índice del partido dentro de la ronda (0-15 para R32, 0-7 para R16, etc.)
- Para `third_place` y `final`, `idx` debe ser 0
- Al guardar, el ganador se propaga automáticamente a la siguiente ronda

**Respuesta:** `{"success": true}`

### POST /api/eliminatorias/asignar

Asigna manualmente un equipo a un slot del bracket.

**Body (JSON):**
```json
{
  "ronda": "round_of_32",
  "idx": 5,
  "slot": "team1",
  "team": "Brasil"
}
```

**Respuesta:** `{"success": true}` | `{"success": false, "error": "Índice inválido"}`

---

## Administración

### POST /api/reiniciar

Reinicia completamente todos los datos del torneo. Elimina resultados y bracket.

**Respuesta:** `{"success": true}`
