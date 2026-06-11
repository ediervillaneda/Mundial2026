async function fetchJSON(url, options) {
    const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

function filtrarPartidos() {
    const grupo = document.getElementById('filtro-grupo')?.value || '';
    const soloJugados = document.getElementById('filtro-jugados')?.checked || false;
    const soloPendientes = document.getElementById('filtro-pendientes')?.checked || false;

    document.querySelectorAll('.partido-row').forEach(row => {
        const g = row.dataset.grupo;
        const jugado = row.dataset.jugado === 'true';
        let show = true;
        if (grupo && g !== grupo) show = false;
        if (soloJugados && !jugado) show = false;
        if (soloPendientes && jugado) show = false;
        row.style.display = show ? 'grid' : 'none';
    });
}

function mostrarFormAgregar() {
    document.getElementById('modal-title').textContent = 'Agregar Partido';
    document.getElementById('match-id').value = '';
    document.getElementById('f-grupo').value = '';
    document.getElementById('f-team1').innerHTML = '<option value="">Seleccionar</option>';
    document.getElementById('f-team2').innerHTML = '<option value="">Seleccionar</option>';
    document.getElementById('f-date').value = '';
    document.getElementById('f-time').value = '';
    document.getElementById('f-ht1').value = '';
    document.getElementById('f-ht2').value = '';
    document.getElementById('f-ft1').value = '';
    document.getElementById('f-ft2').value = '';
    document.getElementById('score-fields').style.display = '';
    document.getElementById('edit-score-msg').style.display = 'none';
    document.getElementById('modal-partido').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-partido').style.display = 'none';
}

async function editarPartido(id) {
    const [data, gruposData] = await Promise.all([
        fetchJSON(`/api/partido/${id}`),
        fetchJSON('/api/grupos'),
    ]);
    document.getElementById('modal-title').textContent = 'Editar Partido';
    document.getElementById('match-id').value = id;

    document.getElementById('f-grupo').value = data.group;

    const equipos = gruposData[data.group] || [];
    const t1 = document.getElementById('f-team1');
    const t2 = document.getElementById('f-team2');
    t1.innerHTML = '<option value="">Seleccionar</option>';
    t2.innerHTML = '<option value="">Seleccionar</option>';
    equipos.forEach(eq => {
        t1.innerHTML += `<option value="${eq}">${eq}</option>`;
        t2.innerHTML += `<option value="${eq}">${eq}</option>`;
    });

    t1.value = data.team1;
    t2.value = data.team2;
    document.getElementById('f-date').value = data.date || '';
    document.getElementById('f-time').value = data.time || '';
    document.getElementById('score-fields').style.display = 'none';
    document.getElementById('edit-score-msg').style.display = 'block';
    document.getElementById('modal-partido').style.display = 'flex';
}

async function guardarPartido() {
    const id = document.getElementById('match-id').value;
    const datos = {
        group: document.getElementById('f-grupo').value,
        team1: document.getElementById('f-team1').value,
        team2: document.getElementById('f-team2').value,
        date: document.getElementById('f-date').value,
        time: document.getElementById('f-time').value,
    };

    if (!id) {
        datos.halftime1 = parseNullable(document.getElementById('f-ht1').value);
        datos.halftime2 = parseNullable(document.getElementById('f-ht2').value);
        datos.fulltime1 = parseNullable(document.getElementById('f-ft1').value);
        datos.fulltime2 = parseNullable(document.getElementById('f-ft2').value);
    }

    let url;
    if (id) {
        url = `/api/partido/${id}/actualizar`;
    } else {
        url = '/api/partido/agregar';
    }

    const result = await fetchJSON(url, {
        method: 'POST',
        body: JSON.stringify(datos),
    });

    if (result.success) {
        cerrarModal();
        location.reload();
    } else {
        alert('Error al guardar: ' + (result.error || 'desconocido'));
    }
}

function parseNullable(val) {
    if (val === '' || val === null || val === undefined) return null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
}

async function eliminarPartido(id) {
    if (!confirm('¿Eliminar este partido?')) return;
    await fetchJSON(`/api/partido/${id}/eliminar`, { method: 'POST' });
    location.reload();
}

function inlineMarcadorHTML(id, v1, v2) {
    return `
        <span class="inline-edit" data-id="${id}">
            <input type="number" class="inline-score" id="inline-s1-${id}" value="${v1}" min="0" placeholder="0" autofocus>
            <span class="inline-sep">-</span>
            <input type="number" class="inline-score" id="inline-s2-${id}" value="${v2}" min="0" placeholder="0">
        </span>
    `;
}

function configurarAutoSave(id) {
    const container = document.querySelector(`.inline-edit[data-id="${id}"]`);
    if (!container) return;
    const inputs = container.querySelectorAll('.inline-score');
    let guardando = false;
    function onBlur() {
        setTimeout(() => {
            if (guardando) return;
            if (!container.contains(document.activeElement)) {
                guardando = true;
                const s1 = parseInt(document.getElementById(`inline-s1-${id}`)?.value) || 0;
                const s2 = parseInt(document.getElementById(`inline-s2-${id}`)?.value) || 0;
                fetchJSON(`/api/partido/${id}/actualizar`, {
                    method: 'POST',
                    body: JSON.stringify({ fulltime1: s1, fulltime2: s2 }),
                }).then(() => location.reload()).catch(err => {
                    alert('Error al guardar: ' + err.message);
                    guardando = false;
                });
            }
        }, 200);
    }
    inputs.forEach(el => {
        el.addEventListener('blur', onBlur);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
    });
}

function activarEdicionMarcador(id) {
    const row = document.querySelector(`.partido-row:has([onclick*="activarEdicionMarcador(${id})"])`);
    if (!row) return;
    const marcador = row.querySelector('.partido-marcador');
    if (!marcador || marcador.querySelector('.inline-edit')) return;

    const currentFT1 = row.querySelector('.partido-marcador strong')?.textContent?.split('-')[0]?.trim() || '';
    const currentFT2 = row.querySelector('.partido-marcador strong')?.textContent?.split('-')[1]?.trim() || '';

    marcador.innerHTML = inlineMarcadorHTML(id, currentFT1, currentFT2);
    configurarAutoSave(id);
    document.getElementById(`inline-s1-${id}`)?.focus();
}

function activarEdicionMarcadorGD(id) {
    const card = document.querySelector(`.match-card[data-id="${id}"]`);
    if (!card) return;
    const marcador = card.querySelector('.match-score');
    if (!marcador || marcador.querySelector('.inline-edit')) return;

    const strong = card.querySelector('.match-score strong');
    let currentFT1 = '', currentFT2 = '';
    if (strong) {
        const parts = strong.textContent.split('-');
        currentFT1 = parts[0]?.trim() || '';
        currentFT2 = parts[1]?.trim() || '';
    }

    marcador.innerHTML = inlineMarcadorHTML(id, currentFT1, currentFT2);
    configurarAutoSave(id);
    document.getElementById(`inline-s1-${id}`)?.focus();
}

async function generarEliminatorias() {
    if (!confirm('¿Generar bracket de eliminatorias? Se emparejarán los 32 equipos.')) return;
    const result = await fetchJSON('/api/eliminatorias/generar', { method: 'POST' });
    if (result.success) {
        location.reload();
    } else {
        alert('Error: ' + (result.error || 'No se pudo generar'));
        if (result.error?.includes('32')) {
            location.reload();
        }
    }
}

async function reiniciarEliminatorias() {
    if (!confirm('¿Reiniciar eliminatorias? Se perderán los resultados actuales.')) return;
    await fetchJSON('/api/eliminatorias/reiniciar', { method: 'POST' });
    location.reload();
}

async function guardarKOMatch(ronda, idx) {
    const prefix = `score-${ronda}-${idx}-`;
    const s1Raw = document.getElementById(prefix + '1').value;
    const s2Raw = document.getElementById(prefix + '2').value;

    if (s1Raw === '' || s2Raw === '') {
        alert('Ingresa los marcadores antes de guardar.');
        return;
    }

    const s1 = parseInt(s1Raw);
    const s2 = parseInt(s2Raw);

    const penPrefix = `pen-${ronda}-${idx}-`;
    const pen1El = document.getElementById(penPrefix + '1');
    const pen2El = document.getElementById(penPrefix + '2');
    const pen1 = pen1El ? (parseInt(pen1El.value) || null) : null;
    const pen2 = pen2El ? (parseInt(pen2El.value) || null) : null;

    const matchData = { score1: s1, score2: s2 };
    if (pen1 !== null && pen2 !== null) {
        matchData.penalties1 = pen1;
        matchData.penalties2 = pen2;
    }

    const result = await fetchJSON('/api/eliminatorias/actualizar', {
        method: 'POST',
        body: JSON.stringify({ ronda, idx, match: matchData }),
    });

    if (result.success) {
        location.reload();
    } else {
        alert('Error al guardar');
    }
}
