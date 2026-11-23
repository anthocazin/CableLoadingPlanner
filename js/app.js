/* Cable Loading Planner — user interface */
(function () {
  'use strict';
  const { compute, compartments, capacity, capacityMatrix, num, fmt, CARRIER_TYPES } = window.CLP;
  const STORE_KEY = 'cableLoadingPlanner.project.v1';
  const PALETTE = ['#e8822a', '#3b6ea5', '#1f8f4e', '#8e44ad', '#c0392b', '#16a085', '#d4a017', '#5d6d7e', '#d6408b', '#2c3e8f', '#7f8c2a', '#a0522d'];
  const $ = id => document.getElementById(id);
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => new Date().toISOString().slice(0, 10);

  /* ================================================================== */
  /* Project data                                                        */
  /* ================================================================== */
  const defaultRings = () => [
    { name: 'Core', diameter: 9, thickness: 25, height: 6.5 },
    { name: 'Outer wall', diameter: 30, thickness: 25, height: 6.5 },
  ];
  const defaultDrum = () => ({ barrelDiameter: 2.8, flangeDiameter: 4.6, flangeThickness: 40, freeboard: 0.1, bays: [{ name: 'Bay 1', width: 1.4 }] });
  const info = () => ({ client: '', vessel: '', preparedBy: '', date: today(), reference: '', notes: '' });

  const EXAMPLES = {
    turntable: () => ({
      name: 'Export cable — 5 000 t turntable',
      info: Object.assign(info(), { client: 'Offshore Wind Farm', vessel: 'Cable Lay Vessel', reference: 'EXP-LOAD-001' }),
      carrier: { type: 'turntable', name: 'Main turntable', maxLoad: 5000, tare: 0, freeboard: 0.3, rings: defaultRings(), drum: defaultDrum() },
      winding: { stacking: 'square', turnGap: 5, layerGap: 0, startSide: 'outer' },
      cables: [{ id: 'c1', name: '220 kV export 3C 1200 mm²', od: 245, weight: 92, mbr: 4.0, maxLayers: 0, color: '#3b6ea5' }],
      sections: [
        { id: uid(), name: 'Export section 1', cableId: 'c1', length: 18000, compartment: 0, color: PALETTE[0] },
        { id: uid(), name: 'Export section 2', cableId: 'c1', length: 16500, compartment: 0, color: PALETTE[1] },
        { id: uid(), name: 'Spare length', cableId: 'c1', length: 2000, compartment: 0, color: PALETTE[2] },
      ],
    }),
    tank: () => ({
      name: 'Inter-array cables — static tank',
      info: Object.assign(info(), { client: 'Offshore Wind Farm', vessel: 'Cable Lay Vessel', reference: 'IAC-TANK-01' }),
      carrier: {
        type: 'tank', name: 'Static tank T1', maxLoad: 2500, tare: 0, freeboard: 0.2,
        rings: [
          { name: 'Core', diameter: 6, thickness: 20, height: 4 },
          { name: 'Inner cerce', diameter: 14, thickness: 20, height: 4 },
          { name: 'Outer wall', diameter: 22, thickness: 20, height: 4.5 },
        ],
        drum: defaultDrum(),
      },
      winding: { stacking: 'square', turnGap: 5, layerGap: 0, startSide: 'outer' },
      cables: [
        { id: 'c1', name: '66 kV array 3C 240 mm²', od: 135, weight: 32, mbr: 2.0, maxLayers: 0, color: '#1f8f4e' },
        { id: 'c2', name: '66 kV array 3C 630 mm²', od: 160, weight: 48, mbr: 2.4, maxLayers: 0, color: '#8e44ad' },
      ],
      sections: [
        { id: uid(), name: 'IAC A01–A02', cableId: 'c1', length: 6500, compartment: 0, color: PALETTE[0] },
        { id: uid(), name: 'IAC A02–A03', cableId: 'c1', length: 7200, compartment: 0, color: PALETTE[1] },
        { id: uid(), name: 'IAC A03–OSS', cableId: 'c2', length: 12000, compartment: 1, color: PALETTE[2] },
        { id: uid(), name: 'IAC B01–B02', cableId: 'c1', length: 9000, compartment: 1, color: PALETTE[3] },
      ],
    }),
    drum: () => ({
      name: '33 kV cable — split drum',
      info: Object.assign(info(), { reference: 'DRUM-0425' }),
      carrier: { type: 'drum', name: 'Drum D-4600', maxLoad: 60, tare: 12, freeboard: 0.3, rings: defaultRings(),
        drum: { barrelDiameter: 2.8, flangeDiameter: 4.6, flangeThickness: 40, freeboard: 0.1, bays: [{ name: 'Bay A', width: 1.4 }, { name: 'Bay B', width: 1.4 }] } },
      winding: { stacking: 'square', turnGap: 0, layerGap: 0, startSide: 'left' },
      cables: [{ id: 'c1', name: '33 kV 3C 185 mm²', od: 110, weight: 18, mbr: 1.3, maxLayers: 0, color: '#e8822a' }],
      sections: [
        { id: uid(), name: 'Cable A', cableId: 'c1', length: 900, compartment: 0, color: PALETTE[0] },
        { id: uid(), name: 'Cable B', cableId: 'c1', length: 650, compartment: 1, color: PALETTE[1] },
      ],
    }),
  };
  const emptyProject = () => ({
    name: '', info: info(),
    carrier: { type: 'turntable', name: '', maxLoad: 0, tare: 0, freeboard: 0.3, rings: defaultRings(), drum: defaultDrum() },
    winding: { stacking: 'square', turnGap: 5, layerGap: 0, startSide: 'outer' },
    cables: [{ id: uid(), name: 'Cable 1', od: 150, weight: 40, mbr: 2, maxLayers: 0, color: PALETTE[1] }],
    sections: [],
  });

  function normalise(p) {
    const base = emptyProject();
    p = Object.assign(base, p || {});
    p.info = Object.assign(info(), p.info || {});
    p.carrier = Object.assign(emptyProject().carrier, p.carrier || {});
    if (!Array.isArray(p.carrier.rings) || p.carrier.rings.length < 2) p.carrier.rings = defaultRings();
    p.carrier.drum = Object.assign(defaultDrum(), p.carrier.drum || {});
    if (!Array.isArray(p.carrier.drum.bays) || !p.carrier.drum.bays.length) p.carrier.drum.bays = defaultDrum().bays;
    p.winding = Object.assign(emptyProject().winding, p.winding || {});
    p.cables = Array.isArray(p.cables) ? p.cables : [];
    p.sections = Array.isArray(p.sections) ? p.sections : [];
    p.cables.forEach(c => { if (!c.id) c.id = uid(); });
    p.sections.forEach((s, i) => { if (!s.id) s.id = uid(); if (!s.color) s.color = PALETTE[i % PALETTE.length]; });
    return p;
  }

  function loadAutosave() {
    try { const s = localStorage.getItem(STORE_KEY); return s ? normalise(JSON.parse(s)) : null; } catch (e) { return null; }
  }
  function autosave() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }

  let state = loadAutosave() || normalise(EXAMPLES.turntable());
  const ui = { tab: 'carrier', view: 'section', zoom: 'all', labels: true };
  let result = null, comps = [], capMatrix = [];

  const kind = () => (CARRIER_TYPES[state.carrier.type] || CARRIER_TYPES.turntable).kind;
  const cableById = id => state.cables.find(c => c.id === id);

  /* ================================================================== */
  /* Input panel                                                         */
  /* ================================================================== */
  const ICONS = {
    turntable: '<svg width="34" height="22" viewBox="0 0 34 22"><ellipse cx="17" cy="16" rx="15" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 8v8M32 8v8" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="8" rx="15" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="8" rx="5" ry="1.5" fill="none" stroke="#e8822a" stroke-width="1.5"/><path d="M17 18v3M12 21h10" stroke="currentColor" stroke-width="1.5"/></svg>',
    tank: '<svg width="34" height="22" viewBox="0 0 34 22"><path d="M2 5v12M32 5v12" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="5" rx="15" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 17a15 3.5 0 0 0 30 0" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="5" rx="8" ry="1.9" fill="none" stroke="#e8822a" stroke-width="1.3"/><ellipse cx="17" cy="5" rx="3.5" ry=".9" fill="none" stroke="#e8822a" stroke-width="1.3"/></svg>',
    drum: '<svg width="34" height="22" viewBox="0 0 34 22"><circle cx="11" cy="11" r="9.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="11" r="5" fill="none" stroke="#e8822a" stroke-width="1.5"/><circle cx="11" cy="11" r="1.5" fill="currentColor"/><path d="M11 1.5h12a9.5 9.5 0 0 1 0 19H11" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  };

  function field(label, path, value, opts) {
    opts = opts || {};
    const type = opts.type || 'number';
    const unit = opts.unit ? ` <span class="unit">(${opts.unit})</span>` : '';
    const attrs = `data-bind="${path}" data-type="${type === 'number' ? 'num' : 'text'}"${opts.rerender ? ' data-rerender="1"' : ''}`;
    const step = opts.step ? ` step="${opts.step}"` : ' step="any"';
    const input = type === 'textarea'
      ? `<textarea ${attrs}>${esc(value)}</textarea>`
      : `<input type="${type}" ${attrs} value="${esc(value)}"${type === 'number' ? step + ' min="0"' : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}>`;
    return `<label class="f${opts.full ? ' full' : ''}">${esc(label)}${unit}${input}</label>`;
  }

  function renderCarrierTab() {
    const c = state.carrier;
    let h = '<div class="seg">' + Object.keys(CARRIER_TYPES).map(t =>
      `<button data-action="type" data-value="${t}" class="${c.type === t ? 'active' : ''}">${ICONS[t]}<span>${CARRIER_TYPES[t].label}</span></button>`).join('') + '</div>';
    h += '<div class="grid2">' + field('Carrier name / ID', 'carrier.name', c.name, { type: 'text', full: true, placeholder: 'e.g. Turntable 1' }) +
      field('Max. cable load (SWL)', 'carrier.maxLoad', c.maxLoad, { unit: 't' }) +
      field('Tare (empty carrier)', 'carrier.tare', c.tare, { unit: 't' }) + '</div>';
    if (kind() === 'coil') {
      h += '<h3>Rings / cerces (from the core outwards)</h3>';
      h += '<table class="edit"><thead><tr><th>Name</th><th>Inner Ø (m)</th><th>Wall (mm)</th><th>Height (m)</th><th></th></tr></thead><tbody>';
      c.rings.forEach((r, i) => {
        h += `<tr><td><input data-bind="carrier.rings.${i}.name" data-type="text" value="${esc(r.name)}"></td>
          <td><input type="number" step="any" min="0" data-bind="carrier.rings.${i}.diameter" data-type="num" data-rerender="sortRings" value="${esc(r.diameter)}"></td>
          <td><input type="number" step="any" min="0" data-bind="carrier.rings.${i}.thickness" data-type="num" value="${esc(r.thickness)}"></td>
          <td><input type="number" step="any" min="0" data-bind="carrier.rings.${i}.height" data-type="num" value="${esc(r.height)}"></td>
          <td><button class="icon-btn del" data-action="delRing" data-i="${i}" title="Remove ring" ${c.rings.length <= 2 ? 'disabled' : ''}>✕</button></td></tr>`;
      });
      h += '</tbody></table><button class="btn add" data-action="addRing">+ Add a ring / cerce (creates a compartment)</button>';
      h += '<div class="grid2" style="margin-top:10px">' + field('Freeboard (below wall top)', 'carrier.freeboard', c.freeboard, { unit: 'm' }) + '</div>';
      h += '<div class="hint">Inner Ø = diameter of the cable-side face of the ring. Each space between two rings is a compartment. The first ring is the core (inner cone), the last one the outer wall. Usable stack height = lower of the two wall heights − freeboard.</div>';
    } else {
      const d = c.drum;
      h += '<h3>Drum geometry</h3><div class="grid2">' +
        field('Barrel (core) Ø', 'carrier.drum.barrelDiameter', d.barrelDiameter, { unit: 'm' }) +
        field('Flange Ø', 'carrier.drum.flangeDiameter', d.flangeDiameter, { unit: 'm' }) +
        field('Flange thickness', 'carrier.drum.flangeThickness', d.flangeThickness, { unit: 'mm' }) +
        field('Freeboard (flange rim → top layer)', 'carrier.drum.freeboard', d.freeboard, { unit: 'm' }) + '</div>';
      h += '<h3>Bays between flanges (from left to right)</h3>';
      h += '<table class="edit"><thead><tr><th>Name</th><th>Inner width (m)</th><th></th></tr></thead><tbody>';
      d.bays.forEach((b, i) => {
        h += `<tr><td><input data-bind="carrier.drum.bays.${i}.name" data-type="text" value="${esc(b.name)}"></td>
          <td><input type="number" step="any" min="0" data-bind="carrier.drum.bays.${i}.width" data-type="num" value="${esc(b.width)}"></td>
          <td><button class="icon-btn del" data-action="delBay" data-i="${i}" title="Remove bay" ${d.bays.length <= 1 ? 'disabled' : ''}>✕</button></td></tr>`;
      });
      h += '</tbody></table><button class="btn add" data-action="addBay">+ Add a bay (adds an intermediate flange)</button>';
      h += '<div class="hint">Inner width = clear distance between two flanges. Several bays = split drum with intermediate flanges; each bay is loaded independently.</div>';
    }
    h += '<h3>Compartments</h3><div class="derived" id="derived"></div>';
    return h;
  }

  function renderCablesTab() {
    let h = '<div class="hint">Cable library. Each cable section of the loading plan uses one of these cable types.</div>';
    state.cables.forEach((c, i) => {
      h += `<div class="card" style="border-left-color:${esc(c.color || '#8b96a3')}">
        <div class="card-head"><input class="title" data-bind="cables.${i}.name" data-type="text" value="${esc(c.name)}" placeholder="Cable name">
          <button class="icon-btn" data-action="dupCable" data-i="${i}" title="Duplicate">⧉</button>
          <button class="icon-btn del" data-action="delCable" data-i="${i}" title="Delete" ${state.cables.length <= 1 ? 'disabled' : ''}>✕</button></div>
        <div class="grid2">
          ${field('Outer diameter (OD)', `cables.${i}.od`, c.od, { unit: 'mm' })}
          ${field('Weight in air', `cables.${i}.weight`, c.weight, { unit: 'kg/m' })}
          ${field('Min. bend radius (storage)', `cables.${i}.mbr`, c.mbr, { unit: 'm' })}
          ${field('Crush limit: max layers on top', `cables.${i}.maxLayers`, c.maxLayers || '', { unit: 'blank = no check', placeholder: '—' })}
        </div>
        <div class="derived" style="margin-top:8px" id="cabinfo-${i}"></div>
      </div>`;
    });
    h += '<button class="btn add" data-action="addCable">+ Add a cable type</button>';
    return h;
  }

  function renderPlanTab() {
    const opts = comps.map(c => ({ v: c.index, t: `${c.label} — ${c.name}` }));
    let h = '<div class="hint"><b>Loading order:</b> the first section in the list is loaded first, so it ends up at the bottom of the coil (or on the barrel) and comes off last. Sections loaded in the same compartment follow each other turn after turn.</div>';
    if (!state.sections.length) h += '<p class="muted">No section yet.</p>';
    state.sections.forEach((s, i) => {
      h += `<div class="sec-row" data-sec="${i}">
        <div><input type="color" data-bind="sections.${i}.color" data-type="text" value="${esc(s.color)}" title="Colour" style="width:18px;height:18px;border:none;padding:0;margin-top:6px"></div>
        <div class="fields">
          <input class="full" data-bind="sections.${i}.name" data-type="text" value="${esc(s.name)}" placeholder="Section name">
          <label class="f">Cable<select data-bind="sections.${i}.cableId" data-type="text">${state.cables.map(c => `<option value="${esc(c.id)}"${c.id === s.cableId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="f">${kind() === 'coil' ? 'Compartment' : 'Bay'}<select data-bind="sections.${i}.compartment" data-type="num">${opts.map(o => `<option value="${o.v}"${o.v === (s.compartment | 0) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select></label>
          <label class="f full">Length <span class="unit">(m)</span><span class="len-wrap"><input type="number" step="any" min="0" data-bind="sections.${i}.length" data-type="num" value="${esc(s.length)}"><button class="btn" data-action="fillMax" data-i="${i}" title="Set the length to the maximum this section can take">Max</button></span></label>
        </div>
        <div class="ctrl">
          <button class="icon-btn" data-action="up" data-i="${i}" title="Load earlier" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="icon-btn" data-action="down" data-i="${i}" title="Load later" ${i === state.sections.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="icon-btn del" data-action="delSec" data-i="${i}" title="Delete">✕</button>
        </div>
        <div class="meta" id="secmeta-${i}"></div>
      </div>`;
    });
    h += '<button class="btn add" data-action="addSec">+ Add a cable section</button>';
    return h;
  }

  function renderSettingsTab() {
    const w = state.winding, inf = state.info;
    const side = kind() === 'coil'
      ? `<option value="outer"${w.startSide === 'outer' ? ' selected' : ''}>Outer wall → inwards</option><option value="inner"${w.startSide !== 'outer' ? ' selected' : ''}>Core → outwards</option>`
      : `<option value="left"${w.startSide !== 'right' ? ' selected' : ''}>Left flange → right</option><option value="right"${w.startSide === 'right' ? ' selected' : ''}>Right flange → left</option>`;
    return `<h3 style="margin-top:0">${kind() === 'coil' ? 'Coiling' : 'Winding'}</h3><div class="grid2">
      <label class="f full">Stacking of layers<select data-bind="winding.stacking" data-type="text">
        <option value="square"${w.stacking !== 'nested' ? ' selected' : ''}>Square — each turn on top of the one below (conservative)</option>
        <option value="nested"${w.stacking === 'nested' ? ' selected' : ''}>Nested — turns sit in the grooves (close-packed)</option></select></label>
      ${field('Gap between turns', 'winding.turnGap', w.turnGap, { unit: 'mm' })}
      ${field('Gap between layers', 'winding.layerGap', w.layerGap, { unit: 'mm' })}
      <label class="f full">First layer starts at<select data-bind="winding.startSide" data-type="text">${side}</select></label>
    </div>
    <div class="hint">Layers alternate direction. Use a gap between turns to account for coiling quality (typically 0–10 % of OD in tanks). Nested stacking gives the theoretical maximum; square stacking is the usual planning basis.</div>
    <h3>Report information</h3><div class="grid2">
      ${field('Client / project', 'info.client', inf.client, { type: 'text' })}
      ${field('Vessel / site', 'info.vessel', inf.vessel, { type: 'text' })}
      ${field('Document reference', 'info.reference', inf.reference, { type: 'text' })}
      ${field('Prepared by', 'info.preparedBy', inf.preparedBy, { type: 'text' })}
      ${field('Date', 'info.date', inf.date, { type: 'date' })}
      ${field('Notes', 'info.notes', inf.notes, { type: 'textarea', full: true })}
    </div>`;
  }

  function renderTab() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
    const r = { carrier: renderCarrierTab, cables: renderCablesTab, plan: renderPlanTab, settings: renderSettingsTab }[ui.tab];
    $('tabBody').innerHTML = r();
    refreshInputMeta();
  }

  /* small live info inside the input panel */
  function refreshInputMeta() {
    if (!result) return;
    const d = $('derived');
    if (d) {
      d.innerHTML = result.compartments.map(cr => {
        const c = cr.comp;
        const geo = c.kind === 'coil'
          ? `R ${fmt(c.acrossMin, 2)} → ${fmt(c.acrossMax, 2)} m · width ${fmt(c.acrossMax - c.acrossMin, 2)} m · usable height ${fmt(c.stackMax, 2)} m`
          : `width ${fmt(c.acrossMax - c.acrossMin, 2)} m · winding depth ${fmt(c.stackMax - c.stackMin, 2)} m`;
        return `<div><span><b>${esc(c.label)}</b> ${esc(c.name)}<br><span class="muted">${geo}</span></span>${c.valid ? '' : '<span class="badge fail">invalid</span>'}</div>`;
      }).join('') || '<div class="muted">No compartment.</div>';
    }
    state.cables.forEach((cab, i) => {
      const el = $('cabinfo-' + i);
      if (!el) return;
      const row = capMatrix.find(m => m.cable.id === cab.id);
      el.innerHTML = result.compartments.map((cr, k) => `<div><span>Max. in ${esc(cr.comp.label)}</span><b class="num">${fmt(row ? row.caps[k] : 0, 0)} m · ${fmt((row ? row.caps[k] : 0) * num(cab.weight) / 1000, 1)} t</b></div>`).join('');
    });
    state.sections.forEach((s, i) => {
      const el = $('secmeta-' + i);
      if (!el) return;
      const sr = result.sections[i];
      if (!sr || sr.placed === undefined) { el.innerHTML = '<span class="bad">Not computed — check cable and compartment</span>'; return; }
      const end = sr.last ? `ends layer ${sr.last.layer}, turn ${sr.last.turn}` : '';
      el.innerHTML = `<span>Loaded <b class="num">${fmt(sr.placed, 0)} m</b> · ${fmt(sr.weight, 1)} t${end ? ' · ' + end : ''}</span>` +
        (sr.overflow > 0.01 ? `<span class="bad">✖ ${fmt(sr.overflow, 0)} m do not fit</span>` : '<span style="color:var(--ok)">✔ fits</span>');
    });
  }

  /* ---------------- events on the input panel ---------------- */
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }
  function readInput(el) {
    if (el.dataset.type === 'num') {
      if (el.tagName === 'SELECT') return parseInt(el.value, 10) || 0;
      return el.value === '' ? '' : num(el.value, 0);
    }
    return el.value;
  }

  let pending = false;
  function scheduleUpdate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  }

  $('tabBody').addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset.bind) return;
    setPath(state, el.dataset.bind, readInput(el));
    if (el.tagName !== 'SELECT') scheduleUpdate();
  });
  $('tabBody').addEventListener('change', e => {
    const el = e.target;
    if (!el.dataset.bind) return;
    setPath(state, el.dataset.bind, readInput(el));
    if (el.dataset.rerender === 'sortRings') state.carrier.rings.sort((a, b) => num(a.diameter) - num(b.diameter));
    if (el.tagName === 'SELECT' || el.dataset.rerender || el.type === 'color') { update(); renderTab(); } else scheduleUpdate();
  });
  $('tabBody').addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const i = parseInt(b.dataset.i, 10);
    const c = state.carrier;
    switch (b.dataset.action) {
      case 'type': {
        const wasCoil = kind() === 'coil';
        c.type = b.dataset.value;
        if (wasCoil !== (kind() === 'coil')) state.winding.startSide = kind() === 'coil' ? 'outer' : 'left';
        ui.zoom = 'all'; ui.view = 'section';
        break;
      }
      case 'addRing': {
        const last = c.rings[c.rings.length - 1];
        const prev = c.rings[c.rings.length - 2];
        const dNew = (num(prev.diameter) + num(last.diameter)) / 2;
        c.rings.splice(c.rings.length - 1, 0, { name: 'Cerce ' + (c.rings.length - 1), diameter: Math.round(dNew * 100) / 100, thickness: num(last.thickness) || 20, height: num(last.height) });
        break;
      }
      case 'delRing': c.rings.splice(i, 1); break;
      case 'addBay': c.drum.bays.push({ name: 'Bay ' + (c.drum.bays.length + 1), width: num(c.drum.bays[c.drum.bays.length - 1].width) || 1 }); break;
      case 'delBay': c.drum.bays.splice(i, 1); break;
      case 'addCable': state.cables.push({ id: uid(), name: 'Cable ' + (state.cables.length + 1), od: 150, weight: 40, mbr: 2, maxLayers: 0, color: PALETTE[(state.cables.length + 3) % PALETTE.length] }); break;
      case 'dupCable': state.cables.splice(i + 1, 0, Object.assign({}, state.cables[i], { id: uid(), name: state.cables[i].name + ' (copy)' })); break;
      case 'delCable': {
        const id = state.cables[i].id;
        state.cables.splice(i, 1);
        state.sections.forEach(s => { if (s.cableId === id) s.cableId = state.cables[0].id; });
        break;
      }
      case 'addSec': {
        const last = state.sections[state.sections.length - 1];
        const used = new Set(state.sections.map(s => s.color));
        const color = PALETTE.find(p => !used.has(p)) || PALETTE[state.sections.length % PALETTE.length];
        state.sections.push({ id: uid(), name: 'Section ' + (state.sections.length + 1), cableId: last ? last.cableId : state.cables[0].id, length: last ? num(last.length) : 1000, compartment: last ? last.compartment : 0, color });
        break;
      }
      case 'delSec': state.sections.splice(i, 1); break;
      case 'up': if (i > 0) state.sections.splice(i - 1, 0, state.sections.splice(i, 1)[0]); break;
      case 'down': if (i < state.sections.length - 1) state.sections.splice(i + 1, 0, state.sections.splice(i, 1)[0]); break;
      case 'fillMax': {
        const s = state.sections[i];
        const cab = cableById(s.cableId);
        const comp = comps[s.compartment | 0];
        if (!cab || !comp) break;
        const pre = state.sections.slice(0, i).filter(x => (x.compartment | 0) === (s.compartment | 0) && cableById(x.cableId))
          .map(x => ({ length: num(x.length), d: num(cableById(x.cableId).od) / 1000, w: num(cableById(x.cableId).weight) }));
        s.length = Math.floor(capacity(comp, cab, state.winding, pre));
        break;
      }
      default: return;
    }
    update();
    renderTab();
  });

  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { ui.tab = b.dataset.tab; renderTab(); }));

  /* ================================================================== */
  /* Results                                                             */
  /* ================================================================== */
  function update() {
    comps = compartments(state.carrier);
    const nComp = comps.length;
    state.sections.forEach(s => { if ((s.compartment | 0) >= nComp) s.compartment = Math.max(0, nComp - 1); });
    result = compute(state);
    capMatrix = capacityMatrix(state);
    $('projectName').value = state.name || '';
    renderKPIs();
    renderStatus();
    renderViewControls();
    drawCanvas();
    renderLegend();
    renderGauges();
    renderSectionsTable();
    renderCompTable();
    renderCapTable();
    renderReportHead();
    refreshInputMeta();
    autosave();
  }

  function renderKPIs() {
    const t = result.totals;
    const k = (label, v, cls) => `<div class="kpi ${cls || ''}"><div class="k">${label}</div><div class="v">${v}</div></div>`;
    const loadCls = t.loadPct === null ? '' : t.loadPct > 1 ? 'fail' : t.loadPct > 0.95 ? 'warn' : 'ok';
    let h = k('Loaded', `${fmt(t.length / 1000, 2)} km`) +
      k('Cable weight', `${fmt(t.weight, 1)} t${t.maxLoad ? ` / ${fmt(t.maxLoad, 0)}` : ''}`, loadCls);
    if (t.loadPct !== null) h += k('Load', `${fmt(t.loadPct * 100, 1)} %`, loadCls);
    h += k('Spare capacity', `${fmt(t.remaining / 1000, 2)} km`);
    if (t.vcg !== null) h += k('Cable VCG', `${fmt(t.vcg, 2)} m`);
    h += k('Status', t.status === 'ok' ? 'OK' : t.status === 'warn' ? 'Check' : 'NOT OK', t.status);
    $('kpis').innerHTML = h;
  }

  function renderStatus() {
    const order = { fail: 0, warn: 1, info: 2, ok: 3 };
    const checks = result.checks.slice().sort((a, b) => order[a.level] - order[b.level]);
    const cls = result.totals.status;
    $('statusBox').innerHTML = `<div class="status ${cls}">${checks.map(c => `<div class="line ${c.level}">${esc(c.text)}</div>`).join('')}</div>`;
  }

  /* ---------------- view controls ---------------- */
  function views() {
    return kind() === 'coil'
      ? [{ id: 'section', t: 'Cross-section' }, { id: 'plan', t: 'Plan view (top layer)' }]
      : [{ id: 'section', t: 'Cross-section' }, { id: 'side', t: 'Side view' }];
  }
  function renderViewControls() {
    const vs = views();
    if (!vs.some(v => v.id === ui.view)) ui.view = 'section';
    $('viewPills').innerHTML = vs.map(v => `<button data-view="${v.id}" class="${v.id === ui.view ? 'active' : ''}">${v.t}</button>`).join('');
    const allowAll = !(ui.view === 'side');
    if (!allowAll && ui.zoom === 'all') ui.zoom = '0';
    if (ui.zoom !== 'all' && !(parseInt(ui.zoom, 10) < comps.length)) ui.zoom = allowAll ? 'all' : '0';
    $('zoomSelect').innerHTML = (allowAll ? `<option value="all">All ${kind() === 'coil' ? 'compartments' : 'bays'}</option>` : '') +
      comps.map(c => `<option value="${c.index}"${String(c.index) === ui.zoom ? ' selected' : ''}>${esc(c.label)} — ${esc(c.name)}</option>`).join('');
    $('zoomSelect').value = ui.zoom;
    const typeLabel = (CARRIER_TYPES[state.carrier.type] || {}).label || '';
    $('vizTitle').textContent = `${state.carrier.name ? state.carrier.name + ' — ' : ''}${typeLabel}`;
  }
  $('viewPills').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (ui.view === 'side' && b.dataset.view !== 'side') ui.zoom = 'all'; ui.view = b.dataset.view; renderViewControls(); drawCanvas(); });
  $('zoomSelect').addEventListener('change', e => { ui.zoom = e.target.value; drawCanvas(); });
  $('showLabels').addEventListener('change', e => { ui.labels = e.target.checked; drawCanvas(); });

  /* ================================================================== */
  /* Canvas drawing                                                      */
  /* ================================================================== */
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  let hit = { mode: null, items: [], view: null }; // for the tooltip
  const STEEL = '#8b96a3', STEEL_D = '#5d6b7a';

  function sectionColor(i) { const s = state.sections[i]; return (s && s.color) || PALETTE[i % PALETTE.length]; }
  function turnSection(cr, t) {
    // section index (global) that holds the biggest share of this turn
    let best = t.segs[0];
    t.segs.forEach(s => { if (s.length > best.length) best = s; });
    return cr.sectionIdx[best.item];
  }

  function niceStep(span, target) {
    const raw = span / Math.max(1, target);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function makeView(world, W, H, pad) {
    const sx = (W - pad.l - pad.r) / (world.x1 - world.x0);
    const sy = (H - pad.t - pad.b) / (world.y1 - world.y0);
    const s = Math.min(sx, sy);
    const ox = pad.l + ((W - pad.l - pad.r) - s * (world.x1 - world.x0)) / 2;
    const oy = pad.t + ((H - pad.t - pad.b) - s * (world.y1 - world.y0)) / 2;
    return {
      s, world,
      X: x => ox + (x - world.x0) * s,
      Y: y => oy + (world.y1 - y) * s,
      invX: px => world.x0 + (px - ox) / s,
      invY: py => world.y1 - (py - oy) / s,
    };
  }

  function drawAxes(v, xLabel, yLabel, opts) {
    opts = opts || {};
    const w = v.world;
    ctx.save();
    ctx.strokeStyle = '#c9d1da'; ctx.fillStyle = '#5d6b7a'; ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    const xs = niceStep(w.x1 - w.x0, 10), ys = niceStep(w.y1 - w.y0, 7);
    const yb = v.Y(w.y0), xl = v.X(w.x0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = Math.ceil(w.x0 / xs) * xs; x <= w.x1 + 1e-9; x += xs) {
      const px = v.X(x);
      ctx.beginPath(); ctx.moveTo(px, yb); ctx.lineTo(px, yb + 4); ctx.stroke();
      ctx.fillText(fmt(Math.abs(x) < 1e-9 ? 0 : x, xs < 1 ? 1 : 0), px, yb + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = Math.ceil(w.y0 / ys) * ys; y <= w.y1 + 1e-9; y += ys) {
      const py = v.Y(y);
      ctx.beginPath(); ctx.moveTo(xl - 4, py); ctx.lineTo(xl, py); ctx.stroke();
      ctx.fillText(fmt(Math.abs(y) < 1e-9 ? 0 : y, ys < 1 ? 1 : 0), xl - 6, py);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(xLabel, (v.X(w.x0) + v.X(w.x1)) / 2, canvas.clientHeight - 2);
    ctx.save(); ctx.translate(12, (v.Y(w.y0) + v.Y(w.y1)) / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'top'; ctx.fillText(yLabel, 0, 0); ctx.restore();
    ctx.restore();
  }

  function rect(v, x0, y0, x1, y1, fill, stroke) {
    const X0 = v.X(Math.min(x0, x1)), X1 = v.X(Math.max(x0, x1));
    const Y0 = v.Y(Math.max(y0, y1)), Y1 = v.Y(Math.min(y0, y1));
    const w = Math.max(X1 - X0, 2);
    ctx.fillStyle = fill; ctx.fillRect(X0, Y0, w, Y1 - Y0);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(X0, Y0, w, Y1 - Y0); }
  }

  function dashed(v, x0, x1, y, color, label) {
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(v.X(x0), v.Y(y)); ctx.lineTo(v.X(x1), v.Y(y)); ctx.stroke();
    if (label && ui.labels) { ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = '10.5px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(label, v.X(x1) - 3, v.Y(y) - 2); }
    ctx.restore();
  }

  function drawTurns(v, cr, mapXY) {
    const minR = 0.45;
    cr.fill.turns.forEach(t => {
      const [x, y] = mapXY(t);
      const px = v.X(x), py = v.Y(y);
      const r = Math.max(minR, t.d / 2 * v.s * 0.96);
      const si = turnSection(cr, t);
      ctx.fillStyle = sectionColor(si);
      const partial = t.used < t.circ - 1e-6;
      ctx.globalAlpha = partial ? 0.45 : 1;
      if (r < 1.6) ctx.fillRect(px - r, py - r, r * 2, r * 2);
      else { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); if (r > 4) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .6; ctx.stroke(); } }
      ctx.globalAlpha = 1;
      hit.items.push({ px, py, r: Math.max(r, 3), cr, t });
    });
  }

  function drawMarkers(v, list) {
    // list: [{px, py, text, color}]
    if (!ui.labels) return;
    ctx.save();
    ctx.font = '600 11px system-ui, sans-serif';
    const placed = [];
    list.forEach(m => {
      ctx.beginPath(); ctx.arc(m.px, m.py, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#0f2742'; ctx.stroke();
      const tw = ctx.measureText(m.text).width + 12;
      let lx = m.px + 14, ly = m.py - 26;
      if (lx + tw > canvas.clientWidth - 4) lx = m.px - 14 - tw;
      if (ly < 4) ly = m.py + 12;
      for (let k = 0; k < 12 && placed.some(p => Math.abs(p.y - ly) < 19 && lx < p.x + p.w && lx + tw > p.x); k++) ly += 20;
      placed.push({ x: lx, y: ly, w: tw });
      ctx.strokeStyle = '#0f2742'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.px, m.py); ctx.lineTo(lx < m.px ? lx + tw : lx, ly + 9); ctx.stroke();
      ctx.fillStyle = '#0f2742'; roundRect(lx, ly, tw, 18, 4); ctx.fill();
      ctx.fillStyle = m.color; ctx.fillRect(lx + 4, ly + 5, 3, 8);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(m.text, lx + 9, ly + 9.5);
    });
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function sectionEndMarkers(v, crs, mapXY) {
    const list = [];
    crs.forEach(cr => {
      cr.sectionIdx.forEach((si, j) => {
        const sr = result.sections[si];
        if (!sr || !sr.last || !(sr.placed > 0)) return;
        const t = { across: sr.last.across, stack: sr.last.stack, d: sr.last.d };
        const [x, y] = mapXY(t);
        list.push({ px: v.X(x), py: v.Y(y), text: `${shortName(si)} end · ${fmt(sr.placed, 0)} m`, color: sectionColor(si) });
        if (j === 0 && sr.first) {
          const t0 = { across: sr.first.across, stack: sr.first.stack };
          const [x0, y0] = mapXY(t0);
          list.push({ px: v.X(x0), py: v.Y(y0), text: `${shortName(si)} start`, color: sectionColor(si) });
        }
      });
    });
    drawMarkers(v, list);
  }
  function shortName(si) { const s = state.sections[si]; const n = (s && s.name) || 'S' + (si + 1); return n.length > 22 ? n.slice(0, 21) + '…' : n; }

  function selectedComps() {
    return ui.zoom === 'all' ? result.compartments : [result.compartments[parseInt(ui.zoom, 10)]].filter(Boolean);
  }

  function drawCoilSection(W, H) {
    const rings = state.carrier.rings.slice().sort((a, b) => num(a.diameter) - num(b.diameter));
    const crs = selectedComps();
    if (!crs.length) return noData('No compartment');
    let x0, x1;
    if (ui.zoom === 'all') { x0 = num(rings[0].diameter) / 2; x1 = num(rings[rings.length - 1].diameter) / 2 + num(rings[rings.length - 1].thickness) / 1000; }
    else { const c = crs[0].comp; x0 = c.acrossMin - num(rings[c.innerRing].thickness) / 1000; x1 = c.acrossMax + num(rings[c.outerRing].thickness) / 1000; }
    const hMax = Math.max(...rings.map(r => num(r.height)), 0.1);
    const spanX = x1 - x0;
    const world = { x0: x0 - spanX * 0.04, x1: x1 + spanX * 0.04, y0: -hMax * 0.04, y1: hMax * 1.08 };
    const v = makeView(world, W, H, { l: 46, r: 14, t: 14, b: 34 });
    drawAxes(v, 'Radius from turntable / tank centre (m)', 'Height above floor (m)');
    rect(v, world.x0, -hMax * 0.04, world.x1, 0, '#d9dfe6');
    // walls
    rings.forEach(r => {
      const ri = num(r.diameter) / 2, ro = ri + Math.max(num(r.thickness) / 1000, 0);
      if (ro < world.x0 || ri > world.x1) return;
      rect(v, ri, 0, ro, num(r.height), STEEL, STEEL_D);
      if (ui.labels) { ctx.fillStyle = STEEL_D; ctx.font = '600 10.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(r.name || '', v.X((ri + ro) / 2), v.Y(num(r.height)) - 3); }
    });
    crs.forEach(cr => {
      const c = cr.comp;
      if (!c.valid) return;
      dashed(v, c.acrossMin, c.acrossMax, c.stackMax, '#c0392b', `max stack ${fmt(c.stackMax, 2)} m`);
      if (cr.fill.turns.length) dashed(v, c.acrossMin, c.acrossMax, cr.fill.top, '#0f2742', `top of cable ${fmt(cr.fill.top, 2)} m`);
      drawTurns(v, cr, t => [t.across, t.stack]);
      if (ui.labels) { ctx.fillStyle = '#173a5e'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${c.label} · ${fmt(cr.usedPct * 100, 0)} % height`, v.X((c.acrossMin + c.acrossMax) / 2), v.Y(world.y1) + 2); }
    });
    sectionEndMarkers(v, crs, t => [t.across, t.stack]);
    hit.view = v; hit.mode = 'circles';
  }

  function drawDrumSection(W, H) {
    const d = state.carrier.drum;
    const crs = selectedComps();
    if (!crs.length) return noData('No bay');
    const tFl = Math.max(num(d.flangeThickness) / 1000, 0);
    const Rb = num(d.barrelDiameter) / 2, Rf = num(d.flangeDiameter) / 2;
    const all = result.compartments;
    const totalW = all.length ? all[all.length - 1].comp.acrossMax : 1;
    let x0 = -tFl, x1 = totalW + tFl;
    if (ui.zoom !== 'all') { x0 = crs[0].comp.acrossMin - tFl; x1 = crs[0].comp.acrossMax + tFl; }
    const depth = Math.max(Rf - Rb, 0.1);
    const y0 = Math.max(0, Rb - depth * 0.25);
    const world = { x0: x0 - (x1 - x0) * 0.03, x1: x1 + (x1 - x0) * 0.03, y0, y1: Rf + depth * 0.06 };
    const v = makeView(world, W, H, { l: 46, r: 14, t: 18, b: 34 });
    drawAxes(v, 'Axial position from inner face of the first flange (m)', 'Radius from drum axis (m)');
    rect(v, -tFl, y0, totalW + tFl, Rb, '#b9c2cc', STEEL_D); // barrel
    // flanges
    let x = 0;
    rect(v, -tFl, y0, 0, Rf, STEEL, STEEL_D);
    all.forEach(cr => { x = cr.comp.acrossMax; rect(v, x, y0, x + tFl, Rf, STEEL, STEEL_D); });
    crs.forEach(cr => {
      const c = cr.comp;
      if (!c.valid) return;
      dashed(v, c.acrossMin, c.acrossMax, c.stackMax, '#c0392b', `freeboard limit R ${fmt(c.stackMax, 2)} m`);
      drawTurns(v, cr, t => [t.across, t.stack]);
      if (ui.labels) { ctx.fillStyle = '#173a5e'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${c.name} · ${cr.fill.layers} layers`, v.X((c.acrossMin + c.acrossMax) / 2), 2); }
    });
    sectionEndMarkers(v, crs, t => [t.across, t.stack]);
    hit.view = v; hit.mode = 'circles';
  }

  function drawCoilPlan(W, H) {
    const rings = state.carrier.rings.slice().sort((a, b) => num(a.diameter) - num(b.diameter));
    const crs = selectedComps();
    const Rmax = num(rings[rings.length - 1].diameter) / 2 + num(rings[rings.length - 1].thickness) / 1000;
    const world = { x0: -Rmax * 1.05, x1: Rmax * 1.05, y0: -Rmax * 1.05, y1: Rmax * 1.05 };
    const v = makeView(world, W, H, { l: 10, r: 10, t: 10, b: 10 });
    const cx = v.X(0), cy = v.Y(0);
    // floor
    ctx.beginPath(); ctx.arc(cx, cy, Rmax * v.s, 0, Math.PI * 2); ctx.fillStyle = '#eef1f5'; ctx.fill();
    hit.items = [];
    crs.forEach(cr => {
      // top visible turn in each radial slot: draw layers in order, upper ones last (segments as arcs)
      const turns = cr.fill.turns.slice().sort((a, b) => a.layer - b.layer);
      const nL = cr.fill.layers;
      turns.forEach(t => {
        if (t.layer < nL - 1) return;
        const rr = t.across * v.s;
        ctx.lineWidth = Math.max(1, t.d * v.s * 0.92);
        t.segs.forEach(sg => {
          ctx.strokeStyle = sectionColor(cr.sectionIdx[sg.item]);
          ctx.globalAlpha = t.layer === nL ? 1 : 0.55;
          ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2 + sg.from * 2 * Math.PI, -Math.PI / 2 + sg.to * 2 * Math.PI); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        if (t.layer === nL || !turns.some(u => u.layer === nL && Math.abs(u.across - t.across) < t.d / 2)) hit.items.push({ r0: t.across - t.d / 2, r1: t.across + t.d / 2, cr, t });
      });
    });
    rings.forEach(r => {
      const ri = num(r.diameter) / 2, ro = ri + Math.max(num(r.thickness) / 1000, 0.02);
      ctx.beginPath(); ctx.arc(cx, cy, (ri + ro) / 2 * v.s, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, (ro - ri) * v.s); ctx.strokeStyle = STEEL_D; ctx.stroke();
    });
    // section end markers on the top layer (angle from frac)
    const list = [];
    crs.forEach(cr => cr.sectionIdx.forEach(si => {
      const sr = result.sections[si];
      if (!sr || !sr.last || !(sr.placed > 0)) return;
      if (sr.last.layer < cr.fill.layers - 1) return; // buried
      const a = -Math.PI / 2 + sr.last.frac * 2 * Math.PI;
      list.push({ px: cx + Math.cos(a) * sr.last.across * v.s, py: cy + Math.sin(a) * sr.last.across * v.s, text: `${shortName(si)} end`, color: sectionColor(si) });
    }));
    drawMarkers(v, list);
    if (ui.labels) {
      ctx.fillStyle = '#5d6b7a'; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Top two layers seen from above. Turns start at 12 o\'clock and run clockwise.', 10, 8);
    }
    hit.view = v; hit.mode = 'radial'; hit.center = [cx, cy];
  }

  function drawDrumSide(W, H) {
    const d = state.carrier.drum;
    const cr = selectedComps()[0];
    if (!cr) return noData('No bay');
    const Rb = num(d.barrelDiameter) / 2, Rf = num(d.flangeDiameter) / 2;
    const world = { x0: -Rf * 1.06, x1: Rf * 1.06, y0: -Rf * 1.06, y1: Rf * 1.06 };
    const v = makeView(world, W, H, { l: 10, r: 10, t: 10, b: 10 });
    const cx = v.X(0), cy = v.Y(0);
    ctx.beginPath(); ctx.arc(cx, cy, Rf * v.s, 0, Math.PI * 2); ctx.fillStyle = '#e3e8ee'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = STEEL_D; ctx.stroke();
    hit.items = [];
    // one ring per layer, coloured by the section that holds most of it
    const byLayer = {};
    cr.fill.turns.forEach(t => { (byLayer[t.layer] = byLayer[t.layer] || []).push(t); });
    Object.keys(byLayer).map(Number).sort((a, b) => a - b).forEach(L => {
      const ts = byLayer[L];
      const share = {};
      ts.forEach(t => t.segs.forEach(sg => { const si = cr.sectionIdx[sg.item]; share[si] = (share[si] || 0) + sg.length; }));
      const parts = Object.keys(share).map(Number);
      const tot = parts.reduce((a, si) => a + share[si], 0);
      const capL = ts.length * ts[0].circ;
      const r = ts[0].stack, dd = Math.max(...ts.map(t => t.d));
      ctx.lineWidth = Math.max(1, dd * v.s * 0.92);
      let a0 = -Math.PI / 2;
      parts.forEach(si => {
        const a1 = a0 + share[si] / capL * 2 * Math.PI;
        ctx.strokeStyle = sectionColor(si);
        ctx.beginPath(); ctx.arc(cx, cy, r * v.s, a0, a1); ctx.stroke();
        a0 = a1;
      });
      hit.items.push({ r0: r - dd / 2, r1: r + dd / 2, cr, layer: L, ts, share, tot, capL });
    });
    ctx.beginPath(); ctx.arc(cx, cy, Rb * v.s, 0, Math.PI * 2); ctx.fillStyle = '#b9c2cc'; ctx.fill(); ctx.strokeStyle = STEEL_D; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, Rb * v.s * 0.12), 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    // freeboard circle
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, cr.comp.stackMax * v.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (ui.labels) {
      ctx.fillStyle = '#5d6b7a'; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${cr.comp.name}: one ring per layer, split by section share. Red dashed = freeboard limit.`, 10, 8);
    }
    hit.view = v; hit.mode = 'radial'; hit.center = [cx, cy];
  }

  function noData(msg) {
    ctx.fillStyle = '#5d6b7a'; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(msg, canvas.clientWidth / 2, canvas.clientHeight / 2);
  }

  function drawCanvas() {
    if (!result) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hit = { mode: null, items: [], view: null };
    if (kind() === 'coil') (ui.view === 'plan' ? drawCoilPlan : drawCoilSection)(W, H);
    else (ui.view === 'side' ? drawDrumSide : drawDrumSection)(W, H);
  }

  /* ---------------- tooltip ---------------- */
  const tip = $('tooltip');
  canvas.addEventListener('mousemove', e => {
    const rc = canvas.getBoundingClientRect();
    const mx = e.clientX - rc.left, my = e.clientY - rc.top;
    let html = '';
    if (hit.mode === 'circles') {
      let best = null, bd = Infinity;
      hit.items.forEach(it => { const d2 = (it.px - mx) ** 2 + (it.py - my) ** 2; if (d2 < it.r * it.r && d2 < bd) { bd = d2; best = it; } });
      if (best) html = turnTip(best.cr, best.t);
    } else if (hit.mode === 'radial') {
      const r = Math.hypot(mx - hit.center[0], my - hit.center[1]) / hit.view.s;
      const it = hit.items.slice().reverse().find(x => r >= x.r0 && r <= x.r1);
      if (it && it.t) html = turnTip(it.cr, it.t);
      else if (it && it.ts) html = layerTip(it);
    }
    if (!html) { tip.style.display = 'none'; return; }
    tip.innerHTML = html; tip.style.display = 'block';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = mx + 14, y = my + 14;
    if (x + tw > rc.width - 4) x = mx - tw - 14;
    if (y + th > rc.height - 4) y = my - th - 14;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  });
  canvas.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  function turnTip(cr, t) {
    const c = cr.comp;
    const nT = cr.fill.turnsPerLayer[t.layer];
    let h = '';
    t.segs.forEach(sg => {
      const si = cr.sectionIdx[sg.item];
      const s = state.sections[si];
      const cab = s && cableById(s.cableId);
      h += `<div><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${esc(sectionColor(si))};margin-right:5px"></span><b>${esc(s ? s.name : '')}</b> <span style="opacity:.75">${esc(cab ? cab.name : '')}</span><br>Section KP ${fmt(sg.kp, 0)} → ${fmt(sg.kp + sg.length, 0)} m</div>`;
    });
    h += `<div style="margin-top:4px;opacity:.9">${esc(c.label)} · Layer ${t.layer} / ${cr.fill.layers} · Turn ${t.turn} / ${nT}<br>`;
    if (c.kind === 'coil') h += `R ${fmt(t.across, 2)} m · centre H ${fmt(t.stack, 2)} m · top ${fmt(t.stack + t.d / 2, 2)} m<br>`;
    else h += `R ${fmt(t.stack, 2)} m · ${fmt(t.across - c.acrossMin, 2)} m from left flange<br>`;
    h += `Turn length ${fmt(t.circ, 1)} m${t.used < t.circ - 1e-6 ? ` (${fmt(t.used / t.circ * 100, 0)} % used)` : ''}</div>`;
    return h;
  }
  function layerTip(it) {
    let h = `<b>${esc(it.cr.comp.name)}</b> · Layer ${it.layer} / ${it.cr.fill.layers}<br>${it.ts.length} turns · R ${fmt(it.ts[0].stack, 2)} m · ${fmt(it.tot, 0)} m of cable`;
    Object.keys(it.share).forEach(si => { h += `<br><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${esc(sectionColor(+si))};margin-right:5px"></span>${esc(state.sections[si].name)}: ${fmt(it.share[si], 0)} m`; });
    return h;
  }

  window.addEventListener('resize', () => drawCanvas());
  window.addEventListener('beforeprint', () => drawCanvas());

  /* ---------------- legend & gauges ---------------- */
  function renderLegend() {
    let h = state.sections.map((s, i) => `<span><i style="background:${esc(sectionColor(i))}"></i>${esc(s.name)}</span>`).join('');
    h += `<span><i style="background:${STEEL}"></i>${kind() === 'coil' ? 'Rings / walls' : 'Barrel & flanges'}</span>`;
    h += '<span><i style="background:repeating-linear-gradient(90deg,#c0392b 0 4px,transparent 4px 7px);height:3px"></i>Max. stack / freeboard limit</span>';
    h += '<span><i style="background:#999;opacity:.45"></i>Partly used turn</span>';
    $('legend').innerHTML = h;
  }

  function renderGauges() {
    $('gauges').innerHTML = result.compartments.map(cr => {
      const c = cr.comp;
      const cap = cr.length + cr.remaining;
      let over = 0;
      const parts = cr.sectionIdx.map(si => { const sr = result.sections[si]; over += sr.overflow || 0; return { si, len: sr.placed || 0 }; });
      const denom = Math.max(cap + over, 1e-9);
      const segs = parts.map(p => {
        const w = p.len / denom * 100;
        return w > 0 ? `<div style="width:${w}%;background:${esc(sectionColor(p.si))}" title="${esc(state.sections[p.si].name)}: ${fmt(p.len, 0)} m">${w > 9 ? esc(shortName(p.si)) + ' · ' + fmt(p.len, 0) + ' m' : ''}</div>` : '';
      }).join('') + (over > 0.01 ? `<div class="overflow" style="width:${over / denom * 100}%" title="Does not fit: ${fmt(over, 0)} m">${over / denom > 0.1 ? 'overflow ' + fmt(over, 0) + ' m' : ''}</div>` : '');
      const refName = cr.refCable ? cr.refCable.name : '';
      return `<div class="gauge"><div class="g-head"><span><b>${esc(c.label)}</b> ${esc(c.name)}</span>
        <span class="num">${fmt(cr.length, 0)} m · ${fmt(cr.weight, 1)} t · ${cr.fill.layers} layers · stack ${fmt(cr.used, 2)} / ${fmt(c.stackMax - c.stackMin, 2)} m (${fmt(cr.usedPct * 100, 0)} %)</span></div>
        <div class="bar">${segs}</div>
        <div class="scale"><span>0 m</span><span>${cr.fill.full ? '<b style="color:var(--fail)">FULL</b>' : `spare ≈ ${fmt(cr.remaining, 0)} m of ${esc(refName)}`}</span><span>${fmt(cap, 0)} m</span></div></div>`;
    }).join('');
  }

  /* ---------------- tables ---------------- */
  function posText(cr, p, isEnd) {
    if (!p) return '–';
    const c = cr.comp;
    const nT = cr.fill.turnsPerLayer[p.layer] || '?';
    const pct = isEnd ? ` <span class="muted">(${fmt(p.frac * 100, 0)} % of turn)</span>` : '';
    let h = `<b>Layer ${p.layer}</b>/${cr.fill.layers} · turn ${p.turn}/${nT}${pct}<br>`;
    if (c.kind === 'coil') h += `R ${fmt(p.across, 2)} m · H ${fmt(p.stack, 2)} m · ${p.dir > 0 ? 'coiling outwards' : 'coiling inwards'}`;
    else h += `R ${fmt(p.stack, 2)} m · ${fmt(p.across - c.acrossMin, 2)} m from left flange · ${p.dir > 0 ? 'traversing →' : 'traversing ←'}`;
    return `<span class="pos">${h}</span>`;
  }

  function renderSectionsTable() {
    if (!state.sections.length) { $('sectionsTable').innerHTML = '<p class="muted">No section in the loading plan.</p>'; return; }
    let h = `<table class="data"><thead><tr><th>#</th><th>Section</th><th>Cable</th><th>${kind() === 'coil' ? 'Compartment' : 'Bay'}</th><th class="r">Length (m)</th><th class="r">Loaded (m)</th><th class="r">Weight (t)</th><th>Inner end (start of loading)</th><th>Outer end (end of loading)</th><th class="r">Off-load</th><th>Status</th></tr></thead><tbody>`;
    result.sections.forEach((sr, i) => {
      const s = state.sections[i];
      const cr = result.compartments[sr.compIndex];
      const cab = sr.cable;
      let status = '<span class="badge ok">OK</span>';
      if (sr.placed === undefined || !cr) status = '<span class="badge fail">Error</span>';
      else if (sr.overflow > 0.01) status = `<span class="badge fail">Overflow ${fmt(sr.overflow, 0)} m</span>`;
      else if (cab && num(cab.mbr) > 0 && sr.minRadius < num(cab.mbr)) status = '<span class="badge fail">MBR</span>';
      else if (cab && num(cab.maxLayers) > 0 && cr.fill.layers - sr.minLayer > num(cab.maxLayers)) status = '<span class="badge fail">Crush</span>';
      const offOrder = cr ? cr.sectionIdx.length - cr.sectionIdx.indexOf(i) : '';
      h += `<tr><td>${i + 1}</td><td class="sec"><span class="dot" style="background:${esc(sectionColor(i))}"></span><b>${esc(s.name)}</b></td><td class="cab">${esc(cab ? cab.name : '–')}<br><span class="muted">${cab ? `Ø ${fmt(num(cab.od), 0)} mm · ${fmt(num(cab.weight), 1)} kg/m` : ''}</span></td>
        <td>${cr ? esc(cr.comp.label) : '–'}</td><td class="r">${fmt(num(s.length), 0)}</td><td class="r">${fmt(sr.placed, 0)}</td><td class="r">${fmt(sr.weight, 1)}</td>
        <td class="posc">${cr ? posText(cr, sr.first, false) : '–'}</td><td class="posc">${cr ? posText(cr, sr.last, true) : '–'}</td><td class="r">${offOrder ? '#' + offOrder : ''}</td><td>${status}</td></tr>`;
    });
    h += '</tbody></table>';
    $('sectionsTable').innerHTML = h;
  }

  function renderCompTable() {
    const coil = kind() === 'coil';
    let h = `<table class="data"><thead><tr><th>${coil ? 'Compartment' : 'Bay'}</th><th>Geometry</th><th class="r">Sections</th><th class="r">Loaded (m)</th><th class="r">Weight (t)</th><th class="r">Layers</th><th class="r">Turns / layer</th><th class="r">Stack used</th>${coil ? '<th class="r">Cable VCG</th>' : ''}<th class="r">Spare capacity</th></tr></thead><tbody>`;
    result.compartments.forEach(cr => {
      const c = cr.comp;
      const geo = coil ? `R ${fmt(c.acrossMin, 2)}–${fmt(c.acrossMax, 2)} m · H ${fmt(c.stackMax, 2)} m` : `W ${fmt(c.acrossMax - c.acrossMin, 2)} m · R ${fmt(c.stackMin, 2)}–${fmt(c.stackMax, 2)} m`;
      h += `<tr><td><b>${esc(c.label)}</b><br><span class="muted">${esc(c.name)}</span></td><td>${geo}</td><td class="r">${cr.sectionIdx.length}</td><td class="r">${fmt(cr.length, 0)}</td><td class="r">${fmt(cr.weight, 1)}</td>
        <td class="r">${cr.fill.layers}</td><td class="r">${cr.turnsLayer1}</td><td class="r">${fmt(cr.used, 2)} m<br><span class="muted">${fmt(cr.usedPct * 100, 0)} %</span></td>${coil ? `<td class="r">${cr.vcg === null ? '–' : fmt(cr.vcg, 2) + ' m'}</td>` : ''}
        <td class="r">${cr.fill.full ? '<span class="badge fail">full</span>' : fmt(cr.remaining, 0) + ' m'}<br><span class="muted">${esc(cr.refCable ? cr.refCable.name : '')}</span></td></tr>`;
    });
    const t = result.totals;
    h += `<tr><td><b>Total</b></td><td></td><td class="r">${state.sections.length}</td><td class="r"><b>${fmt(t.length, 0)}</b></td><td class="r"><b>${fmt(t.weight, 1)}</b>${num(state.carrier.tare) ? `<br><span class="muted">gross ${fmt(t.gross, 1)}</span>` : ''}</td><td></td><td></td><td></td>${coil ? `<td class="r">${t.vcg === null ? '–' : fmt(t.vcg, 2) + ' m'}</td>` : ''}<td class="r"><b>${fmt(t.remaining, 0)} m</b></td></tr>`;
    h += '</tbody></table>';
    if (coil) h += '<p class="muted" style="font-size:11.5px;margin:6px 0 0">Cable VCG = vertical centre of gravity of the loaded cable above the tank / turntable floor (for stability calculations).</p>';
    $('compTable').innerHTML = h;
  }

  function renderCapTable() {
    const maxLoad = num(state.carrier.maxLoad);
    let h = `<table class="data"><thead><tr><th>Cable</th>${result.compartments.map(cr => `<th class="r">${esc(cr.comp.label)}</th>`).join('')}<th class="r">Total (volume)</th><th class="r">Weight at total</th>${maxLoad ? '<th class="r">Limit by SWL</th><th class="r">Max. loadable</th>' : ''}</tr></thead><tbody>`;
    capMatrix.forEach(row => {
      const tot = row.caps.reduce((a, b) => a + b, 0);
      const w = tot * num(row.cable.weight) / 1000;
      const bySwl = num(row.cable.weight) > 0 ? maxLoad * 1000 / num(row.cable.weight) : Infinity;
      h += `<tr><td><b>${esc(row.cable.name)}</b><br><span class="muted">Ø ${fmt(num(row.cable.od), 0)} mm · ${fmt(num(row.cable.weight), 1)} kg/m</span></td>${row.caps.map(c => `<td class="r">${fmt(c, 0)} m</td>`).join('')}
        <td class="r"><b>${fmt(tot, 0)} m</b></td><td class="r">${fmt(w, 1)} t</td>${maxLoad ? `<td class="r">${fmt(bySwl, 0)} m</td><td class="r"><b>${fmt(Math.min(tot, bySwl), 0)} m</b><br><span class="muted">${bySwl < tot ? 'limited by weight' : 'limited by volume'}</span></td>` : ''}</tr>`;
    });
    h += '</tbody></table>';
    $('capTable').innerHTML = h;
  }

  function renderReportHead() {
    const i = state.info, c = state.carrier;
    const rows = [['Client / project', i.client], ['Vessel / site', i.vessel], ['Reference', i.reference], ['Prepared by', i.preparedBy], ['Date', i.date]].filter(r => r[1]);
    const w = state.winding;
    $('reportHead').innerHTML = `<div class="report-head"><div><h1>Cable loading plan — ${esc(state.name || 'Untitled')}</h1>
      <div>${esc((CARRIER_TYPES[c.type] || {}).label)}${c.name ? ' · ' + esc(c.name) : ''} · ${w.stacking === 'nested' ? 'nested' : 'square'} stacking · turn gap ${fmt(num(w.turnGap), 0)} mm</div>
      ${i.notes ? `<div class="muted">${esc(i.notes)}</div>` : ''}</div>
      <table>${rows.map(r => `<tr><td class="muted">${esc(r[0])}</td><td><b>${esc(r[1])}</b></td></tr>`).join('')}</table></div>`;
  }

  /* ================================================================== */
  /* Top bar actions                                                     */
  /* ================================================================== */
  $('projectName').addEventListener('input', e => { state.name = e.target.value; autosave(); renderReportHead(); });
  $('exampleSelect').addEventListener('change', e => {
    const k = e.target.value;
    e.target.value = '';
    if (!k) return;
    if (!confirm('Replace the current project with this example?')) return;
    state = normalise(EXAMPLES[k]());
    ui.zoom = 'all'; ui.view = 'section';
    update(); renderTab();
  });
  $('btnNew').addEventListener('click', () => {
    if (!confirm('Start a new empty project? Unsaved changes will be lost.')) return;
    state = normalise(emptyProject());
    ui.zoom = 'all'; ui.view = 'section'; ui.tab = 'carrier';
    update(); renderTab();
  });
  $('btnSave').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Object.assign({ app: 'CableLoadingPlanner', version: 1 }, state), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.name || 'cable-loading-plan').replace(/[^\w\-]+/g, '_') + '.cableplan.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('btnOpen').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { state = normalise(JSON.parse(rd.result)); ui.zoom = 'all'; update(); renderTab(); }
      catch (err) { alert('This file could not be read as a cable loading plan.'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  });
  $('btnPrint').addEventListener('click', () => window.print());

  update();
  renderTab();
})();
