import os
import sys
import webbrowser
from threading import Timer
from flask import Flask, render_template, request, jsonify, redirect, url_for
from data_manager import (
    MundialData,
    RUTA_ELIMINATORIA,
    IDX_RONDA,
    GRUPOS_2026,
)

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True

data_mgr = MundialData()


@app.route("/")
def index():
    stats = data_mgr.get_estadisticas()
    tablas = data_mgr.calcular_todos_grupos()
    ultimos_partidos = sorted(
        [m for m in data_mgr.get_todos_partidos() if m["played"]],
        key=lambda x: x["id"],
        reverse=True,
    )[:8]
    clasificados = data_mgr.obtener_clasificados_a_eliminatorias()
    mejores_terceros = {eq["team"] for eq in clasificados["terceros"]}
    return render_template(
        "index.html",
        stats=stats,
        tablas=tablas,
        grupos=sorted(data_mgr.get_grupos().keys()),
        ultimos_partidos=ultimos_partidos,
        mejores_terceros=mejores_terceros,
    )


@app.route("/grupos")
def grupos():
    tablas = data_mgr.calcular_todos_grupos()
    return render_template(
        "grupos.html",
        tablas=tablas,
        grupos=sorted(data_mgr.get_grupos().keys()),
    )


@app.route("/grupo/<letra>")
def grupo_detalle(letra):
    letra = letra.upper()
    grupos = data_mgr.get_grupos()
    if letra not in grupos:
        return redirect(url_for("grupos"))
    tabla = data_mgr.calcular_tabla_grupo(letra)
    partidos = data_mgr.get_partidos_grupo(letra)
    return render_template(
        "grupo_detalle.html",
        grupo=letra,
        equipos=grupos[letra],
        tabla=tabla,
        partidos=partidos,
    )


@app.route("/partidos")
def partidos():
    partidos = sorted(
        data_mgr.get_todos_partidos(),
        key=lambda m: (m.get("date", ""), m.get("time", ""))
    )
    grupos = sorted(data_mgr.get_grupos().keys())
    return render_template(
        "partidos.html",
        partidos=partidos,
        grupos=grupos,
    )


@app.route("/api/partido/agregar", methods=["POST"])
def api_agregar_partido():
    datos = request.json
    data_mgr.agregar_partido(datos)
    return jsonify({"success": True})


@app.route("/api/partido/<int:match_id>", methods=["GET"])
def api_get_partido(match_id):
    p = data_mgr.get_partido(match_id)
    if p:
        return jsonify(p)
    return jsonify({"error": "No encontrado"}), 404


@app.route("/api/partido/<int:match_id>/actualizar", methods=["POST"])
def api_actualizar_partido(match_id):
    datos = request.json
    ok = data_mgr.actualizar_partido(match_id, datos)
    if ok:
        return jsonify({"success": True})
    return jsonify({"error": "No encontrado"}), 404


@app.route("/api/partido/<int:match_id>/eliminar", methods=["POST"])
def api_eliminar_partido(match_id):
    data_mgr.eliminar_partido(match_id)
    return jsonify({"success": True})


@app.route("/eliminatorias")
def eliminatorias():
    clasificados = data_mgr.obtener_clasificados_a_eliminatorias()
    ko = data_mgr.data["knockout"]
    generado = data_mgr.data["knockout_generated"]
    return render_template(
        "eliminatorias.html",
        clasificados=clasificados,
        knockout=ko,
        generado=generado,
        rondas_info=RUTA_ELIMINATORIA,
        rondas_order=[
            "round_of_32",
            "round_of_16",
            "quarter_finals",
            "semi_finals",
            "third_place",
            "final",
        ],
    )


@app.route("/api/eliminatorias/generar", methods=["POST"])
def api_generar_eliminatorias():
    resultado = data_mgr.generar_eliminatorias()
    if resultado is True:
        return jsonify({"success": True})
    mensajes = {
        "ya_generado": "El bracket ya fue generado",
        "faltan_clasificados": "Deben haber 32 equipos clasificados",
    }
    return jsonify({"success": False, "error": mensajes.get(resultado, "Error desconocido")})


@app.route("/api/eliminatorias/reiniciar", methods=["POST"])
def api_reiniciar_eliminatorias():
    data_mgr.reiniciar_eliminatorias()
    return jsonify({"success": True})


@app.route("/api/eliminatorias/actualizar", methods=["POST"])
def api_actualizar_ko():
    datos = request.json
    ronda = datos["ronda"]
    idx = datos.get("idx", 0)
    ok = data_mgr.actualizar_ko_match(ronda, idx, datos["match"])
    return jsonify({"success": ok})


@app.route("/api/eliminatorias/asignar", methods=["POST"])
def api_asignar_ko():
    datos = request.json
    ronda = datos["ronda"]
    idx = datos["idx"]
    slot = datos["slot"]
    equipo = datos["team"]

    if ronda in ("third_place", "final"):
        m = data_mgr.data["knockout"][ronda]
    else:
        matches = data_mgr.data["knockout"][ronda]["matches"]
        if idx >= len(matches):
            return jsonify({"success": False, "error": "Índice inválido"})
        m = matches[idx]

    m[slot] = equipo
    data_mgr.guardar()
    return jsonify({"success": True})


@app.route("/api/knockout-data")
def api_knockout_data():
    return jsonify({
        "knockout": data_mgr.data["knockout"],
        "knockout_generated": data_mgr.data["knockout_generated"],
    })


@app.route("/api/estadisticas")
def api_estadisticas():
    return jsonify(data_mgr.get_estadisticas())


@app.route("/api/grupos")
def api_grupos():
    return jsonify(data_mgr.get_grupos())


@app.route("/api/tablas")
def api_tablas():
    tablas = data_mgr.calcular_todos_grupos()
    resultado = {}
    for g, t in tablas.items():
        resultado[g] = [dict(e) for e in t]
    return jsonify(resultado)


@app.route("/api/reiniciar", methods=["POST"])
def api_reiniciar():
    data_mgr.reiniciar()
    return jsonify({"success": True})



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 2026))
    abrir_navegador = "--no-browser" not in sys.argv

    def open_browser():
        if abrir_navegador:
            webbrowser.open(f"http://127.0.0.1:{port}")

    Timer(1.5, open_browser).start()
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="127.0.0.1", port=port, debug=debug)
