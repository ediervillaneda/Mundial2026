# Documentación Técnica — Mundial 2026 Tracker

## Visión general

Aplicación web de seguimiento para la Copa Mundial de la FIFA 2026. Desarrollada con Python Flask y JavaScript vanilla, con persistencia en archivo JSON. Diseñada para ser ejecutada localmente o distribuida como ejecutable independiente.

## Requisitos del sistema

- **Python**: 3.10 o superior
- **Dependencias**: Flask 3.0+
- **RAM**: ~50 MB en ejecución
- **Espacio**: ~10 MB (app) + ~50 MB (ejecutable compilado)
- **Puerto**: 2026 por defecto (configurable vía `PORT`)

## Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Servidor web | Flask 3.x | Ligero, embebible, fácil de empaquetar con PyInstaller |
| Templates | Jinja2 | Motor nativo de Flask, herencia de layouts |
| Estilos | CSS3 (variables) | Sin dependencias externas, tema oscuro custom |
| Frontend | JavaScript ES6+ | Fetch API nativa, sin librerías |
| Datos | JSON | Portable, no requiere DB, fácil de inspeccionar/editar |
| Empaquetado | PyInstaller 6+ | Genera .exe para Windows y binarios para Linux/Mac |

## Formato del torneo

El Mundial 2026 introduce un nuevo formato con 48 selecciones:

1. **Fase de grupos**: 12 grupos (A-L) de 4 equipos cada uno
2. **Clasificación**: Avanzan los 2 primeros de cada grupo (24) + los 8 mejores terceros
3. **16avos de Final (R32)**: 32 equipos, 16 partidos
4. **Octavos de Final (R16)**: 16 equipos, 8 partidos
5. **Cuartos de Final**: 8 equipos, 4 partidos
6. **Semifinales**: 4 equipos, 2 partidos
7. **Tercer Puesto**: Perdedores de semifinales
8. **Final**: Ganadores de semifinales

## Sistema de puntuación

- **Victoria**: 3 puntos
- **Empate**: 1 punto
- **Derrota**: 0 puntos

### Criterios de desempate (en orden)

1. Puntos
2. Diferencia de gol (GD)
3. Goles a favor (GF)
4. Puntos en partidos entre equipos empatados (head-to-head)
5. Diferencia de gol en partidos entre equipos empatados
6. Goles a favor en partidos entre equipos empatados

## Persistencia

Los datos se almacenan en `data/mundial.json` con la siguiente estructura:

```json
{
  "groups": { "A": ["Equipo1", "Equipo2", ...], ... },
  "matches": [ { "id": 1, "group": "A", "team1": "...", ... } ],
  "knockout": { "round_of_32": { "matches": [...] }, ... },
  "knockout_generated": false
}
```

El archivo se crea automáticamente al primer inicio con los 72 partidos de grupo pre-generados.

## Distribución

### Ejecutable portable

```bash
python build.py            # Modo carpeta (recomendado)
python build.py --onefile  # .exe único
```

### Multiplataforma

El script `build.py` detecta automáticamente el sistema operativo y configura los separadores de ruta para `--add-data` correctamente. Para compilar en otra plataforma, ejecutar el build en esa plataforma.

### Puerto

Por defecto la app corre en el puerto **2026**. Se puede cambiar con:
```bash
set PORT=3000 && python app.py   # Windows
PORT=3000 python app.py           # Linux/Mac
```
