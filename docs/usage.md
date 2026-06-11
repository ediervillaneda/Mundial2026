# Guía de Usuario — Mundial 2026 Tracker

## Primeros pasos

1. Ejecuta la aplicación (`python app.py` o abre el `.exe`)
2. Se abrirá automáticamente el navegador en `http://127.0.0.1:2026`
3. El dashboard muestra las estadísticas generales y las tablas de grupos

## Ingresar resultados de partidos

### Desde la página de Partidos

1. Navega a **Partidos** en el menú superior
2. Todos los 72 partidos de grupo aparecen listados con el formato "Equipo1 vs Equipo2"
3. Haz clic en **✏️ Editar** en el partido que deseas actualizar

### En el modal de edición

| Campo | Descripción |
|---|---|
| Grupo | Letra del grupo (pre-seleccionado) |
| Equipo Local / Visitante | Nombres de los equipos |
| Fecha | Fecha del partido (opcional) |
| Hora | Hora del partido (opcional) |
| Estadio | Sede del partido (opcional) |
| Marcador 1er T | Resultado al medio tiempo (opcional) |
| Marcador Final | **Resultado final obligatorio** para marcar como jugado |

> **Importante**: Para que un partido se considere "jugado", debes ingresar el Marcador Final de ambos equipos.

### Filtros

Usa los filtros en la parte superior para:
- Ver solo partidos de un grupo específico
- Ver solo partidos ya jugados
- Ver solo partidos pendientes

## Visualizar tablas de posiciones

### Dashboard (Inicio)

Muestra los 12 grupos en formato compacto con:
- Posición
- Nombre del equipo
- Puntos
- Diferencia de gol

Los equipos en posición de clasificación aparecen resaltados en verde.

### Página de Grupos

Muestra los 12 grupos con tabla detallada:
- Posición, Equipo, PJ, G, E, P, GF, GC, DG, Pts
- Los primeros 2 de cada grupo tienen borde verde
- Los terceros tienen borde naranja (opción a mejor tercero)

### Detalle de Grupo

Haz clic en un grupo para ver:
- Tabla de posiciones completa
- Todos los partidos del grupo con sus resultados
- Leyenda de clasificación

## Fase eliminatoria

### Generar el bracket

1. Una vez que hayas ingresado **todos los resultados de la fase de grupos**, la aplicación calculará automáticamente los 32 clasificados
2. Navega a **Eliminatorias**
3. Si hay 32 clasificados, aparecerá el botón **🎯 Generar Bracket**
4. El sistema emparejará los equipos: 1° vs 32°, 2° vs 31°, etc. (ordenados por puntos)

### Ingresar resultados eliminatorios

1. En el bracket, cada partido tiene campos para ingresar el marcador
2. Escribe el resultado en los campos numéricos
3. Haz clic en **💾** para guardar
4. El ganador se propaga automáticamente al siguiente partido

### Penales

Si un partido eliminatorio termina empatado:
1. Ingresa el marcador (ej. 1-1)
2. Haz clic en **⚽ Pen** para mostrar los campos de penales
3. Ingresa los penales (ej. 4-3)
4. Guarda con **💾**
5. El sistema determinará el ganador por penales

### Asignar equipos manualmente

Si necesitas ajustar qué equipo juega en cada slot:
1. Haz clic en **👤** en el partido
2. Escribe el nombre del equipo (búsqueda parcial)
3. Indica si va como `team1` o `team2`

### Re-generar bracket

Si cometiste un error:
1. Haz clic en **🔄 Re-generar**
2. Esto limpia todos los resultados eliminatorios
3. Puedes generar el bracket nuevamente

## Partidos personalizados

Puedes agregar partidos adicionales usando el botón **+ Agregar Partido**:
- Selecciona el grupo
- Elige los equipos
- Completa fecha, hora y estadio (opcional)
- Ingresa marcadores

Esto es útil si necesitas partidos de exhibición o si faltó algún encuentro.

## Consideraciones

- **Sin base de datos**: Los datos se guardan en `data/mundial.json`. Puedes respaldar este archivo.
- **Reinicio total**: Usa el botón de reinicio en la página de Partidos (o la API) para empezar de cero.
- **Responsive**: La interfaz funciona en dispositivos móviles, aunque el bracket es más cómodo en escritorio.
- **Puerto**: La aplicación corre en el puerto 2026. Si está ocupado, usa `set PORT=XXXX`.
