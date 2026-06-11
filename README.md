# Mundial 2026 Tracker 🏆

Aplicación web para hacer seguimiento completo de la **Copa Mundial de la FIFA 2026**. Permite ingresar marcadores de partidos, calcular puntos automáticamente, determinar clasificados a la fase eliminatoria y visualizar el bracket completo desde 16avos hasta la final.

## Características

- **48 equipos reales** del Mundial 2026 con los clasificados oficiales y el sorteo de grupos (A-L)
- **72 partidos de grupos** pre-generados con los enfrentamientos correctos (round-robin)
- **Sistema de puntuación automático**: 3 pts victoria, 1 empate, 0 derrota
- **Criterios de desempate**: Diferencia de gol, goles a favor, head-to-head entre empatados
- **Clasificación automática**: Top 2 de cada grupo + 8 mejores terceros → 32 a 16avos
- **Bracket eliminatorio completo**: 16avos → Octavos → Cuartos → Semifinales → 3er Puesto → Final
- **Soporte para penales** en partidos eliminatorios empatados
- **Propagación automática de ganadores** a la siguiente ronda
- **Edición de partidos** en cualquier momento
- **Filtros** por grupo, jugados/pendientes
- **Persistencia en JSON** (no requiere base de datos)
- **Interfaz oscura** responsive para escritorio y móvil
- **Idioma**: Español

## Requisitos

- **Python 3.10+** (probado hasta Python 3.14)
- **Flask 3.0+**
- **PyInstaller 6.0+** (solo para generar ejecutable)

## Instalación

```bash
# Clonar o copiar el proyecto
cd Mundial2026

# Instalar dependencias
pip install -r requirements.txt
```

## Uso

```bash
# Iniciar servidor en puerto 2026
python app.py

# No abrir navegador automáticamente
python app.py --no-browser

# Puerto personalizado
set PORT=8080 && python app.py   # Windows
PORT=8080 python app.py           # Linux/Mac
```

Abrir en el navegador: [http://127.0.0.1:2026](http://127.0.0.1:2026)

### Flujo de trabajo

1. **Partidos** → Ingresa los marcadores (final y medio tiempo) de cada partido de grupo
2. **Grupos** → Visualiza las tablas de posiciones actualizadas automáticamente
3. **Eliminatorias** → Cuando los 32 clasificados estén definidos, genera el bracket
4. Ingresa resultados de cada ronda eliminatoria; los ganadores avanzan automáticamente

## Generar ejecutable (.exe)

```bash
# Instalar PyInstaller
pip install pyinstaller

# Generar ejecutable (carpeta con recursos)
python build.py

# Generar un solo .exe (más lento al iniciar pero portátil)
python build.py --onefile

# Limpiar y reconstruir
python build.py --clean --onefile

# Instalar dependencias automáticamente
python build.py --install --onefile
```

El ejecutable se genera en la carpeta `dist/`.

## Estructura del proyecto

```
Mundial2026/
├── app.py              # Servidor Flask, rutas y API endpoints
├── data_manager.py     # Lógica de negocio: grupos, partidos, tabla, eliminatorias
├── build.py            # Script de compilación con PyInstaller
├── requirements.txt    # Dependencias
├── README.md           # Este archivo
├── AGENTS.md           # Guía para asistentes IA
├── data/
│   └── mundial.json    # Persistencia (se crea automáticamente al iniciar)
├── static/
│   ├── style.css       # Estilos visuales (tema oscuro)
│   └── script.js       # Lógica frontend y comunicación API
├── templates/
│   ├── base.html           # Layout base con navegación
│   ├── index.html          # Dashboard con estadísticas
│   ├── grupos.html         # Tablas de todos los grupos
│   ├── grupo_detalle.html  # Detalle de grupo con partidos
│   ├── partidos.html       # CRUD de partidos con filtros
│   └── eliminatorias.html  # Bracket eliminatorio
└── docs/
    ├── index.md            # Documentación técnica
    ├── architecture.md     # Arquitectura y flujo de datos
    ├── api.md              # Referencia de API REST
    └── usage.md            # Guía de usuario
```

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Python 3 + Flask |
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Persistencia | JSON |
| Empaquetado | PyInstaller |

## Grupos del Mundial 2026

| Grupo | Equipos |
|---|---|
| **A** | México, Sudáfrica, Corea del Sur, República Checa |
| **B** | Canadá, Suiza, Catar, Bosnia y Herzegovina |
| **C** | Brasil, Marruecos, Haití, Escocia |
| **D** | EE. UU., Paraguay, Australia, Turquía |
| **E** | Alemania, Ecuador, Costa de Marfil, Curazao |
| **F** | Países Bajos, Japón, Túnez, Suecia |
| **G** | Bélgica, Irán, Egipto, Nueva Zelanda |
| **H** | España, Uruguay, Arabia Saudita, Cabo Verde |
| **I** | Francia, Senegal, Noruega, Irak |
| **J** | Argentina, Argelia, Austria, Jordania |
| **K** | Portugal, Colombia, Uzbekistán, RD Congo |
| **L** | Inglaterra, Croacia, Ghana, Panamá |

## Licencia

MIT
