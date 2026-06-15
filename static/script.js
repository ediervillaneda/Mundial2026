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

    document.querySelectorAll('.fecha-separador').forEach(sep => {
        const date = sep.dataset.sepDate;
        const hasVisible = [...document.querySelectorAll(`.partido-row[data-date="${date}"]`)]
            .some(r => r.style.display !== 'none');
        sep.style.display = hasVisible ? '' : 'none';
    });
}


function actualizarEstadosPartidos() {
    const now = Date.now();
    document.querySelectorAll('.partido-row, .match-card').forEach(row => {
        const date = row.dataset.date;
        const time = row.dataset.time;
        const played = row.dataset.jugado === 'true';
        row.classList.remove('partido-en-juego', 'partido-atrasado');
        if (!date || !time) return;
        const kickoff = new Date(`${date}T${time}:00-05:00`).getTime();
        if (now >= kickoff && now < kickoff + 2 * 3600 * 1000) {
            row.classList.add('partido-en-juego');
        } else if (!played && now >= kickoff + 2 * 3600 * 1000) {
            row.classList.add('partido-atrasado');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lista-partidos') || document.querySelector('.match-card')) {
        actualizarEstadosPartidos();
        setInterval(actualizarEstadosPartidos, 60000);
    }
});

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
                    body: JSON.stringify({ score1: s1, score2: s2 }),
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

async function borrarMarcadorGD(id) {
    if (!confirm('¿Borrar marcador de este partido?')) return;
    await fetchJSON(`/api/partido/${id}/actualizar`, {
        method: 'POST',
        body: JSON.stringify({ score1: null, score2: null }),
    });
    location.reload();
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

async function reiniciarEliminatorias() {
    if (!confirm('¿Reiniciar eliminatorias? Se perderán los resultados KO.')) return;
    await fetchJSON('/api/eliminatorias/reiniciar', { method: 'POST' });
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
        await fetchAndRenderBracket();   // primero re-render, card destino queda en DOM
        triggerArriveAnimation(ronda, idx);  // después animar card ya existente
    } else {
        alert('Error al guardar');
    }
}

// ── Bracket Visual ────────────────────────────────────────────

const BANDERAS_JS = {
    "México":"mx","Sudáfrica":"za","Corea del Sur":"kr","República Checa":"cz",
    "Canadá":"ca","Suiza":"ch","Catar":"qa","Bosnia y Herzegovina":"ba",
    "Brasil":"br","Marruecos":"ma","Haití":"ht","Escocia":"gb-sct",
    "EE. UU.":"us","Paraguay":"py","Australia":"au","Turquía":"tr",
    "Alemania":"de","Ecuador":"ec","Costa de Marfil":"ci","Curazao":"cw",
    "Países Bajos":"nl","Japón":"jp","Túnez":"tn","Suecia":"se",
    "Bélgica":"be","Irán":"ir","Egipto":"eg","Nueva Zelanda":"nz",
    "España":"es","Uruguay":"uy","Arabia Saudita":"sa","Cabo Verde":"cv",
    "Francia":"fr","Senegal":"sn","Noruega":"no","Irak":"iq",
    "Argentina":"ar","Argelia":"dz","Austria":"at","Jordania":"jo",
    "Portugal":"pt","Colombia":"co","Uzbekistán":"uz","RD Congo":"cd",
    "Inglaterra":"gb-eng","Croacia":"hr","Ghana":"gh","Panamá":"pa",
};

function flagImg(nombre) {
    const code = BANDERAS_JS[nombre];
    if (!code) return nombre;
    return `<img src="https://flagcdn.com/w20/${code}.png" width="20" height="15" alt="${nombre}" style="border-radius:2px;vertical-align:middle;margin-right:4px;">${nombre}`;
}

function renderMatch(match, ronda, idx) {
    const t1 = match.team1 || null;
    const t2 = match.team2 || null;
    const hasTeams = !!(t1 && t2);
    const w = match.winner;
    const isFinal = ronda === 'final' || ronda === 'third_place';
    const cardExtra = ronda === 'final' ? 'bkt-final' : ronda === 'third_place' ? 'bkt-third' : '';

    // Estado 1: sin equipos (o solo uno)
    if (!hasTeams) {
        return `<div class="bkt-card ${cardExtra} bkt-empty" data-ronda="${ronda}" data-idx="${idx}">
            <div class="bkt-team"><span class="bkt-name">${t1 ? flagImg(t1) : '—'}</span></div>
            <div class="bkt-team"><span class="bkt-name">${t2 ? flagImg(t2) : '—'}</span></div>
            <div class="bkt-actions">
                <button class="btn-tiny" data-action="assign" data-ronda="${ronda}" data-idx="${idx}">👤</button>
            </div>
        </div>`;
    }

    const n1 = 'bkt-name assigned' + (w && w === t1 ? ' winner' : '');
    const n2 = 'bkt-name assigned' + (w && w === t2 ? ' winner' : '');
    const row1Extra = (w && w === t1) ? ' winner-row' : '';
    const row2Extra = (w && w === t2) ? ' winner-row' : '';

    // Estado 3: jugado → score como texto
    if (match.played) {
        const s1 = match.score1 ?? '';
        const s2 = match.score2 ?? '';
        const p1 = match.penalties1 != null ? ` (${match.penalties1})` : '';
        const p2 = match.penalties2 != null ? ` (${match.penalties2})` : '';
        return `<div class="bkt-card bkt-played ${cardExtra}" data-ronda="${ronda}" data-idx="${idx}">
            <div class="bkt-team${row1Extra}">
                <span class="${n1}">${flagImg(t1)}</span>
                <span class="bkt-score-display">${s1}${p1}</span>
            </div>
            <div class="bkt-sep-center">—</div>
            <div class="bkt-team${row2Extra}">
                <span class="${n2}">${flagImg(t2)}</span>
                <span class="bkt-score-display">${s2}${p2}</span>
            </div>
            <div class="bkt-actions">
                <button class="btn-tiny" data-action="edit" data-ronda="${ronda}" data-idx="${idx}">✏️</button>
            </div>
        </div>`;
    }

    // Estado 2: con equipos, sin jugar → inputs activos
    const s1v = match.score1 != null ? match.score1 : '';
    const s2v = match.score2 != null ? match.score2 : '';
    const pen1v = match.penalties1 != null ? match.penalties1 : '';
    const pen2v = match.penalties2 != null ? match.penalties2 : '';
    const penDisplay = match.penalties1 != null ? 'flex' : 'none';
    return `<div class="bkt-card ${cardExtra}" data-ronda="${ronda}" data-idx="${idx}">
        <div class="bkt-team">
            <span class="${n1}">${flagImg(t1)}</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-1" value="${s1v}" min="0" placeholder="0">
            <span class="bkt-sep">-</span>
            <input type="number" class="bkt-score" id="score-${ronda}-${idx}-2" value="${s2v}" min="0" placeholder="0">
        </div>
        <div class="bkt-team"><span class="${n2}">${flagImg(t2)}</span></div>
        <div class="bkt-penales" id="bkt-pen-${ronda}-${idx}" style="display:${penDisplay}">
            Pen:
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-1" value="${pen1v}" min="0" placeholder="-">
            <span>-</span>
            <input type="number" class="bkt-pen" id="pen-${ronda}-${idx}-2" value="${pen2v}" min="0" placeholder="-">
        </div>
        <div class="bkt-actions">
            <button class="btn-tiny" data-action="save" data-ronda="${ronda}" data-idx="${idx}">💾</button>
            ${!isFinal ? `<button class="btn-tiny" data-action="toggle-pen" data-ronda="${ronda}" data-idx="${idx}">⚽</button>` : ''}
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

// ── Bracket Labels y State ────────────────────────────────────────
const RONDA_LABELS = {
    'round_of_32':    '16avos · 29 Jun – 3 Jul',
    'round_of_16':    'Octavos · 5 – 8 Jul',
    'quarter_finals': 'Cuartos · 11 – 12 Jul',
    'semi_finals':    'Semis · 15 – 16 Jul',
    'final':          'Final · 19 Jul',
    'third_place':    '3er Puesto · 19 Jul',
};

let _lastKnockout = null;

function renderBracket(ko) {
    const r32 = ko.round_of_32.matches;
    const r16 = ko.round_of_16.matches;
    const qf  = ko.quarter_finals.matches;
    const sf  = ko.semi_finals.matches;

    const leftHalf = `<div class="bkt-half bkt-half-l">
        ${col(r32.slice(0, 8), 'round_of_32', 0, RONDA_LABELS['round_of_32'])}
        ${col(r16.slice(0, 4), 'round_of_16', 0, RONDA_LABELS['round_of_16'])}
        ${col(qf.slice(0, 2),  'quarter_finals', 0, RONDA_LABELS['quarter_finals'])}
        ${singleCol(sf[0], 'semi_finals', 0, RONDA_LABELS['semi_finals'])}
    </div>`;

    const center = `<div class="bkt-center">
        <div>
            <div class="bkt-center-label">${RONDA_LABELS['final']}</div>
            ${renderMatch(ko.final, 'final', 0)}
        </div>
        <div>
            <div class="bkt-center-label">${RONDA_LABELS['third_place']}</div>
            ${renderMatch(ko.third_place, 'third_place', 0)}
        </div>
    </div>`;

    const rightHalf = `<div class="bkt-half bkt-half-r">
        ${singleCol(sf[1], 'semi_finals', 1, RONDA_LABELS['semi_finals'])}
        ${col(qf.slice(2, 4),  'quarter_finals', 2, RONDA_LABELS['quarter_finals'])}
        ${col(r16.slice(4, 8), 'round_of_16', 4, RONDA_LABELS['round_of_16'])}
        ${col(r32.slice(8, 16),'round_of_32', 8, RONDA_LABELS['round_of_32'])}
    </div>`;

    return `<div class="bkt-wrapper">${leftHalf}${center}${rightHalf}</div>`;
}

async function fetchAndRenderBracket() {
    try {
        const { knockout, clasificados_count, total_requeridos } = await fetchJSON('/api/knockout-live');
        _lastKnockout = knockout;

        const counter = document.getElementById('clasificados-counter');
        if (counter) counter.textContent = `${clasificados_count} / ${total_requeridos} clasificados`;

        const root = document.getElementById('bracket-root');
        if (!root) return;
        root.innerHTML = renderBracket(knockout);
    } catch (err) {
        console.error('fetchAndRenderBracket:', err);
    }
}

function togglePenalesBkt(ronda, idx) {
    const el = document.getElementById(`bkt-pen-${ronda}-${idx}`);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function editKOMatch(ronda, idx) {
    if (!_lastKnockout) return;
    const match = (ronda === 'third_place' || ronda === 'final')
        ? _lastKnockout[ronda]
        : _lastKnockout[ronda]?.matches?.[idx];
    if (!match) return;
    const card = document.querySelector(`.bkt-card[data-ronda="${ronda}"][data-idx="${idx}"]`);
    if (!card) return;
    const editHtml = renderMatch({ ...match, played: false }, ronda, idx);
    card.outerHTML = editHtml;
}

function triggerArriveAnimation(ronda, idx) {
    const SIGUIENTE_JS = {
        'round_of_32':    { ronda: 'round_of_16',    getIdx: i => Math.floor(i / 2) },
        'round_of_16':    { ronda: 'quarter_finals', getIdx: i => Math.floor(i / 2) },
        'quarter_finals': { ronda: 'semi_finals',    getIdx: i => Math.floor(i / 2) },
        'semi_finals':    { ronda: 'final',          getIdx: () => 0 },
    };
    const next = SIGUIENTE_JS[ronda];
    if (!next) return;
    const nextIdx = next.getIdx(idx);
    const card = document.querySelector(`.bkt-card[data-ronda="${next.ronda}"][data-idx="${nextIdx}"]`);
    if (!card) return;
    card.classList.remove('bkt-arrive');
    void card.offsetWidth;
    card.classList.add('bkt-arrive');
    setTimeout(() => card.classList.remove('bkt-arrive'), 750);
}

let _assignPending = { ronda: null, idx: null, team: null };

function _renderModalTeams(filtro) {
    const equipos = (window._clasificadosData || []).map(e => e.team);
    const filtrados = filtro
        ? equipos.filter(e => e.toLowerCase().includes(filtro.toLowerCase()))
        : equipos;
    const list = document.getElementById('bkt-assign-list');
    if (!list) return;
    list.innerHTML = filtrados
        .map(e => `<button class="bkt-assign-item" data-team="${e}">${flagImg(e)} ${e}</button>`)
        .join('');
}

function asignarEquipoBkt(ronda, idx) {
    _assignPending = { ronda, idx, team: null };
    const modal = document.getElementById('bkt-assign-modal');
    const searchInput = document.getElementById('bkt-assign-search');
    const confirmDiv = document.getElementById('bkt-assign-confirm');
    if (searchInput) searchInput.value = '';
    if (confirmDiv) confirmDiv.style.display = 'none';
    document.querySelectorAll('.bkt-assign-item').forEach(b => b.classList.remove('selected'));
    _renderModalTeams('');
    modal?.showModal();
}

async function confirmarAsignacion(slot) {
    if (!_assignPending.team || !_assignPending.ronda) return;
    const { ronda, idx, team } = _assignPending;
    document.getElementById('bkt-assign-modal').close();
    const d = await fetchJSON('/api/eliminatorias/asignar', {
        method: 'POST',
        body: JSON.stringify({ ronda, idx, slot, team }),
    });
    if (d.success) {
        await fetchAndRenderBracket();
    } else {
        alert('Error: ' + d.error);
    }
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
        if (action === 'edit')       editKOMatch(ronda, idx);
        if (action === 'assign')     asignarEquipoBkt(ronda, idx);
    });

    const assignList = document.getElementById('bkt-assign-list');
    if (assignList) {
        assignList.addEventListener('click', e => {
            const btn = e.target.closest('.bkt-assign-item');
            if (!btn) return;
            _assignPending.team = btn.dataset.team;
            document.querySelectorAll('.bkt-assign-item').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const confirmDiv = document.getElementById('bkt-assign-confirm');
            if (confirmDiv) confirmDiv.style.display = 'flex';
        });
    }

    const assignSearch = document.getElementById('bkt-assign-search');
    if (assignSearch) {
        assignSearch.addEventListener('input', e => _renderModalTeams(e.target.value));
    }

    fetchAndRenderBracket();
});
