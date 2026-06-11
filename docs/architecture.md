# Arquitectura y Flujo de Datos

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────┐
│                     Navegador                        │
│  (HTML + CSS + JS vanilla)                          │
└──────────────┬──────────────────────┬───────────────┘
               │  HTTP (fetch/AJAX)   │  Carga página
               ▼                      ▼
┌─────────────────────────────────────────────────────┐
│                  Flask Server (app.py)               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Rutas Web   │  │ API REST     │  │ Jinja2     │ │
│  │ /, /grupos, │  │ /api/tablas, │  │ Templates  │ │
│  │ /partidos,  │  │ /api/partido │  │ Render     │ │
│  │ /eliminator │  │ /api/elimina │  │ Engine     │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘ │
└─────────┼─────────────────┼──────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────┐
│               data_manager.py                        │
│  ┌────────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │ Grupo      │ │ Partidos │ │ Eliminatorias      │ │
│  │ Standings  │ │ CRUD     │ │ Bracket + Avance   │ │
│  │ + Tiebreak │ │          │ │ Automático         │ │
│  └────────────┘ └──────────┘ └────────────────────┘ │
│                       │                              │
│                       ▼                              │
│              data/mundial.json                       │
└─────────────────────────────────────────────────────┘
```

## Flujo de datos: Fase de grupos

```
Usuario ingresa marcador
        │
        ▼
POST /api/partido/<id>/actualizar
        │
        ▼
MundialData.actualizar_partido()
  → Actualiza JSON en memoria
  → Marca played=True si fulltime existe
  → Guarda en disco (mundial.json)
        │
        ▼
Usuario navega a /grupos o recarga dashboard
        │
        ▼
MundialData.calcular_tabla_grupo(grupo)
  → Itera partidos del grupo
  → Acumula PJ, PG, PE, PP, GF, GC
  → Calcula GD, PTS
  → Ordena por: PTS > GD > GF
  → Aplica desempate head-to-head si es necesario
  → Asigna posiciones (1-4)
```

## Flujo de datos: Eliminatorias

```
Usuario completa todos los partidos de grupo
        │
        ▼
MundialData.obtener_clasificados_a_eliminatorias()
  → Calcula todas las tablas
  → Toma 1° y 2° de cada grupo (24 equipos)
  → Ordena 3° por puntos/GD/GF
  → Toma los 8 mejores terceros
  → Retorna 32 equipos ordenados
        │
        ▼
Usuario hace clic en "Generar Bracket"
        │
        ▼
POST /api/eliminatorias/generar
        │
        ▼
MundialData.generar_eliminatorias()
  → Empareja 1° vs 32°, 2° vs 31°, etc.
  → Asigna equipos a los 16 slots del R32
  → Marca knockout_generated = true
        │
        ▼
Usuario ingresa resultado de un partido KO
        │
        ▼
POST /api/eliminatorias/actualizar
        │
        ▼
MundialData.actualizar_ko_match()
  → Guarda score1, score2 (y penales si aplica)
  → Determina winner
  → _propagar_avance(): coloca winner en el slot
    correspondiente de la siguiente ronda
```

## Propagación de ganadores

La propagación sigue esta estructura de bracket:

```
Ronda        Partidos   Siguiente
─────────────────────────────────
16avos       16         → Octavos (slot idx // 2, team1 si idx par, team2 si impar)
Octavos       8         → Cuartos
Cuartos       4         → Semifinales
Semifinales   2         → Final + Tercer Puesto
Final         1         → Campeón
TercerPuesto  1         → (terminal)
```

Regla de propagación:
- `next_idx = current_idx // 2`
- `slot = "team1" if current_idx % 2 == 0 else "team2"`

## Módulo data_manager.py

### Clase `MundialData`

| Método | Descripción |
|---|---|
| `cargar()` | Carga JSON del disco o crea estructura inicial |
| `guardar()` | Persiste datos a disco |
| `get_grupos()` | Retorna dict {letra: [equipos]} |
| `get_partidos_grupo(grupo)` | Partidos de un grupo específico |
| `get_todos_partidos()` | Todos los partidos |
| `get_partido(id)` | Partido por ID |
| `agregar_partido(partido)` | Inserta nuevo partido |
| `actualizar_partido(id, datos)` | Actualiza marcador y datos |
| `eliminar_partido(id)` | Elimina partido |
| `calcular_tabla_grupo(grupo)` | Retorna tabla ordenada con estadísticas |
| `calcular_todos_grupos()` | Tablas de los 12 grupos |
| `obtener_clasificados_a_eliminatorias()` | 32 clasificados ordenados |
| `generar_eliminatorias()` | Crea bracket R32 |
| `actualizar_ko_match(ronda, idx, datos)` | Actualiza marcador KO |
| `reiniciar()` | Restaura datos iniciales |
| `reiniciar_eliminatorias()` | Limpia bracket KO |
| `get_estadisticas()` | Resumen numérico del torneo |

### Funciones auxiliares

| Función | Descripción |
|---|---|
| `crear_estructura_inicial()` | Genera el JSON base con grupos y 72 partidos |
| `_generar_partidos_grupos_iniciales()` | Crea los 6 partidos por grupo (round-robin) |
| `_aplicar_desempate(equipos, partidos)` | Agrupa por puntos/GD/GF y aplica head-to-head |
| `_desempate_head2head(equipos, partidos)` | Calcula puntos/GD/GF solo entre empatados |
| `_propagar_avance(ronda, idx)` | Coloca ganador en la ronda siguiente |

## App módulo (app.py)

### Rutas web (render templates)

| Ruta | Template | Propósito |
|---|---|---|
| `/` | `index.html` | Dashboard con estadísticas y últimos resultados |
| `/grupos` | `grupos.html` | Tablas de los 12 grupos |
| `/grupo/<letra>` | `grupo_detalle.html` | Detalle de grupo con tabla y partidos |
| `/partidos` | `partidos.html` | CRUD de todos los partidos |
| `/eliminatorias` | `eliminatorias.html` | Bracket de eliminatorias |

### Rutas API (JSON)

| Ruta | Método | Propósito |
|---|---|---|
| `/api/tablas` | GET | Tablas de todos los grupos |
| `/api/grupos` | GET | Equipos por grupo |
| `/api/estadisticas` | GET | Estadísticas del torneo |
| `/api/partido/agregar` | POST | Crear partido |
| `/api/partido/<id>` | GET | Obtener partido |
| `/api/partido/<id>/actualizar` | POST | Actualizar partido |
| `/api/partido/<id>/eliminar` | POST | Eliminar partido |
| `/api/eliminatorias/generar` | POST | Generar bracket |
| `/api/eliminatorias/reiniciar` | POST | Reiniciar bracket |
| `/api/eliminatorias/actualizar` | POST | Actualizar marcador KO |
| `/api/eliminatorias/asignar` | POST | Asignar equipo a slot KO |
| `/api/reiniciar` | POST | Reiniciar todo el torneo |
