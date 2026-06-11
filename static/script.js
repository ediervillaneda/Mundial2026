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
        document.getElementById('clasificados-section')?.style && (document.getElementById('clasificados-section').style.display = 'none');
        await fetchAndRenderBracket();
    } else {
        alert('Error: ' + (result.error || 'No se pudo generar'));
    }
}

async function reiniciarEliminatorias() {
    if (!confirm('¿Reiniciar eliminatorias? Se perderán los resultados actuales.')) return;
    await fetchJSON('/api/eliminatorias/reiniciar', { method: 'POST' });
    document.getElementById('clasificados-section')?.style && (document.getElementById('clasificados-section').style.display = '');
    await fetchAndRenderBracket();
}

async function guardarKOMatch(ronda, idx) {
    const prefix = `score-${ronda}-${idx}-`;
    const s1Raw = document.getElementById(prefix + '1')?.value;
    const s2Raw = document.getElementById(prefix + '2')?.value;

    if (s1Raw === '' || s1Raw === undefined || s2Raw === '' || s2Raw === undefined) {
        alert('Ingresa los marcadores antes de guardar.');
        return;
    }

    const s1 = parseInt(s1Raw);
    const s2 = parseInt(s2Raw);

    const pen1El = document.getElementById(`pen-${ronda}-${idx}-1`);
    const pen2El = document.getElementById(`pen-${ronda}-${idx}-2`);
    const pen1 = pen1El && pen1El.value !== '' ? parseInt(pen1El.value) : null;
    const pen2 = pen2El && pen2El.value !== '' ? parseInt(pen2El.value) : null;

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
        await fetchAndRenderBracket();
    } else {
        alert('Error al guardar');
    }
}

// ── Bracket Visual ────────────────────────────────────────────

function renderMatch(match, ronda, idx) {
    const t1 = match.team1 || '—';
    const t2 = match.team2 || '—';
    const hasTeams = !!(match.team1 && match.team2);
    const w = match.winner;
    const n1 = 'bkt-name' + (match.team1 ? ' assigned' : '') + (w && w === match.team1 ? ' winner' : '');
    const n2 = 'bkt-name' + (match.team2 ? ' assigned' : '') + (w && w === match.team2 ? ' winner' : '');
    const s1 = match.score1 !== null && match.score1 !== undefined ? match.score1 : '';
    const s2 = match.score2 !== null && match.score2 !== undefined ? match.score2 : '';
    const p1 = match.penalties1 !== null && match.penalties1 !== undefined ? match.penalties1 : '';
    const p2 = match.penalties2 !== null && match.penalties2 !== undefined ? match.penalties2 : '';
    const penDisplay = (match.penalties1 !== null && match.penalties1 !== undefined) ? 'flex' : 'none';
    const isFinal = ronda === 'final' || ronda === 'third_place';
    const cardExtra = ronda === 'final' ? 'bkt-final' : ronda === 'third_place' ? 'bkt-third' : '';
    const dis = hasTeams ? '' : 'disabled';

    return `<div class="bkt-card ${match.played ? 'bkt-played' : ''} ${cardExtra}">
        <div class="bkt-team">
            <span class="${n1}">${t1}</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-1" value="${s1}" min="0" placeholder="0" ${dis}>
            <span class="bkt-sep">-</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-2" value="${s2}" min="0" placeholder="0" ${dis}>
        </div>
        <div class="bkt-team"><span class="${n2}">${t2}</span></div>
        <div class="bkt-penales" id="bkt-pen-${ronda}-${idx}" style="display:${penDisplay}">
            Pen:
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-1" value="${p1}" min="0" placeholder="-" ${dis}>
            <span>-</span>
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-2" value="${p2}" min="0" placeholder="-" ${dis}>
        </div>
        <div class="bkt-actions">
            ${hasTeams ? `<button class="btn-tiny" data-action="save" data-ronda="${ronda}" data-idx="${idx}">💾</button>` : ''}
            ${hasTeams && !isFinal ? `<button class="btn-tiny" data-action="toggle-pen" data-ronda="${ronda}" data-idx="${idx}">⚽</button>` : ''}
            <button class="btn-tiny" data-action="assign" data-ronda="${ronda}" data-idx="${idx}">👤</button>
        </div>
    </div>`;
}

function renderPairs(matches, ronda, offset) {
    let html = '';
    for (let i = 0; i < matches.length; i += 2) {
        const m2 = i + 1 < matches.length ? matches[i + 1] : null;
        html += `<div class="bkt-pair">
            <div class="bkt-match-wrap">${renderMatch(matches[i], ronda, offset + i)}</div>
            ${m2 ? `<div class="bkt-match-wrap">${renderMatch(m2, ronda, offset + i + 1)}</div>` : ''}
        </div>`;
    }
    return html;
}

function col(matches, ronda, offset, label) {
    return `<div class="bkt-col">
        <div class="bkt-col-label">${label}</div>
        ${renderPairs(matches, ronda, offset)}
    </div>`;
}

function singleCol(match, ronda, offset, label) {
    return `<div class="bkt-col bkt-col-single">
        <div class="bkt-col-label">${label}</div>
        <div class="bkt-pair">
            <div class="bkt-match-wrap">${renderMatch(match, ronda, offset)}</div>
        </div>
    </div>`;
}

function renderBracket(ko) {
    const r32 = ko.round_of_32.matches;
    const r16 = ko.round_of_16.matches;
    const qf  = ko.quarter_finals.matches;
    const sf  = ko.semi_finals.matches;

    const leftHalf = `<div class="bkt-half bkt-half-l">
        ${col(r32.slice(0, 8), 'round_of_32', 0, '16avos')}
        ${col(r16.slice(0, 4), 'round_of_16', 0, 'Octavos')}
        ${col(qf.slice(0, 2), 'quarter_finals', 0, 'Cuartos')}
        ${singleCol(sf[0], 'semi_finals', 0, 'Semis')}
    </div>`;

    const center = `<div class="bkt-center">
        <div>
            <div class="bkt-center-label">Final</div>
            ${renderMatch(ko.final, 'final', 0)}
        </div>
        <div>
            <div class="bkt-center-label">3er Puesto</div>
            ${renderMatch(ko.third_place, 'third_place', 0)}
        </div>
    </div>`;

    const rightHalf = `<div class="bkt-half bkt-half-r">
        ${singleCol(sf[1], 'semi_finals', 1, 'Semis')}
        ${col(qf.slice(2, 4), 'quarter_finals', 2, 'Cuartos')}
        ${col(r16.slice(4, 8), 'round_of_16', 4, 'Octavos')}
        ${col(r32.slice(8, 16), 'round_of_32', 8, '16avos')}
    </div>`;

    return `<div class="bkt-wrapper">${leftHalf}${center}${rightHalf}</div>`;
}

async function fetchAndRenderBracket() {
    try {
        const { knockout, knockout_generated } = await fetchJSON('/api/knockout-data');
        const root = document.getElementById('bracket-root');
        if (!root) return;

        const btnGen  = document.getElementById('btn-generar');
        const btnReg  = document.getElementById('btn-regenerar');
        const clsSec  = document.getElementById('clasificados-section');

        if (btnGen)  btnGen.style.display  = knockout_generated ? 'none' : '';
        if (btnReg)  btnReg.style.display  = knockout_generated ? '' : 'none';
        if (clsSec)  clsSec.style.display  = knockout_generated ? 'none' : '';

        root.innerHTML = knockout_generated ? renderBracket(knockout) : '';
    } catch (err) {
        console.error('fetchAndRenderBracket:', err);
    }
}

function togglePenalesBkt(ronda, idx) {
    const el = document.getElementById(`bkt-pen-${ronda}-${idx}`);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function asignarEquipoBkt(ronda, idx) {
    const equipos = (window._clasificadosData || []).map(e => e.team);
    const sel = prompt(`Selecciona equipo (escribe el nombre):\n\n${equipos.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
    if (!sel) return;

    const equipo = equipos.find(e => e.toLowerCase().includes(sel.toLowerCase()));
    if (!equipo) { alert('Equipo no encontrado.'); return; }

    const slot = prompt('¿Posición? (team1 o team2)');
    if (!slot || !['team1', 'team2'].includes(slot)) return;

    fetchJSON('/api/eliminatorias/asignar', {
        method: 'POST',
        body: JSON.stringify({ ronda, idx, slot, team: equipo }),
    }).then(d => {
        if (d.success) fetchAndRenderBracket();
        else alert('Error: ' + d.error);
    });
}

// Event delegation: survives DOM re-renders
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('bracket-root');
    if (!root) return;

    root.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, ronda } = btn.dataset;
        const idx = +btn.dataset.idx;
        if (action === 'save')       guardarKOMatch(ronda, idx);
        if (action === 'toggle-pen') togglePenalesBkt(ronda, idx);
        if (action === 'assign')     asignarEquipoBkt(ronda, idx);
    });

    fetchAndRenderBracket();
});
