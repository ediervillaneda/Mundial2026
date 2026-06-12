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

BANDERAS = {
    "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "República Checa": "cz",
    "Canadá": "ca", "Suiza": "ch", "Catar": "qa", "Bosnia y Herzegovina": "ba",
    "Brasil": "br", "Marruecos": "ma", "Haití": "ht", "Escocia": "gb-sct",
    "EE. UU.": "us", "Paraguay": "py", "Australia": "au", "Turquía": "tr",
    "Alemania": "de", "Ecuador": "ec", "Costa de Marfil": "ci", "Curazao": "cw",
    "Países Bajos": "nl", "Japón": "jp", "Túnez": "tn", "Suecia": "se",
    "Bélgica": "be", "Irán": "ir", "Egipto": "eg", "Nueva Zelanda": "nz",
    "España": "es", "Uruguay": "uy", "Arabia Saudita": "sa", "Cabo Verde": "cv",
    "Francia": "fr", "Senegal": "sn", "Noruega": "no", "Irak": "iq",
    "Argentina": "ar", "Argelia": "dz", "Austria": "at", "Jordania": "jo",
    "Portugal": "pt", "Colombia": "co", "Uzbekistán": "uz", "RD Congo": "cd",
    "Inglaterra": "gb-eng", "Croacia": "hr", "Ghana": "gh", "Panamá": "pa",
}

GRUPOS_2026 = {
    "A": ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
    "B": ["Canadá", "Suiza", "Catar", "Bosnia y Herzegovina"],
    "C": ["Brasil", "Marruecos", "Haití", "Escocia"],
    "D": ["EE. UU.", "Paraguay", "Australia", "Turquía"],
    "E": ["Alemania", "Ecuador", "Costa de Marfil", "Curazao"],
    "F": ["Países Bajos", "Japón", "Túnez", "Suecia"],
    "G": ["Bélgica", "Irán", "Egipto", "Nueva Zelanda"],
    "H": ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"],
    "I": ["Francia", "Senegal", "Noruega", "Irak"],
    "J": ["Argentina", "Argelia", "Austria", "Jordania"],
    "K": ["Portugal", "Colombia", "Uzbekistán", "RD Congo"],
    "L": ["Inglaterra", "Croacia", "Ghana", "Panamá"],
}


RONDAS_ELIMINATORIAS = [
    ("round_of_32", "16avos de Final"),
    ("round_of_16", "Octavos de Final"),
    ("quarter_finals", "Cuartos de Final"),
    ("semi_finals", "Semifinales"),
    ("third_place", "Tercer Puesto"),
    ("final", "Final"),
]

SIGUIENTE_RONDA = {
    "round_of_32": "round_of_16",
    "round_of_16": "quarter_finals",
    "quarter_finals": "semi_finals",
    "semi_finals": "final",
}

RUTA_ELIMINATORIA = {
    "round_of_32": {"next": "round_of_16", "label": "16avos de Final"},
    "round_of_16": {"next": "quarter_finals", "label": "Octavos de Final"},
    "quarter_finals": {"next": "semi_finals", "label": "Cuartos de Final"},
    "semi_finals": {"next": "final", "label": "Semifinales"},
    "third_place": {"next": None, "label": "Tercer Puesto"},
    "final": {"next": None, "label": "Final"},
}

IDX_RONDA = {
    "round_of_32": 0,
    "round_of_16": 1,
    "quarter_finals": 2,
    "semi_finals": 3,
    "third_place": 4,
    "final": 5,
}

_CAMPOS_CONFIG = ("id", "group", "team1", "team2", "date", "time")
_CAMPOS_RESULTADO = ("score1", "score2", "played")
_CAMPOS_ESTADISTICAS = ("goles", "estadisticas_colectivas")
_DEFAULTS_RESULTADO = {"score1": None, "score2": None, "played": False}


def _crear_knockout_vacio():
    return {
        "round_of_32": {"matches": _generar_matches_vacios(16)},
        "round_of_16": {"matches": _generar_matches_vacios(8)},
        "quarter_finals": {"matches": _generar_matches_vacios(4)},
        "semi_finals": {"matches": _generar_matches_vacios(2)},
        "third_place": _generar_match_vacio(),
        "final": _generar_match_vacio(),
    }


def crear_estructura_inicial():
    return {
        "groups": deepcopy(GRUPOS_2026),
        "matches": _generar_partidos_grupos_iniciales(),
        "knockout": _crear_knockout_vacio(),
        "knockout_generated": False,
    }


_SCHEDULE_PARTIDOS = {
    1: ("2026-06-11", "14:00"), 2: ("2026-06-18", "22:00"), 3: ("2026-06-24", "20:00"),
    4: ("2026-06-24", "20:00"), 5: ("2026-06-18", "11:00"), 6: ("2026-06-11", "21:00"),
    7: ("2026-06-24", "14:00"), 8: ("2026-06-18", "17:00"), 9: ("2026-06-12", "14:00"),
    10: ("2026-06-13", "14:00"), 11: ("2026-06-18", "14:00"), 12: ("2026-06-24", "14:00"),
    13: ("2026-06-13", "17:00"), 14: ("2026-06-19", "20:00"), 15: ("2026-06-24", "17:00"),
    16: ("2026-06-24", "17:00"), 17: ("2026-06-19", "17:00"), 18: ("2026-06-13", "20:00"),
    19: ("2026-06-12", "20:00"), 20: ("2026-06-19", "14:00"), 21: ("2026-06-25", "21:00"),
    22: ("2026-06-25", "21:00"), 23: ("2026-06-19", "23:00"), 24: ("2026-06-13", "23:00"),
    25: ("2026-06-25", "15:00"), 26: ("2026-06-20", "15:00"), 27: ("2026-06-14", "12:00"),
    28: ("2026-06-14", "18:00"), 29: ("2026-06-20", "19:00"), 30: ("2026-06-25", "15:00"),
    31: ("2026-06-14", "15:00"), 32: ("2026-06-25", "18:00"), 33: ("2026-06-20", "12:00"),
    34: ("2026-06-20", "23:00"), 35: ("2026-06-25", "18:00"), 36: ("2026-06-15", "21:00"),
    37: ("2026-06-21", "14:00"), 38: ("2026-06-15", "17:00"), 39: ("2026-06-26", "22:00"),
    40: ("2026-06-26", "22:00"), 41: ("2026-06-15", "23:00"), 42: ("2026-06-21", "20:00"),
    43: ("2026-06-26", "19:00"), 44: ("2026-06-21", "11:00"), 45: ("2026-06-15", "12:00"),
    46: ("2026-06-15", "17:00"), 47: ("2026-06-21", "17:00"), 48: ("2026-06-26", "19:00"),
    49: ("2026-06-16", "14:00"), 50: ("2026-06-26", "14:00"), 51: ("2026-06-22", "16:00"),
    52: ("2026-06-22", "19:00"), 53: ("2026-06-26", "14:00"), 54: ("2026-06-16", "17:00"),
    55: ("2026-06-16", "20:00"), 56: ("2026-06-22", "12:00"), 57: ("2026-06-27", "21:00"),
    58: ("2026-06-27", "21:00"), 59: ("2026-06-22", "22:00"), 60: ("2026-06-16", "23:00"),
    61: ("2026-06-27", "18:30"), 62: ("2026-06-23", "12:00"), 63: ("2026-06-17", "12:00"),
    64: ("2026-06-17", "21:00"), 65: ("2026-06-23", "21:00"), 66: ("2026-06-27", "18:30"),
    67: ("2026-06-17", "15:00"), 68: ("2026-06-23", "15:00"), 69: ("2026-06-27", "16:00"),
    70: ("2026-06-27", "16:00"), 71: ("2026-06-23", "18:00"), 72: ("2026-06-17", "18:00"),
}


def _generar_partidos_grupos_iniciales():
    partidos = []
    mid = 1
    for grupo, equipos in GRUPOS_2026.items():
        for i in range(4):
            for j in range(i + 1, 4):
                fecha, hora = _SCHEDULE_PARTIDOS.get(mid, ("", ""))
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
                mid += 1
    return partidos


def _generar_matches_vacios(n):
    return [
        {
            "id": f"KO-{i + 1}",
            "team1": None,
            "team2": None,
            "score1": None,
            "score2": None,
            "penalties1": None,
            "penalties2": None,
            "winner": None,
            "played": False,
        }
        for i in range(n)
    ]


def _generar_match_vacio():
    return {
        "team1": None,
        "team2": None,
        "score1": None,
        "score2": None,
        "penalties1": None,
        "penalties2": None,
        "winner": None,
        "played": False,
    }


class MundialData:
    def __init__(self):
        self.data = None
        self.cargar()

    def cargar(self):
        config = self._cargar_config()
        resultados = self._cargar_resultados(config)

        self.data = {
            "groups": config.get("groups", deepcopy(GRUPOS_2026)),
            "matches": [],
            "knockout": resultados.get("knockout", _crear_knockout_vacio()),
            "knockout_generated": resultados.get("knockout_generated", False),
        }

        partidos_res = resultados.get("partidos", {})
        config_matches = config.get("matches", [])
        for m in config_matches:
            partido = {k: m[k] for k in _CAMPOS_CONFIG if k in m}
            partido.update(_DEFAULTS_RESULTADO.copy())
            mid = str(m.get("id", ""))
            if mid in partidos_res:
                partido.update(partidos_res[mid])
            self.data["matches"].append(partido)

        # Limpia formato viejo de mundial.json si aún tiene campos de resultado
        if config_matches and any(k in config_matches[0] for k in _CAMPOS_RESULTADO):
            self.guardar()

    def _cargar_config(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                pass
        cfg = {"groups": deepcopy(GRUPOS_2026), "matches": _generar_partidos_grupos_iniciales()}
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({"groups": cfg["groups"], "matches": [{k: m[k] for k in _CAMPOS_CONFIG if k in m} for m in cfg["matches"]]}, f, indent=2, ensure_ascii=False)
        return cfg

    def _cargar_resultados(self, config):
        if os.path.exists(RESULTS_FILE):
            try:
                with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                pass

        # Migración desde formato antiguo (mundial.json con scores/knockout mezclados)
        _LEGACY_RESULT_FIELDS = ("halftime1", "halftime2", "fulltime1", "fulltime2", "played", "goles", "estadisticas_colectivas")
        partidos = {}
        for m in config.get("matches", []):
            resultado = {k: m[k] for k in _LEGACY_RESULT_FIELDS if k in m}
            if resultado.get("played") or resultado.get("fulltime1") is not None:
                partidos[str(m["id"])] = resultado

        resultados = {
            "partidos": partidos,
            "knockout": config.pop("knockout", _crear_knockout_vacio()),
            "knockout_generated": config.pop("knockout_generated", False),
        }
        os.makedirs(os.path.dirname(RESULTS_FILE), exist_ok=True)
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(resultados, f, indent=2, ensure_ascii=False)
        return resultados

    def guardar(self):
        data_dir = os.path.dirname(DATA_FILE)
        os.makedirs(data_dir, exist_ok=True)

        config = {
            "groups": self.data["groups"],
            "matches": [{k: m[k] for k in _CAMPOS_CONFIG if k in m} for m in self.data["matches"]],
        }
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        partidos = {}
        for m in self.data["matches"]:
            if m.get("played") or m.get("score1") is not None:
                partidos[str(m["id"])] = {k: m[k] for k in _CAMPOS_RESULTADO if k in m}

        resultados = {
            "partidos": partidos,
            "knockout": self.data["knockout"],
            "knockout_generated": self.data["knockout_generated"],
        }
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(resultados, f, indent=2, ensure_ascii=False)

    def get_grupos(self):
        return self.data["groups"]

    def get_partidos_grupo(self, grupo):
        return [m for m in self.data["matches"] if m["group"] == grupo]

    def get_todos_partidos(self):
        return self.data["matches"]

    def get_partido(self, match_id):
        for m in self.data["matches"]:
            if m["id"] == match_id:
                return m
        return None

    def agregar_partido(self, partido):
        max_id = max((m["id"] for m in self.data["matches"]), default=0)
        partido["id"] = max_id + 1
        self.data["matches"].append(partido)
        self.guardar()

    def actualizar_partido(self, match_id, datos):
        partido = self.get_partido(match_id)
        if partido:
            datos.pop("date", None)
            datos.pop("time", None)
            partido.update(datos)
            if (
                partido.get("fulltime1") is not None
                and partido.get("fulltime2") is not None
            ):
                partido["played"] = True
            else:
                partido["played"] = False
            self.guardar()
            return True
        return False

    def eliminar_partido(self, match_id):
        self.data["matches"] = [m for m in self.data["matches"] if m["id"] != match_id]
        self.guardar()

    def calcular_tabla_grupo(self, grupo):
        equipos = self.data["groups"].get(grupo, [])
        tabla = {}
        for eq in equipos:
            tabla[eq] = {
                "team": eq,
                "pj": 0,
                "pg": 0,
                "pe": 0,
                "pp": 0,
                "gf": 0,
                "gc": 0,
                "gd": 0,
                "pts": 0,
            }

        partidos = self.get_partidos_grupo(grupo)
        for p in partidos:
            if not p["played"]:
                continue
            t1, t2 = p["team1"], p["team2"]
            g1, g2 = p["fulltime1"], p["fulltime2"]
            if t1 not in tabla or t2 not in tabla:
                continue
            tabla[t1]["pj"] += 1
            tabla[t2]["pj"] += 1
            tabla[t1]["gf"] += g1
            tabla[t1]["gc"] += g2
            tabla[t2]["gf"] += g2
            tabla[t2]["gc"] += g1
            if g1 > g2:
                tabla[t1]["pg"] += 1
                tabla[t1]["pts"] += 3
                tabla[t2]["pp"] += 1
            elif g2 > g1:
                tabla[t2]["pg"] += 1
                tabla[t2]["pts"] += 3
                tabla[t1]["pp"] += 1
            else:
                tabla[t1]["pe"] += 1
                tabla[t1]["pts"] += 1
                tabla[t2]["pe"] += 1
                tabla[t2]["pts"] += 1

        for eq in tabla:
            tabla[eq]["gd"] = tabla[eq]["gf"] - tabla[eq]["gc"]

        equipos_ordenados = sorted(
            tabla.values(),
            key=lambda x: (x["pts"], x["gd"], x["gf"]),
            reverse=True,
        )

        equipos_ordenados = self._aplicar_desempate(equipos_ordenados, partidos)

        for i, eq in enumerate(equipos_ordenados, 1):
            eq["pos"] = i

        return equipos_ordenados

    def _aplicar_desempate(self, equipos, partidos):
        pts = [e["pts"] for e in equipos]
        if len(set(pts)) == len(pts):
            return equipos

        from itertools import groupby

        agrupados = []
        for k, g in groupby(equipos, key=lambda x: (x["pts"], x["gd"], x["gf"])):
            grupo = list(g)
            if len(grupo) > 1:
                grupo = self._desempate_head2head(grupo, partidos)
            agrupados.extend(grupo)
        return agrupados

    def _desempate_head2head(self, equipos_empatados, partidos):
        if len(equipos_empatados) < 2:
            return equipos_empatados

        nombres = [e["team"] for e in equipos_empatados]
        h2h = {e["team"]: {"pts": 0, "gd": 0, "gf": 0} for e in equipos_empatados}

        for p in partidos:
            if not p["played"]:
                continue
            t1, t2 = p["team1"], p["team2"]
            if t1 in nombres and t2 in nombres:
                g1, g2 = p["fulltime1"], p["fulltime2"]
                h2h[t1]["gf"] += g1
                h2h[t1]["gd"] += g1 - g2
                h2h[t2]["gf"] += g2
                h2h[t2]["gd"] += g2 - g1
                if g1 > g2:
                    h2h[t1]["pts"] += 3
                elif g2 > g1:
                    h2h[t2]["pts"] += 3
                else:
                    h2h[t1]["pts"] += 1
                    h2h[t2]["pts"] += 1

        return sorted(
            equipos_empatados,
            key=lambda x: (
                h2h[x["team"]]["pts"],
                h2h[x["team"]]["gd"],
                h2h[x["team"]]["gf"],
            ),
            reverse=True,
        )

    def calcular_todos_grupos(self):
        return {
            g: self.calcular_tabla_grupo(g) for g in sorted(self.data["groups"].keys())
        }

    def obtener_clasificados_a_eliminatorias(self):
        tablas = self.calcular_todos_grupos()
        primeros = []
        segundos = []
        terceros = []

        for grupo, tabla in tablas.items():
            if len(tabla) >= 3:
                t = list(tabla)
                primeros.append({**t[0], "grupo": grupo})
                segundos.append({**t[1], "grupo": grupo})
                terceros.append({**t[2], "grupo": grupo})

        primeros.sort(key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True)
        segundos.sort(key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True)
        terceros.sort(key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True)

        mejores_terceros = terceros[:8]

        clasificados = {
            "primeros": primeros,
            "segundos": segundos,
            "terceros": mejores_terceros,
            "total": primeros + segundos + mejores_terceros,
        }

        return clasificados

    def generar_eliminatorias(self):
        if self.data["knockout_generated"]:
            return "ya_generado"

        clasificados = self.obtener_clasificados_a_eliminatorias()
        todos = clasificados["total"]

        if len(todos) != 32:
            return "faltan_clasificados"

        todos_ordenados = sorted(
            todos, key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True
        )

        ko = self.data["knockout"]
        for i in range(16):
            ko["round_of_32"]["matches"][i]["team1"] = todos_ordenados[i]["team"]
            ko["round_of_32"]["matches"][i]["team2"] = todos_ordenados[31 - i]["team"]

        self.data["knockout_generated"] = True
        self.guardar()
        return True

    def get_knockout_match(self, ronda, idx):
        if ronda in ("third_place", "final"):
            return self.data["knockout"][ronda]
        matches = self.data["knockout"][ronda]["matches"]
        if 0 <= idx < len(matches):
            return matches[idx]
        return None

    def actualizar_ko_match(self, ronda, idx, datos):
        if ronda in ("third_place", "final"):
            m = self.data["knockout"][ronda]
            m.update(datos)
            if m.get("score1") is not None and m.get("score2") is not None:
                m["played"] = True
                if m["score1"] != m["score2"]:
                    m["winner"] = (
                        m["team1"] if m["score1"] > m["score2"] else m["team2"]
                    )
                else:
                    if (
                        m.get("penalties1") is not None
                        and m.get("penalties2") is not None
                    ):
                        m["winner"] = (
                            m["team1"]
                            if m["penalties1"] > m["penalties2"]
                            else m["team2"]
                        )
            self.guardar()
            return True
        else:
            matches = self.data["knockout"][ronda]["matches"]
            if 0 <= idx < len(matches):
                m = matches[idx]
                m.update(datos)
                if m.get("score1") is not None and m.get("score2") is not None:
                    m["played"] = True
                    if m["score1"] != m["score2"]:
                        m["winner"] = (
                            m["team1"] if m["score1"] > m["score2"] else m["team2"]
                        )
                    else:
                        if (
                            m.get("penalties1") is not None
                            and m.get("penalties2") is not None
                        ):
                            m["winner"] = (
                                m["team1"]
                                if m["penalties1"] > m["penalties2"]
                                else m["team2"]
                            )
                self._propagar_avance(ronda, idx)
                self.guardar()
                return True
        return False

    def _propagar_avance(self, ronda, idx):
        next_ronda = SIGUIENTE_RONDA.get(ronda)
        if not next_ronda:
            return

        m = self.get_knockout_match(ronda, idx)
        if not m or not m.get("winner"):
            return

        next_idx = idx // 2

        if next_ronda in ("third_place", "final"):
            target = self.data["knockout"][next_ronda]
        else:
            target_matches = self.data["knockout"][next_ronda]["matches"]
            if next_idx >= len(target_matches):
                return
            target = target_matches[next_idx]

        slot = "team1" if idx % 2 == 0 else "team2"
        target[slot] = m["winner"]

        if ronda == "semi_finals":
            loser = m["team1"] if m["winner"] == m["team2"] else m["team2"]
            self.data["knockout"]["third_place"][slot] = loser

        self.guardar()

    def reiniciar(self):
        self.data = crear_estructura_inicial()
        self.guardar()

    def get_estadisticas(self):
        tablas = self.calcular_todos_grupos()
        total_partidos = len(self.data["matches"])
        jugados = sum(1 for m in self.data["matches"] if m["played"])
        goles = sum(
            (m["fulltime1"] or 0) + (m["fulltime2"] or 0)
            for m in self.data["matches"]
            if m["played"]
        )

        clasificados = self.obtener_clasificados_a_eliminatorias()
        todos_clasificados = clasificados["total"]

        return {
            "total_partidos": total_partidos,
            "partidos_jugados": jugados,
            "partidos_pendientes": total_partidos - jugados,
            "goles_totales": goles,
            "equipos_clasificados": len(todos_clasificados),
            "eliminatorias_generadas": self.data["knockout_generated"],
        }

    def actualizar_estadisticas_partido(self, match_id, datos):
        partido = self.get_partido(match_id)
        if partido:
            if "goles" in datos:
                partido["goles"] = datos["goles"]
            if "estadisticas_colectivas" in datos:
                partido["estadisticas_colectivas"] = datos["estadisticas_colectivas"]
            self.guardar()
            return True
        return False

    def obtener_estadisticas_pagina(self):
        partidos_jugados = [m for m in self.data["matches"] if m["played"]]

        equipos = {}
        for m in partidos_jugados:
            t1, t2 = m["team1"], m["team2"]
            g1, g2 = m["fulltime1"], m["fulltime2"]
            for eq, gf, gc in [(t1, g1, g2), (t2, g2, g1)]:
                if eq not in equipos:
                    equipos[eq] = {"gf": 0, "gc": 0, "gd": 0, "pj": 0, "pg": 0, "pe": 0, "pp": 0}
                equipos[eq]["gf"] += gf
                equipos[eq]["gc"] += gc
                equipos[eq]["pj"] += 1
                if gf > gc:
                    equipos[eq]["pg"] += 1
                elif gf == gc:
                    equipos[eq]["pe"] += 1
                else:
                    equipos[eq]["pp"] += 1
        for eq in equipos:
            equipos[eq]["gd"] = equipos[eq]["gf"] - equipos[eq]["gc"]

        goleadores = {}
        for m in self.data["matches"]:
            for gol in m.get("goles", []):
                autor = gol["autor"]
                if autor not in goleadores:
                    goleadores[autor] = {"goles": 0, "equipo": gol["equipo"], "detalles": []}
                goleadores[autor]["goles"] += 1
                goleadores[autor]["detalles"].append({
                    "minuto": gol["minuto"],
                    "rival": m["team2"] if gol["equipo"] == m["team1"] else m["team1"],
                })

        top_goleadores = sorted(
            [{"autor": k, **v} for k, v in goleadores.items()],
            key=lambda x: x["goles"],
            reverse=True,
        )

        top_ataque = sorted(
            [{"team": k, **v} for k, v in equipos.items()],
            key=lambda x: (x["gf"], x["gd"]),
            reverse=True,
        )
        top_defensa = sorted(
            [{"team": k, **v} for k, v in equipos.items()],
            key=lambda x: (x["gc"], -x["gd"]),
        )

        mejores_partidos = sorted(
            partidos_jugados,
            key=lambda m: (m["fulltime1"] + m["fulltime2"]),
            reverse=True,
        )[:5]

        partidos_con_stats = [
            m for m in self.data["matches"]
            if m.get("estadisticas_colectivas") or m.get("goles")
        ]

        total_goles = sum(
            (m["fulltime1"] or 0) + (m["fulltime2"] or 0) for m in partidos_jugados
        )

        return {
            "equipos": equipos,
            "top_goleadores": top_goleadores[:20],
            "top_ataque": top_ataque[:8],
            "top_defensa": top_defensa[:8],
            "mejores_partidos": mejores_partidos,
            "partidos_con_stats": partidos_con_stats,
            "total_goles": total_goles,
            "partidos_jugados": len(partidos_jugados),
            "promedio_goles": round(total_goles / len(partidos_jugados), 2) if partidos_jugados else 0,
        }

    def reiniciar_eliminatorias(self):
        self.data["knockout"] = _crear_knockout_vacio()
        self.data["knockout_generated"] = False
        self.guardar()
