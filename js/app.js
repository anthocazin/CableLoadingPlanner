/* Cable Loading Planner — user interface */
(function () {
  'use strict';
  const { compute, compartments, capacity, capacityMatrix, num, fmt, CARRIER_TYPES } = window.CLP;
  const STORE_KEY = 'cableLoadingPlanner.project.v1';
  const PALETTE = ['#1565c0', '#7cb9f2', '#0b2a55', '#2bb3a3', '#f2a541', '#8e6bd1', '#e05d5d', '#9bbf3b', '#4f86c6', '#c2185b', '#00838f', '#795548'];
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
      schema: 3, name: 'Export cable — 5 000 t turntable',
      info: Object.assign(info(), { client: 'Offshore Wind Farm', vessel: 'Cable Lay Vessel', reference: 'EXP-LOAD-001' }),
      carrier: { type: 'turntable', name: 'Main turntable', maxLoad: 5000, tare: 0, freeboard: 0.3, rings: defaultRings(), drum: defaultDrum() },
      winding: { stacking: 'square', turnGapPct: 5, layerGapPct: 0, startSide: 'outer' },
      cables: [{ id: 'c1', name: '220 kV export 3C 1200 mm²', od: 245, weight: 92, mbr: 4.0, maxLayers: 0, color: '#3b6ea5' }],
      sections: [
        { id: uid(), name: 'Export section 1', cableId: 'c1', length: 18000, compartment: 0, color: PALETTE[0] },
        { id: uid(), name: 'Export section 2', cableId: 'c1', length: 16500, compartment: 0, color: PALETTE[1] },
        { id: uid(), name: 'Spare length', cableId: 'c1', length: 2000, compartment: 0, color: PALETTE[2] },
      ],
    }),
    tank: () => ({
      schema: 3, name: 'Inter-array cables — static tank',
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
      winding: { stacking: 'square', turnGapPct: 5, layerGapPct: 0, startSide: 'outer' },
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
      schema: 3, name: '33 kV cable — split drum',
      info: Object.assign(info(), { reference: 'DRUM-0425' }),
      carrier: { type: 'drum', name: 'Drum D-4600', maxLoad: 60, tare: 12, freeboard: 0.3, rings: defaultRings(),
        drum: { barrelDiameter: 2.8, flangeDiameter: 4.6, flangeThickness: 40, freeboard: 0.1, bays: [{ name: 'Bay A', width: 1.4 }, { name: 'Bay B', width: 1.4 }] } },
      winding: { stacking: 'square', turnGapPct: 0, layerGapPct: 0, startSide: 'left' },
      cables: [{ id: 'c1', name: '33 kV 3C 185 mm²', od: 110, weight: 18, mbr: 1.3, maxLayers: 0, color: '#1565c0' }],
      sections: [
        { id: uid(), name: 'Cable A', cableId: 'c1', length: 900, compartment: 0, color: PALETTE[0] },
        { id: uid(), name: 'Cable B', cableId: 'c1', length: 650, compartment: 1, color: PALETTE[1] },
      ],
    }),
  };
  const emptyProject = () => ({
    schema: 3, name: '', info: info(),
    carrier: { type: 'turntable', name: '', maxLoad: 0, tare: 0, freeboard: 0.3, rings: defaultRings(), drum: defaultDrum() },
    winding: { stacking: 'square', turnGapPct: 5, layerGapPct: 0, startSide: 'outer' },
    cables: [{ id: uid(), name: 'Cable 1', od: 150, weight: 40, mbr: 2, maxLayers: 0, color: PALETTE[1] }],
    sections: [],
  });

  function normalise(p) {
    const base = emptyProject();
    const schema = p ? (p.schema || 1) : 3; // 1: thickness mm, gaps mm · 2: thickness m, gaps mm · 3: thickness mm, gaps % OD
    p = Object.assign(base, p || {});
    p.schema = 3;
    p.info = Object.assign(info(), p.info || {});
    p.carrier = Object.assign(emptyProject().carrier, p.carrier || {});
    if (!Array.isArray(p.carrier.rings) || p.carrier.rings.length < 2) p.carrier.rings = defaultRings();
    p.carrier.drum = Object.assign(defaultDrum(), p.carrier.drum || {});
    if (!Array.isArray(p.carrier.drum.bays) || !p.carrier.drum.bays.length) p.carrier.drum.bays = defaultDrum().bays;
    if (schema === 2) {
      p.carrier.rings.forEach(r => { r.thickness = Math.round(num(r.thickness) * 1000 * 10) / 10; });
      p.carrier.drum.flangeThickness = Math.round(num(p.carrier.drum.flangeThickness) * 1000 * 10) / 10;
    }
    p.winding = Object.assign({ stacking: 'square', startSide: 'outer' }, p.winding || {});
    if (schema < 3 || p.winding.turnGapPct === undefined) applyStandard(p);
    p.cables = Array.isArray(p.cables) ? p.cables : [];
    p.sections = Array.isArray(p.sections) ? p.sections : [];
    p.cables.forEach(c => { if (!c.id) c.id = uid(); });
    p.sections.forEach((s, i) => { if (!s.id) s.id = uid(); if (!s.color) s.color = PALETTE[i % PALETTE.length]; });
    return p;
  }

  /* standard planning values: square stacking, 0 % between layers, 5 % OD between turns when coiling, 0 % on a drum */
  function applyStandard(p) {
    const coil = (CARRIER_TYPES[p.carrier.type] || CARRIER_TYPES.turntable).kind === 'coil';
    p.winding.stacking = 'square';
    p.winding.turnGapPct = coil ? 5 : 0;
    p.winding.layerGapPct = 0;
    delete p.winding.turnGap; delete p.winding.layerGap;
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
    turntable: '<svg width="34" height="22" viewBox="0 0 34 22"><ellipse cx="17" cy="16" rx="15" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 8v8M32 8v8" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="8" rx="15" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="8" rx="5" ry="1.5" fill="none" stroke="#1565c0" stroke-width="1.5"/><path d="M17 18v3M12 21h10" stroke="currentColor" stroke-width="1.5"/></svg>',
    tank: '<svg width="34" height="22" viewBox="0 0 34 22"><path d="M2 5v12M32 5v12" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="5" rx="15" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 17a15 3.5 0 0 0 30 0" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="17" cy="5" rx="8" ry="1.9" fill="none" stroke="#1565c0" stroke-width="1.3"/><ellipse cx="17" cy="5" rx="3.5" ry=".9" fill="none" stroke="#1565c0" stroke-width="1.3"/></svg>',
    drum: '<svg width="34" height="22" viewBox="0 0 34 22"><circle cx="11" cy="11" r="9.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="11" r="5" fill="none" stroke="#1565c0" stroke-width="1.5"/><circle cx="11" cy="11" r="1.5" fill="currentColor"/><path d="M11 1.5h12a9.5 9.5 0 0 1 0 19H11" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  };

  function field(label, path, value, opts) {
    opts = opts || {};
    const type = opts.type || 'number';
    const unit = opts.unit ? ` <span class="unit">(${opts.unit})</span>` : '';
    const attrs = `data-bind="${path}" data-type="${type === 'number' ? 'num' : 'text'}"${opts.rerender ? ' data-rerender="1"' : ''}`;

    const input = type === 'textarea'
      ? `<textarea ${attrs}>${esc(value)}</textarea>`
      : `<input type="${type === 'number' ? 'text' : type}" ${attrs} value="${esc(value)}"${type === 'number' ? ' inputmode="decimal" autocomplete="off"' : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}>`;
    return `<label class="f${opts.full ? ' full' : ''}">${esc(label)}${unit}${input}</label>`;
  }

  function renderCarrierTab() {
    const c = state.carrier;
    let h = '<div class="seg">' + Object.keys(CARRIER_TYPES).map(t =>
      `<button data-action="type" data-value="${t}" class="${c.type === t ? 'active' : ''}">${ICONS[t]}<span>${CARRIER_TYPES[t].label}</span></button>`).join('') + '</div>';
    h += '<div class="grid2">' + field('Carrier name / ID', 'carrier.name', c.name, { type: 'text', full: true, placeholder: 'e.g. Turntable 1' }) +
      field('Max. cable load (SWL)', 'carrier.maxLoad', c.maxLoad, { unit: 't' }) +
      field(kind() === 'coil' ? 'Empty weight (tare)' : 'Empty drum weight (tare)', 'carrier.tare', c.tare, { unit: 't' }) + '</div>';
    if (kind() === 'coil') {
      h += '<h3>Rings / cerces (from the core outwards)</h3>';
      h += '<table class="edit"><thead><tr><th>Name</th><th>Inner Ø (m)</th><th>Wall (mm)</th><th>Height (m)</th><th></th></tr></thead><tbody>';
      c.rings.forEach((r, i) => {
        h += `<tr><td><input data-bind="carrier.rings.${i}.name" data-type="text" value="${esc(r.name)}"></td>
          <td><input type="text" inputmode="decimal" autocomplete="off" data-bind="carrier.rings.${i}.diameter" data-type="num" data-rerender="sortRings" value="${esc(r.diameter)}"></td>
          <td><input type="text" inputmode="decimal" autocomplete="off" data-bind="carrier.rings.${i}.thickness" data-type="num" value="${esc(r.thickness)}"></td>
          <td><input type="text" inputmode="decimal" autocomplete="off" data-bind="carrier.rings.${i}.height" data-type="num" value="${esc(r.height)}"></td>
          <td><button class="icon-btn del" data-action="delRing" data-i="${i}" title="Remove ring" ${c.rings.length <= 2 ? 'disabled' : ''}>✕</button></td></tr>`;
      });
      h += '</tbody></table><button class="btn add" data-action="addRing">+ Add a ring / cerce (creates a compartment)</button>';
      h += '<div class="grid2" style="margin-top:10px">' + field('Freeboard', 'carrier.freeboard', c.freeboard, { unit: 'm' }) + '</div>';
      h += '<div class="hint"><b>Freeboard</b> = clearance kept between the top of the cable stack and the top of the walls. The cable is never coiled higher than <i>wall height − freeboard</i>: it keeps the top turns inside the walls (vessel motions, loading arm, crossovers).<br><br>Inner Ø = diameter of the cable-side face of the ring. Each space between two rings is a compartment: the first ring is the core, the last one the outer wall. Dimensions in metres, wall thickness in mm. Click a value on the drawing to type it, or drag a wall to resize.</div>';
    } else {
      const d = c.drum;
      h += '<h3>Drum geometry</h3><div class="grid2">' +
        field('Barrel (core) Ø', 'carrier.drum.barrelDiameter', d.barrelDiameter, { unit: 'm' }) +
        field('Flange Ø', 'carrier.drum.flangeDiameter', d.flangeDiameter, { unit: 'm' }) +
        field('Flange thickness', 'carrier.drum.flangeThickness', d.flangeThickness, { unit: 'mm' }) +
        field('Freeboard', 'carrier.drum.freeboard', d.freeboard, { unit: 'm' }) + '</div>';
      h += '<h3>Bays between flanges (from left to right)</h3>';
      h += '<table class="edit"><thead><tr><th>Name</th><th>Inner width (m)</th><th></th></tr></thead><tbody>';
      d.bays.forEach((b, i) => {
        h += `<tr><td><input data-bind="carrier.drum.bays.${i}.name" data-type="text" value="${esc(b.name)}"></td>
          <td><input type="text" inputmode="decimal" autocomplete="off" data-bind="carrier.drum.bays.${i}.width" data-type="num" value="${esc(b.width)}"></td>
          <td><button class="icon-btn del" data-action="delBay" data-i="${i}" title="Remove bay" ${d.bays.length <= 1 ? 'disabled' : ''}>✕</button></td></tr>`;
      });
      h += '</tbody></table><button class="btn add" data-action="addBay">+ Add a bay (adds an intermediate flange)</button>';
      h += '<div class="hint"><b>Freeboard</b> = clearance kept between the top cable layer and the rim of the flanges (radial distance). The cable is never wound above <i>flange radius − freeboard</i>: it protects the cable when the drum is handled, lifted or set down.<br><br>Inner width = clear distance between two flanges. Several bays = split drum with intermediate flanges; each bay is loaded independently. Dimensions in metres, flange thickness in mm. Click a value on the drawing to type it, or drag a flange / the barrel to resize.</div>';
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
          <label class="f full">Length <span class="unit">(m)</span><span class="len-wrap"><input type="text" inputmode="decimal" autocomplete="off" data-bind="sections.${i}.length" data-type="num" value="${esc(s.length)}"><button class="btn" data-action="fillMax" data-i="${i}" title="Set the length to the maximum this section can take">Max</button></span></label>
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
      <label class="f">Gap between turns <span class="unit">(% of OD)</span><input type="text" inputmode="decimal" autocomplete="off" data-bind="winding.turnGapPct" data-type="num" value="${esc(w.turnGapPct)}"><span class="gapmm" id="gapmm-turn"></span></label>
      <label class="f">Gap between layers <span class="unit">(% of OD)</span><input type="text" inputmode="decimal" autocomplete="off" data-bind="winding.layerGapPct" data-type="num" value="${esc(w.layerGapPct)}"><span class="gapmm" id="gapmm-layer"></span></label>
      <label class="f full">First layer starts at<select data-bind="winding.startSide" data-type="text">${side}</select></label>
    </div>
    ${standardBox()}
    <h3>Report information</h3><div class="grid2">
      ${field('Client / project', 'info.client', inf.client, { type: 'text' })}
      ${field('Vessel / site', 'info.vessel', inf.vessel, { type: 'text' })}
      ${field('Document reference', 'info.reference', inf.reference, { type: 'text' })}
      ${field('Prepared by', 'info.preparedBy', inf.preparedBy, { type: 'text' })}
      ${field('Date', 'info.date', inf.date, { type: 'date' })}
      ${field('Notes', 'info.notes', inf.notes, { type: 'textarea', full: true })}
    </div>`;
  }

  /* gap in % of OD → "(12 mm)" for the cable(s) of the project */
  function gapMm(pct) {
    const ods = [...new Set(state.cables.map(c => num(c.od)).filter(v => v > 0))];
    if (!ods.length) return '';
    const mm = ods.map(od => num(pct) / 100 * od);
    const lo = Math.min(...mm), hi = Math.max(...mm);
    const f = v => fmt(v, v < 10 && v > 0 ? 1 : 0);
    return `(${Math.abs(hi - lo) < 0.05 ? f(lo) : f(lo) + '–' + f(hi)} mm)`;
  }

  function standardBox() {
    const coil = kind() === 'coil';
    return `<div class="std"><div class="std-title">Standard planning values ${coil ? '— coiling' : '— drum winding'}</div>
      <table>
        <tr><td>Gap between layers</td><td><b>0 % OD</b></td><td>(0 mm) each layer rests directly on the layer below: layer pitch 1.0 × OD (square) or 0.866 × OD (nested, sin 60°).</td></tr>
        <tr><td>Gap between turns</td><td><b>${coil ? '5 % OD' : '0 % OD'}</b></td><td>${gapMm(coil ? 5 : 0)} ${coil ? 'allowance for coiling in a tank / on a turntable.' : 'tight, even winding with a level-wind.'}</td></tr>
        <tr><td>Stacking</td><td><b>Square</b></td><td>conservative basis; nested = theoretical maximum.</td></tr>
        <tr><td>Working capacity</td><td><b>≈ 80 %</b></td><td>of the theoretical capacity, to allow for imperfect winding.</td></tr>
      </table>
      <button class="btn small" data-action="std">Reset to standard values</button></div>`;
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
    const gt = $('gapmm-turn'), gl = $('gapmm-layer');
    if (gt) gt.textContent = gapMm(state.winding.turnGapPct);
    if (gl) gl.textContent = gapMm(state.winding.layerGapPct);
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
      const v = el.value.trim();
      return v === '' ? '' : num(v.replace(/\s/g, ''), 0); // accepts 0,5 and 0.5
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
  $('tabBody').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); }
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
        if (wasCoil !== (kind() === 'coil')) { state.winding.startSide = kind() === 'coil' ? 'outer' : 'left'; applyStandard(state); }
        ui.zoom = 'all'; ui.view = 'section';
        break;
      }
      case 'std': {
        applyStandard(state);
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
    if (num(state.carrier.tare) > 0) h += k(kind() === 'coil' ? 'Total (carrier + cable)' : 'Total drum weight', `${fmt(t.gross, 1)} t`);
    const sp = spare();
    h += k(sp.byWeight ? 'Spare (by SWL)' : 'Spare capacity', `${fmt(sp.len / 1000, 2)} km`);
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
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;
  let CW = 0, CH = 0, printing = false;
  let hit = { mode: null, items: [], chips: [], handles: [], view: null };
  let frozen = null; // drawing scale kept still while a wall is dragged
  const r2 = v => Math.round(v * 100) / 100;
  const tOf = r => Math.max(num(r.thickness) / 1000, 0);
  function addHandle(h) { if (!printing) hit.handles.push(h); }
  const STEEL = '#1d2229', STEEL_D = '#000000', DIM = '#5a7391', BARREL = '#8f99a6', INK = '#0b3a75', BLUE = '#1a6fd6', LIMIT = '#d64545';
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  function sectionColor(i) { const s = state.sections[i]; return (s && s.color) || PALETTE[i % PALETTE.length]; }
  function turnSection(cr, t) {
    let best = t.segs[0];
    t.segs.forEach(s => { if (s.length > best.length) best = s; });
    return cr.sectionIdx[best.item];
  }
  function ringsSorted() {
    return state.carrier.rings.map((r, i) => Object.assign({}, r, { _i: i })).sort((a, b) => num(a.diameter) - num(b.diameter));
  }

  function niceStep(span, target) {
    const raw = span / Math.max(1, target);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function makeView(world, W, H, pad) {
    if (frozen && !printing) world = frozen;
    const sx = (W - pad.l - pad.r) / (world.x1 - world.x0);
    const sy = (H - pad.t - pad.b) / (world.y1 - world.y0);
    const s = Math.min(sx, sy);
    const ox = pad.l + ((W - pad.l - pad.r) - s * (world.x1 - world.x0)) / 2;
    const oy = pad.t + ((H - pad.t - pad.b) - s * (world.y1 - world.y0)) / 2;
    return { s, world, X: x => ox + (x - world.x0) * s, Y: y => oy + (world.y1 - y) * s, invX: px => world.x0 + (px - ox) / s, invY: py => world.y1 - (py - oy) / s };
  }

  function drawAxes(v, xLabel, yLabel, opts) {
    opts = opts || {};
    const w = v.world;
    ctx.save();
    ctx.strokeStyle = '#c9d6e4'; ctx.fillStyle = '#5a7391'; ctx.lineWidth = 1;
    ctx.font = '11px ' + FONT;
    const xs = niceStep(w.x1 - w.x0, 10), ys = niceStep(w.y1 - w.y0, 7);
    const yb = v.Y(w.y0), xl = v.X(w.x0);
    if (!opts.noX) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(w.x0 / xs) * xs; x <= w.x1 + 1e-9; x += xs) {
        const px = v.X(x);
        ctx.beginPath(); ctx.moveTo(px, yb); ctx.lineTo(px, yb + 4); ctx.stroke();
        ctx.fillText(fmt(Math.abs(x) < 1e-9 ? 0 : x, xs < 0.1 ? 2 : xs < 1 ? 1 : 0), px, yb + 6);
      }
      ctx.textBaseline = 'bottom';
      ctx.fillText(xLabel, (v.X(w.x0) + v.X(w.x1)) / 2, CH - 2);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = Math.ceil(w.y0 / ys) * ys; y <= (opts.yMax !== undefined ? opts.yMax : w.y1) + 1e-9; y += ys) {
      const py = v.Y(y);
      ctx.beginPath(); ctx.moveTo(xl - 4, py); ctx.lineTo(xl, py); ctx.stroke();
      ctx.fillText(fmt(Math.abs(y) < 1e-9 ? 0 : y, ys < 0.1 ? 2 : ys < 1 ? 1 : 0), xl - 6, py);
    }
    ctx.save(); ctx.translate(12, (v.Y(w.y0) + v.Y(w.y1)) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(yLabel, 0, 0); ctx.restore();
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
    if (label && ui.labels) { ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = '10.5px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, v.X(x0) + 3, v.Y(y) - 2); }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* editable value on the drawing ("chip") */
  function chip(px, py, text, path, value, align) {
    ctx.save();
    ctx.font = '600 11px ' + FONT;
    const tw = ctx.measureText(text).width;
    const editable = !!path && !printing;
    const w = tw + 10 + (editable ? 13 : 0), h = 18;
    let x = align === 'left' ? px : align === 'right' ? px - w : px - w / 2;
    x = Math.max(2, Math.min(CW - w - 2, x));
    const y = Math.max(2, Math.min(CH - h - 2, py - h / 2));
    ctx.fillStyle = editable ? '#ffffff' : 'rgba(255,255,255,.85)';
    roundRect(x, y, w, h, 4); ctx.fill();
    if (editable) { ctx.strokeStyle = BLUE; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 5, y + h / 2 + 0.5);
    if (editable) { ctx.fillStyle = BLUE; ctx.font = '11px ' + FONT; ctx.fillText('✎', x + 7 + tw, y + h / 2 + 0.5); }
    ctx.restore();
    if (editable) hit.chips.push({ x, y, w, h, path, value });
  }

  function arrow(x, y, ang) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - 7 * Math.cos(ang - 0.35), y - 7 * Math.sin(ang - 0.35));
    ctx.lineTo(x - 7 * Math.cos(ang + 0.35), y - 7 * Math.sin(ang + 0.35));
    ctx.closePath(); ctx.fill();
  }
  function dimLine(x1, y1, x2, y2, ext) {
    ctx.save(); ctx.strokeStyle = DIM; ctx.fillStyle = DIM; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    arrow(x2, y2, a); arrow(x1, y1, a + Math.PI);
    if (ext) { // extension lines up to the object (ext = [y of object for x1, y for x2]) — horizontal dims only
      ctx.setLineDash([2, 3]); ctx.strokeStyle = '#9db0c5';
      ctx.beginPath(); ctx.moveTo(x1, y1 + 4); ctx.lineTo(x1, ext[0]); ctx.moveTo(x2, y2 + 4); ctx.lineTo(x2, ext[1]); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTurns(v, cr, mapXY) {
    cr.fill.turns.forEach(t => {
      const [x, y] = mapXY(t);
      const px = v.X(x), py = v.Y(y);
      const r = Math.max(0.45, t.d / 2 * v.s * 0.96);
      const si = turnSection(cr, t);
      ctx.fillStyle = sectionColor(si);
      ctx.globalAlpha = t.used < t.circ - 1e-6 ? 0.45 : 1;
      if (r < 1.6) ctx.fillRect(px - r, py - r, r * 2, r * 2);
      else { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); if (r > 4) { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = .6; ctx.stroke(); } }
      ctx.globalAlpha = 1;
      hit.items.push({ px, py, r: Math.max(r, 3), cr, t });
    });
  }

  function drawMarkers(list, maxX) {
    maxX = maxX || CW - 4;
    if (!ui.labels) return;
    ctx.save();
    ctx.font = '600 11px ' + FONT;
    const placed = [];
    list.forEach(m => {
      ctx.beginPath(); ctx.arc(m.px, m.py, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      const editable = m.path && !printing;
      const tw = ctx.measureText(m.text).width + 12 + (editable ? 13 : 0);
      let lx = m.px + 14;
      if (lx + tw > maxX) lx = m.px - 14 - tw;
      // first free slot above the point (more room there), then below
      const hits = y => placed.some(p => Math.abs(p.y - y) < 20 && lx < p.x + p.w + 4 && lx + tw + 4 > p.x);
      const cands = [];
      for (let k = 0; k < 10; k++) cands.push(m.py - 26 - k * 22);
      for (let k = 0; k < 4; k++) cands.push(m.py + 12 + k * 22);
      let ly = cands.find(y => y > 4 && y < CH - 22 && !hits(y));
      if (ly === undefined) ly = Math.max(4, m.py - 26);
      placed.push({ x: lx, y: ly, w: tw });
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.px, m.py); ctx.lineTo(lx < m.px ? lx + tw : lx, ly + 9); ctx.stroke();
      ctx.fillStyle = INK; roundRect(lx, ly, tw, 18, 4); ctx.fill();
      ctx.fillStyle = m.color; ctx.fillRect(lx + 4, ly + 5, 3, 8);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(m.text + (editable ? '  ✎' : ''), lx + 9, ly + 9.5);
      if (editable) hit.chips.push({ x: lx, y: ly, w: tw, h: 18, path: m.path, value: m.value });
    });
    ctx.restore();
  }

  function sectionEndMarkers(v, crs, mapXY, maxX) {
    const list = [];
    crs.forEach(cr => {
      cr.sectionIdx.forEach((si, j) => {
        const sr = result.sections[si];
        if (!sr || !sr.last || !(sr.placed > 0)) return;
        const [x, y] = mapXY({ across: sr.last.across, stack: sr.last.stack });
        list.push({ px: v.X(x), py: v.Y(y), text: `${shortName(si)} end · ${fmt(sr.placed, 0)} m`, color: sectionColor(si), path: `sections.${si}.length`, value: state.sections[si].length });
        if (j === 0 && sr.first) {
          const [x0, y0] = mapXY({ across: sr.first.across, stack: sr.first.stack });
          const px = v.X(x0), py = v.Y(y0), c = cr.comp, coil = c.kind === 'coil';
          const sideName = coil ? (state.winding.startSide === 'outer' ? 'outer wall' : 'core side') : (state.winding.startSide === 'right' ? 'right flange' : 'left flange');
          list.push({ px, py, text: `${shortName(si)} start ⇄`, color: sectionColor(si) });
          // drag the start point to the other side → loading starts from the inside or the outside
          addHandle({ priority: true, cursor: 'grab', label: `start point (now: ${sideName}) — drop it on the other side to load from there`,
            test: (mx, my) => Math.hypot(mx - px, my - py) <= 10,
            start: () => ({}),
            move: (mx) => {
              const x = coil ? Math.abs(v.invX(mx)) : v.invX(mx);
              const nearMin = x < (c.acrossMin + c.acrossMax) / 2;
              state.winding.startSide = coil ? (nearMin ? 'inner' : 'outer') : (nearMin ? 'left' : 'right');
            } });
        }
      });
    });
    drawMarkers(list, maxX);
  }
  function shortName(si) { const s = state.sections[si]; const n = (s && s.name) || 'S' + (si + 1); return n.length > 22 ? n.slice(0, 21) + '…' : n; }

  function selectedComps() {
    return ui.zoom === 'all' ? result.compartments : [result.compartments[parseInt(ui.zoom, 10)]].filter(Boolean);
  }

  /* ---- turntable / tank: vertical section through the axis ---- */
  function drawCoilSection(W, H) {
    const rings = ringsSorted();
    const crs = selectedComps();
    if (!crs.length || rings.length < 2) return noData('No compartment');
    const full = ui.zoom === 'all';
    const hMax = Math.max(...rings.map(r => num(r.height)), 0.1);
    const outer = rings[rings.length - 1];
    const Rout = num(outer.diameter) / 2 + num(outer.thickness) / 1000;
    let x0, x1, shown = rings;
    if (full) { x0 = -Rout; x1 = Rout; }
    else {
      const c = crs[0].comp;
      shown = [rings[c.innerRing], rings[c.outerRing]];
      x0 = num(shown[0].diameter) / 2; x1 = c.acrossMax + num(shown[1].thickness) / 1000;
    }
    const spanX = x1 - x0;
    const padB = full ? 26 + rings.length * 26 : 40;
    const world = { x0: x0 - spanX * 0.03, x1: x1 + spanX * 0.03, y0: -hMax * 0.03, y1: hMax * 1.02 };
    const v = makeView(world, W, H, { l: 46, r: 150, t: full ? 70 : 70, b: padB });
    drawAxes(v, 'Radius from centre (m)', 'Height above floor (m)', { noX: full, yMax: hMax });
    rect(v, world.x0, world.y0, world.x1, 0, '#dfe7f0');
    const sides = full ? [1, -1] : [1];
    if (full) { // centre line
      ctx.save(); ctx.setLineDash([10, 4, 2, 4]); ctx.strokeStyle = '#8aa1ba'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(v.X(0), v.Y(world.y0)); ctx.lineTo(v.X(0), v.Y(hMax) - 30); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#8aa1ba'; ctx.font = '600 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('CL', v.X(0), v.Y(hMax) - 32);
    }
    // walls (+ drag handles: wall → diameter, top of wall → height)
    shown.forEach(r => {
      const ri = num(r.diameter) / 2, ro = ri + tOf(r), h = num(r.height);
      const k = rings.indexOf(r);
      sides.forEach(sg => {
        rect(v, sg * ri, 0, sg * ro, h, STEEL, STEEL_D);
        const xa = v.X(sg * ri), xb = v.X(sg * ro), xl = Math.min(xa, xb) - 6, xr = Math.max(xa, xb) + 6, yt = v.Y(h), yb = v.Y(0);
        addHandle({ cursor: 'ns-resize', label: `${r.name} height`,
          test: (mx, my) => mx >= xl && mx <= xr && Math.abs(my - yt) <= 7,
          start: (mx, my) => ({ off: h - v.invY(my) }),
          move: (mx, my, st) => { state.carrier.rings[r._i].height = r2(Math.max(0.1, v.invY(my) + st.off)); } });
        addHandle({ cursor: 'ew-resize', label: `${r.name} diameter`,
          test: (mx, my) => mx >= xl && mx <= xr && my > yt + 7 && my <= yb,
          start: (mx) => ({ off: ri - Math.abs(v.invX(mx)) }),
          move: (mx, my, st) => {
            const lo = k > 0 ? num(rings[k - 1].diameter) / 2 + tOf(rings[k - 1]) + 0.05 : 0.05;
            const hi = k < rings.length - 1 ? num(rings[k + 1].diameter) / 2 - tOf(r) - 0.05 : 1e6;
            state.carrier.rings[r._i].diameter = r2(2 * Math.min(hi, Math.max(lo, Math.abs(v.invX(mx)) + st.off)));
          } });
      });
    });
    // compartments: limits and turns
    crs.forEach((cr, k) => {
      const c = cr.comp;
      if (!c.valid) { invalidNote(v.X((c.acrossMin + c.acrossMax) / 2), v.Y(c.wallHeight / 2), c.reason); return; }
      sides.forEach(sg => {
        dashed(v, sg * c.acrossMin, sg * c.acrossMax, c.stackMax, LIMIT, '');
        if (cr.fill.turns.length) dashed(v, sg * c.acrossMin, sg * c.acrossMax, cr.fill.top, INK, '');
        drawTurns(v, cr, t => [sg * t.across, t.stack]);
      });
      if (ui.labels) {
        const wpx = (c.acrossMax - c.acrossMin) * v.s;
        ctx.fillStyle = INK; ctx.font = '600 11.5px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const lx = v.X((full ? -1 : 1) * (c.acrossMin + c.acrossMax) / 2); // annotations on the left half, cable data on the right half
        ctx.fillText(wpx < 170 ? `C${c.index + 1} · ${fmt(cr.usedPct * 100, 0)} %` : `${c.label} · ${fmt(cr.usedPct * 100, 0)} % of height`, lx, v.Y(c.stackMax) + 4);
        if (cr.fill.turns.length && wpx > 150) { ctx.font = '10.5px ' + FONT; ctx.textBaseline = 'bottom'; ctx.fillText(`top of cable ${fmt(cr.fill.top, 2)} m`, full ? lx : lx, v.Y(cr.fill.top) - 3); }
      }
      // freeboard dimension (first compartment shown; on the left half in the full view)
      if (k === 0) {
        const wallH = c.wallHeight;
        const px = full ? v.X(-c.acrossMin) - 8 : v.X(c.acrossMax) - 8;
        if ((wallH - c.stackMax) * v.s > 10) dimLine(px, v.Y(wallH), px, v.Y(c.stackMax));
        chip(px - 6, (v.Y(wallH) + v.Y(c.stackMax)) / 2 + (full ? 0 : 14), `Freeboard ${fmt(num(state.carrier.freeboard), 2)} m`, 'carrier.freeboard', state.carrier.freeboard, 'right');
      }
    });
    // dimensions of the rings
    shown.forEach((r, k) => {
      const ri = num(r.diameter) / 2, ro = ri + Math.max(num(r.thickness) / 1000, 0), h = num(r.height);
      const pxR = v.X((ri + ro) / 2), pxL = v.X(-(ri + ro) / 2), top = v.Y(h);
      const pxA = full ? pxL : pxR; // annotation side
      chip(pxA, top - 12, `H ${fmt(h, 2)} m`, `carrier.rings.${r._i}.height`, r.height);
      if (ui.labels) { ctx.fillStyle = '#000'; ctx.font = '700 10.5px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(r.name || '', pxA, full ? top - 50 : top - 24); }
      if (full) {
        chip(pxL, top - 32, `t ${fmt(num(r.thickness), 0)} mm`, `carrier.rings.${r._i}.thickness`, r.thickness);
        const py = v.Y(world.y0) + 16 + k * 26;
        dimLine(v.X(-ri), py, v.X(ri), py, [v.Y(0), v.Y(0)]);
        chip(v.X(0), py, `Ø ${fmt(num(r.diameter), 2)} m  ${r.name || ''}`, `carrier.rings.${r._i}.diameter`, r.diameter);
      } else {
        chip(pxR, top - 42, `Ø ${fmt(num(r.diameter), 2)} m`, `carrier.rings.${r._i}.diameter`, r.diameter);
        chip(pxR, top - 62, `t ${fmt(num(r.thickness), 0)} mm`, `carrier.rings.${r._i}.thickness`, r.thickness);
      }
    });
    sectionEndMarkers(v, crs, t => [t.across, t.stack], v.X(Rout));
    sectionTops(v, crs, v.X(Rout + spanX * 0.03) + 6, top => `H ${fmt(top, 2)} m`, v.Y(world.y0) - 10);
    hit.view = v; hit.mode = 'circles';
  }

  /* top of each section: dashed line in its colour + label in the right margin */
  function sectionTops(v, crs, xLabel, fmtTop, yMax) {
    if (!ui.labels) return;
    const list = [];
    crs.forEach(cr => cr.sectionIdx.forEach(si => {
      const sr = result.sections[si];
      if (!sr || !(sr.placed > 0) || sr.top === null) return;
      list.push({ si, y: v.Y(sr.top), x0: v.X(cr.comp.acrossMin), top: sr.top, layer: sr.topLayer });
    }));
    list.sort((a, b) => a.y - b.y);
    let last = -1e9;
    list.forEach(it => { it.ly = Math.max(it.y, last + 21); last = it.ly; });
    // keep the labels above the floor: shift the whole stack up if needed
    const over = list.length ? list[list.length - 1].ly - (yMax || CH - 12) : 0;
    if (over > 0) list.forEach(it => { it.ly -= over; });
    ctx.save();
    list.forEach(it => {
      const col = sectionColor(it.si);
      ctx.setLineDash([5, 3]); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(it.x0, it.y); ctx.lineTo(xLabel - 4, it.y); ctx.lineTo(xLabel, it.ly); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 11px ' + FONT;
      const txt = `${shortName(it.si)} top · ${fmtTop(it.top)}`;
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = '#fff'; roundRect(xLabel, it.ly - 9, w, 18, 4); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(xLabel + 4, it.ly - 5, 3, 10);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, xLabel + 10, it.ly + 0.5);
    });
    ctx.restore();
  }

  /* ---- drum: section along the axis ---- */
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
    const y0 = Math.max(0, Rb - depth * 0.3);
    const world = { x0: x0 - (x1 - x0) * 0.03, x1: x1 + (x1 - x0) * 0.03, y0, y1: Rf };
    const v = makeView(world, W, H, { l: 46, r: 175, t: 34, b: 36 });
    drawAxes(v, 'Axial position from inner face of the first flange (m)', 'Radius from drum axis (m)');
    rect(v, -tFl, y0, totalW + tFl, Rb, BARREL, STEEL_D); // barrel
    rect(v, -tFl, y0, 0, Rf, STEEL, STEEL_D);
    all.forEach(cr => rect(v, cr.comp.acrossMax, y0, cr.comp.acrossMax + tFl, Rf, STEEL, STEEL_D));
    // drag handles: flange top → flange Ø, barrel surface → barrel Ø, flange body → width of the bay on its left
    const flanges = [[-tFl, 0, null]].concat(all.map(cr => [cr.comp.acrossMax, cr.comp.acrossMax + tFl, cr.comp]));
    flanges.forEach(([fa, fb, comp]) => {
      const xl = v.X(fa) - 6, xr = v.X(fb) + 6, yt = v.Y(Rf);
      addHandle({ cursor: 'ns-resize', label: 'Flange Ø',
        test: (mx, my) => mx >= xl && mx <= xr && Math.abs(my - yt) <= 7,
        start: (mx, my) => ({ off: Rf - v.invY(my) }),
        move: (mx, my, st) => { d.flangeDiameter = r2(2 * Math.max(Rb + 0.05, v.invY(my) + st.off)); } });
      if (comp) addHandle({ cursor: 'ew-resize', label: `${comp.name} width`,
        test: (mx, my) => mx >= xl && mx <= xr && my > yt + 7 && my <= v.Y(y0),
        start: (mx) => ({ off: comp.acrossMax - v.invX(mx) }),
        move: (mx, my, st) => { d.bays[comp.index].width = r2(Math.max(0.05, v.invX(mx) + st.off - comp.acrossMin)); } });
    });
    all.forEach(cr => {
      const xl = v.X(cr.comp.acrossMin), xr = v.X(cr.comp.acrossMax), yb = v.Y(Rb);
      addHandle({ cursor: 'ns-resize', label: 'Barrel Ø',
        test: (mx, my) => mx > xl + 6 && mx < xr - 6 && Math.abs(my - yb) <= 6,
        start: (mx, my) => ({ off: Rb - v.invY(my) }),
        move: (mx, my, st) => { d.barrelDiameter = r2(2 * Math.min(Rf - 0.05, Math.max(0.05, v.invY(my) + st.off))); } });
    });
    crs.forEach((cr, k) => {
      const c = cr.comp;
      if (!c.valid) { invalidNote(v.X((c.acrossMin + c.acrossMax) / 2), v.Y((Rb + Rf) / 2), c.reason); return; }
      dashed(v, c.acrossMin, c.acrossMax, c.stackMax, LIMIT, '');
      drawTurns(v, cr, t => [t.across, t.stack]);
      if (ui.labels) { ctx.fillStyle = INK; ctx.font = '600 11.5px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(`${c.name} · ${cr.fill.layers} layers`, v.X((c.acrossMin + c.acrossMax) / 2), v.Y(Rf) - 4); }
      // bay width
      const py = v.Y(Rb) + (v.Y(y0) - v.Y(Rb)) * 0.33;
      dimLine(v.X(c.acrossMin), py, v.X(c.acrossMax), py);
      chip(v.X((c.acrossMin + c.acrossMax) / 2), py, `W ${fmt(c.acrossMax - c.acrossMin, 2)} m`, `carrier.drum.bays.${c.index}.width`, d.bays[c.index].width);
      if (k === 0) chip(v.X(c.acrossMax) - 4, v.Y(c.stackMax) - 11, `Freeboard ${fmt(num(d.freeboard), 2)} m`, 'carrier.drum.freeboard', d.freeboard, 'right');
    });
    const c0 = crs[0].comp, cN = crs[crs.length - 1].comp;
    chip(v.X(c0.acrossMin - tFl / 2), v.Y(Rf) - 22, `Ø flange ${fmt(Rf * 2, 2)} m`, 'carrier.drum.flangeDiameter', d.flangeDiameter, 'left');
    chip(v.X(cN.acrossMax + tFl / 2), v.Y(Rf) - 22, `t ${fmt(num(d.flangeThickness), 0)} mm`, 'carrier.drum.flangeThickness', d.flangeThickness, 'right');
    chip(v.X((c0.acrossMin + cN.acrossMax) / 2), v.Y(Rb) + (v.Y(y0) - v.Y(Rb)) * 0.75, `Ø barrel ${fmt(Rb * 2, 2)} m`, 'carrier.drum.barrelDiameter', d.barrelDiameter);
    sectionEndMarkers(v, crs, t => [t.across, t.stack], v.X(x1));
    sectionTops(v, crs, v.X(x1 + (x1 - x0) * 0.03) + 8, top => `R ${fmt(top, 2)} m`, v.Y(y0) - 10);
    hit.view = v; hit.mode = 'circles';
  }

  /* ---- turntable / tank: plan view of the top layers ---- */
  function drawCoilPlan(W, H) {
    const rings = ringsSorted();
    const crs = selectedComps();
    const outer = rings[rings.length - 1];
    const Rmax = num(outer.diameter) / 2 + num(outer.thickness) / 1000;
    const world = { x0: -Rmax * 1.05, x1: Rmax * 1.05, y0: -Rmax * 1.05, y1: Rmax * 1.05 };
    const v = makeView(world, W, H, { l: 10, r: 10, t: 24, b: 10 });
    const cx = v.X(0), cy = v.Y(0);
    ctx.beginPath(); ctx.arc(cx, cy, Rmax * v.s, 0, Math.PI * 2); ctx.fillStyle = '#eef3f8'; ctx.fill();
    crs.forEach(cr => {
      const turns = cr.fill.turns.slice().sort((a, b) => a.layer - b.layer);
      const nL = cr.fill.layers;
      turns.forEach(t => {
        if (t.layer < nL - 1) return;
        const rr = t.across * v.s;
        ctx.lineWidth = Math.max(1, t.d * v.s * 0.92);
        t.segs.forEach(sg => {
          ctx.strokeStyle = sectionColor(cr.sectionIdx[sg.item]);
          ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2 + sg.from * 2 * Math.PI, -Math.PI / 2 + sg.to * 2 * Math.PI); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        hit.items.push({ r0: t.across - t.d / 2, r1: t.across + t.d / 2, cr, t });
      });
    });
    rings.forEach(r => {
      const ri = num(r.diameter) / 2, ro = ri + Math.max(num(r.thickness) / 1000, 0.02);
      ctx.beginPath(); ctx.arc(cx, cy, (ri + ro) / 2 * v.s, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(3, (ro - ri) * v.s); ctx.strokeStyle = '#000'; ctx.stroke();
    });
    rings.forEach((r, k) => {
      const ri = num(r.diameter) / 2, rm = (ri + ri + tOf(r)) / 2;
      addHandle({ cursor: 'move', label: `${r.name} diameter`,
        test: (mx, my) => Math.abs(Math.hypot(mx - cx, my - cy) - rm * v.s) <= 6,
        start: (mx, my) => ({ off: ri - Math.hypot(mx - cx, my - cy) / v.s }),
        move: (mx, my, st) => {
          const lo = k > 0 ? num(rings[k - 1].diameter) / 2 + tOf(rings[k - 1]) + 0.05 : 0.05;
          const hi = k < rings.length - 1 ? num(rings[k + 1].diameter) / 2 - tOf(r) - 0.05 : 1e6;
          state.carrier.rings[r._i].diameter = r2(2 * Math.min(hi, Math.max(lo, Math.hypot(mx - cx, my - cy) / v.s + st.off)));
        } });
    });
    // diameters
    rings.forEach((r, k) => {
      const ri = num(r.diameter) / 2;
      chip(cx + ri * v.s * Math.cos(Math.PI / 4 + k * 0.12), cy + ri * v.s * Math.sin(-Math.PI / 4 - k * 0.12), `Ø ${fmt(ri * 2, 2)} m`, `carrier.rings.${r._i}.diameter`, r.diameter);
    });
    const list = [];
    crs.forEach(cr => cr.sectionIdx.forEach(si => {
      const sr = result.sections[si];
      if (!sr || !sr.last || !(sr.placed > 0) || sr.last.layer < cr.fill.layers - 1) return;
      const a = -Math.PI / 2 + sr.last.frac * 2 * Math.PI;
      list.push({ px: cx + Math.cos(a) * sr.last.across * v.s, py: cy + Math.sin(a) * sr.last.across * v.s, text: `${shortName(si)} end`, color: sectionColor(si), path: `sections.${si}.length`, value: state.sections[si].length });
    }));
    drawMarkers(list);
    if (ui.labels) {
      ctx.fillStyle = '#5a7391'; ctx.font = '11px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Top two layers seen from above. Turns start at 12 o\'clock and run clockwise.', 10, 6);
    }
    hit.view = v; hit.mode = 'radial'; hit.center = [cx, cy];
  }

  /* ---- drum: side view ---- */
  function drawDrumSide(W, H) {
    const d = state.carrier.drum;
    const cr = selectedComps()[0];
    if (!cr) return noData('No bay');
    const Rb = num(d.barrelDiameter) / 2, Rf = num(d.flangeDiameter) / 2;
    const world = { x0: -Rf * 1.06, x1: Rf * 1.06, y0: -Rf * 1.06, y1: Rf * 1.06 };
    const v = makeView(world, W, H, { l: 10, r: 290, t: 24, b: 10 });
    const cx = v.X(0), cy = v.Y(0);
    ctx.beginPath(); ctx.arc(cx, cy, Rf * v.s, 0, Math.PI * 2); ctx.fillStyle = '#e6edf5'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = STEEL_D; ctx.stroke();
    // ground line (drum standing on its flanges)
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - Rf * v.s * 1.05, cy + Rf * v.s); ctx.lineTo(cx + Rf * v.s * 1.05, cy + Rf * v.s); ctx.stroke();
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
    ctx.beginPath(); ctx.arc(cx, cy, Rb * v.s, 0, Math.PI * 2); ctx.fillStyle = BARREL; ctx.fill(); ctx.strokeStyle = STEEL_D; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, Rb * v.s * 0.12), 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = LIMIT; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, cr.comp.stackMax * v.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    addHandle({ cursor: 'move', label: 'Flange Ø', test: (mx, my) => Math.abs(Math.hypot(mx - cx, my - cy) - Rf * v.s) <= 6,
      start: (mx, my) => ({ off: Rf - Math.hypot(mx - cx, my - cy) / v.s }),
      move: (mx, my, st) => { d.flangeDiameter = r2(2 * Math.max(Rb + 0.05, Math.hypot(mx - cx, my - cy) / v.s + st.off)); } });
    addHandle({ cursor: 'move', label: 'Barrel Ø', test: (mx, my) => Math.abs(Math.hypot(mx - cx, my - cy) - Rb * v.s) <= 6,
      start: (mx, my) => ({ off: Rb - Math.hypot(mx - cx, my - cy) / v.s }),
      move: (mx, my, st) => { d.barrelDiameter = r2(2 * Math.min(Rf - 0.05, Math.max(0.05, Math.hypot(mx - cx, my - cy) / v.s + st.off))); } });
    chip(cx, cy - Rf * v.s - 0, `Ø flange ${fmt(Rf * 2, 2)} m`, 'carrier.drum.flangeDiameter', d.flangeDiameter);
    chip(cx, cy - Rb * v.s * 0.5, `Ø barrel ${fmt(Rb * 2, 2)} m`, 'carrier.drum.barrelDiameter', d.barrelDiameter);
    // top of each section: dashed circle + label (R from axis, H above ground with the drum on its flanges)
    if (ui.labels) {
      const tops = cr.sectionIdx.map(si => ({ si, sr: result.sections[si] })).filter(o => o.sr && o.sr.placed > 0 && o.sr.top !== null)
        .sort((a, b) => b.sr.top - a.sr.top);
      const lx = cx + Rf * v.s + 24;
      let ly = cy - (tops.length - 1) * 11;
      tops.forEach(o => {
        const col = sectionColor(o.si), rr = o.sr.top * v.s;
        ctx.save(); ctx.setLineDash([5, 3]); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + rr, cy); ctx.lineTo(lx - 6, ly); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(cx + rr, cy, 3.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
        ctx.font = '600 11px ' + FONT;
        const txt = `${shortName(o.si)} top · R ${fmt(o.sr.top, 2)} m · H ${fmt(Rf + o.sr.top, 2)} m`;
        const w = ctx.measureText(txt).width + 14;
        ctx.fillStyle = '#fff'; roundRect(lx, ly - 9, w, 18, 4); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = col; ctx.fillRect(lx + 4, ly - 5, 3, 10);
        ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, lx + 10, ly + 0.5);
        ly += 22;
      });
      ctx.fillStyle = '#5a7391'; ctx.font = '11px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${cr.comp.name}: one ring per layer. R = radius from the drum axis, H = height above ground (drum standing on its flanges). Red dashed = freeboard limit.`, 10, 6);
    }
    hit.view = v; hit.mode = 'radial'; hit.center = [cx, cy];
  }

  function invalidNote(px, py, msg) {
    ctx.save(); ctx.font = '600 11.5px ' + FONT;
    const lines = ('Invalid geometry: ' + (msg || '')).match(/.{1,46}(\s|$)/g) || [msg];
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * 16 + 10;
    const x = Math.max(4, Math.min(CW - w - 4, px - w / 2)), y = Math.max(4, py - h / 2);
    ctx.fillStyle = '#fdecea'; ctx.strokeStyle = LIMIT; roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b3261e'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l.trim(), x + 8, y + 6 + i * 16));
    ctx.restore();
  }

  function noData(msg) {
    ctx.fillStyle = '#5a7391'; ctx.font = '14px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(msg, CW / 2, CH / 2);
  }

  function drawView(W, H) {
    if (kind() === 'coil') (ui.view === 'plan' ? drawCoilPlan : drawCoilSection)(W, H);
    else (ui.view === 'side' ? drawDrumSide : drawDrumSection)(W, H);
  }

  function drawCanvas() {
    if (!result) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx = mainCtx; CW = W; CH = H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hit = { mode: null, items: [], chips: [], handles: [], view: null };
    drawView(W, H);
  }

  /* off-screen rendering for the report (PNG data URL) */
  function renderImage(view, zoom, W, H) {
    const c = document.createElement('canvas');
    const sc = 2.5;
    c.width = Math.round(W * sc); c.height = Math.round(H * sc);
    const saved = { ctx, CW, CH, hit, view: ui.view, zoom: ui.zoom, labels: ui.labels };
    ctx = c.getContext('2d'); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    CW = W; CH = H; printing = true; ui.view = view; ui.zoom = zoom; ui.labels = true;
    hit = { mode: null, items: [], chips: [], handles: [], view: null };
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    try { drawView(W, H); } finally {
      ctx = saved.ctx; CW = saved.CW; CH = saved.CH; hit = saved.hit; ui.view = saved.view; ui.zoom = saved.zoom; ui.labels = saved.labels; printing = false;
    }
    // trim empty white bands above and below the drawing
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height).data;
    const rowBlank = y => { for (let x = 0; x < c.width; x += 3) { const k = (y * c.width + x) * 4; if (img[k] < 245 || img[k + 1] < 245 || img[k + 2] < 245) return false; } return true; };
    let top = 0, bot = c.height - 1;
    while (top < bot && rowBlank(top)) top++;
    while (bot > top && rowBlank(bot)) bot--;
    const m = Math.round(8 * sc);
    top = Math.max(0, top - m); bot = Math.min(c.height - 1, bot + m);
    const out = document.createElement('canvas');
    out.width = c.width; out.height = bot - top + 1;
    out.getContext('2d').drawImage(c, 0, top, c.width, out.height, 0, 0, c.width, out.height);
    return out.toDataURL('image/png');
  }

  /* ---------------- tooltip & on-drawing editing ---------------- */
  const tip = $('tooltip');
  const wrap = $('canvasWrap');
  function chipAt(mx, my) { return hit.chips.slice().reverse().find(c => mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h); }

  function handleAt(mx, my) { return hit.handles.find(h => h.priority && h.test(mx, my)) || hit.handles.find(h => !h.priority && h.test(mx, my)); }
  let drag = null, dragMoved = false;
  const posOf = e => { const rc = canvas.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
  canvas.addEventListener('pointerdown', e => {
    const [mx, my] = posOf(e);
    if (chipAt(mx, my)) return;
    const h = handleAt(mx, my);
    if (!h) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drag = { h, st: h.start(mx, my) };
    if (h.cursor === 'grab') canvas.style.cursor = 'grabbing';
    dragMoved = false;
    frozen = hit.view ? hit.view.world : null;
    tip.style.display = 'none';
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const [mx, my] = posOf(e);
    drag.h.move(mx, my, drag.st);
    dragMoved = true;
    scheduleUpdate();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null; frozen = null;
    update(); renderTab();
    setTimeout(() => { dragMoved = false; }, 0);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('mousemove', e => {
    if (drag) return;
    const rc = canvas.getBoundingClientRect();
    const mx = e.clientX - rc.left, my = e.clientY - rc.top;
    if (chipAt(mx, my)) { canvas.style.cursor = 'pointer'; tip.style.display = 'none'; return; }
    const hd = handleAt(mx, my);
    if (hd) { canvas.style.cursor = hd.cursor; tip.innerHTML = `Drag to change <b>${esc(hd.label)}</b>`; tip.style.display = 'block'; tip.style.left = Math.min(mx + 14, rc.width - 200) + 'px'; tip.style.top = (my + 14) + 'px'; return; }
    canvas.style.cursor = 'crosshair';
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

  canvas.addEventListener('click', e => {
    if (dragMoved) return;
    const rc = canvas.getBoundingClientRect();
    const c = chipAt(e.clientX - rc.left, e.clientY - rc.top);
    if (!c) return;
    tip.style.display = 'none';
    openEditor(c);
  });

  function openEditor(c) {
    const old = wrap.querySelector('.dim-editor');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'dim-editor';
    box.innerHTML = `<input type="text" inputmode="decimal" autocomplete="off" value="${esc(c.value)}"><span>${/thickness/i.test(c.path) ? 'mm' : 'm'}</span>`;
    const w = Math.max(c.w + 30, 120);
    box.style.left = Math.max(2, Math.min(wrap.clientWidth - w - 2, c.x + c.w / 2 - w / 2)) + 'px';
    box.style.top = Math.max(2, c.y - 4) + 'px';
    box.style.width = w + 'px';
    wrap.appendChild(box);
    const inp = box.querySelector('input');
    inp.focus(); inp.select();
    let done = false;
    const commit = ok => {
      if (done) return; done = true;
      const val = inp.value;
      box.remove();
      if (!ok || val === '' || !Number.isFinite(num(val, NaN))) return;
      setPath(state, c.path, num(val));
      if (/rings\.\d+\.diameter/.test(c.path)) state.carrier.rings.sort((a, b) => num(a.diameter) - num(b.diameter));
      update(); renderTab();
    };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') commit(true); else if (ev.key === 'Escape') commit(false); });
    inp.addEventListener('blur', () => commit(true));
  }

  function turnTip(cr, t) {
    const c = cr.comp;
    const nT = cr.fill.turnsPerLayer[t.layer];
    let h = '';
    t.segs.forEach(sg => {
      const si = cr.sectionIdx[sg.item];
      const s = state.sections[si];
      const cab = s && cableById(s.cableId);
      h += `<div><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${esc(sectionColor(si))};margin-right:5px"></span><b>${esc(s ? s.name : '')}</b> <span style="opacity:.75">${esc(cab ? cab.name : '')}</span><br>Section KP ${fmt(sg.kp, 0)} → ${fmt(sg.kp + sg.length, 0)} m</div>`;
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
  window.addEventListener('beforeprint', () => buildReport());

  /* ---------------- legend & gauges ---------------- */
  function renderLegend() {
    let h = state.sections.map((s, i) => `<span><i style="background:${esc(sectionColor(i))}"></i>${esc(s.name)}</span>`).join('');
    h += kind() === 'coil' ? `<span><i style="background:${STEEL}"></i>Rings / walls</span>` : `<span><i style="background:${STEEL}"></i>Flanges</span><span><i style="background:${BARREL}"></i>Barrel</span>`;
    h += '<span><i style="background:repeating-linear-gradient(90deg,#1565c0 0 4px,transparent 4px 7px);height:3px"></i>Top of each section</span>';
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

  /* height of the top of a section: above the floor (tank / turntable) or radius + height above ground (drum on its flanges) */
  function topText(sr) {
    if (!sr || sr.top === null || sr.top === undefined || !(sr.placed > 0)) return '–';
    if (kind() === 'coil') return `H ${fmt(sr.top, 2)} m<br><span class="muted mut">layer ${sr.topLayer}</span>`;
    const Rf = num(state.carrier.drum.flangeDiameter) / 2;
    return `R ${fmt(sr.top, 2)} m<br><span class="muted mut">H ${fmt(Rf + sr.top, 2)} m above ground</span>`;
  }

  function renderSectionsTable() {
    if (!state.sections.length) { $('sectionsTable').innerHTML = '<p class="muted">No section in the loading plan.</p>'; return; }
    let h = `<table class="data"><thead><tr><th>#</th><th>Section</th><th>Cable</th><th>${kind() === 'coil' ? 'Compartment' : 'Bay'}</th><th class="r">Length (m)</th><th class="r">Loaded (m)</th><th class="r">Weight (t)</th><th class="r">Top of section</th><th>Inner end (start of loading)</th><th>Outer end (end of loading)</th><th class="r">Off-load</th><th>Status</th></tr></thead><tbody>`;
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
        <td>${cr ? esc(cr.comp.label) : '–'}</td><td class="r">${fmt(num(s.length), 0)}</td><td class="r">${fmt(sr.placed, 0)}</td><td class="r">${fmt(sr.weight, 1)}</td><td class="r">${topText(sr)}</td>
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
    h += `<tr><td><b>Total</b></td><td></td><td class="r">${state.sections.length}</td><td class="r"><b>${fmt(t.length, 0)}</b></td><td class="r"><b>${fmt(t.weight, 1)}</b>${num(state.carrier.tare) ? `<br><span class="muted">${kind() === 'coil' ? 'with carrier' : 'with drum'} <b>${fmt(t.gross, 1)}</b></span>` : ''}</td><td></td><td></td><td></td>${coil ? `<td class="r">${t.vcg === null ? '–' : fmt(t.vcg, 2) + ' m'}</td>` : ''}<td class="r"><b>${fmt(t.remaining, 0)} m</b></td></tr>`;
    h += '</tbody></table>';
    if (coil) h += '<p class="muted" style="font-size:11.5px;margin:6px 0 0">Cable VCG = vertical centre of gravity of the loaded cable above the tank / turntable floor (for stability calculations).</p>';
    $('compTable').innerHTML = h;
  }

  /* capacity of each cable alone: by volume, by weight (SWL), and the smaller of the two */
  function capRows() {
    const maxLoad = num(state.carrier.maxLoad);
    return capMatrix.map(row => {
      const vol = row.caps.reduce((a, b) => a + b, 0);
      const w = num(row.cable.weight);
      const bySwl = maxLoad > 0 && w > 0 ? maxLoad * 1000 / w : Infinity;
      const max = Math.min(vol, bySwl);
      return { row, vol, bySwl, max, working: Math.min(vol * 0.8, bySwl), byWeight: bySwl < vol, weightAtMax: max * w / 1000 };
    });
  }
  /* spare length still loadable: smaller of the room left (volume) and the SWL left (weight) */
  function spare() {
    const t = result.totals, maxLoad = num(state.carrier.maxLoad);
    const crs = result.compartments.filter(cr => cr.refCable);
    const ref = (crs.find(cr => cr.sectionIdx.length) || crs[0] || {}).refCable;
    const w = ref ? num(ref.weight) : 0;
    const byW = maxLoad > 0 && w > 0 ? Math.max(0, (maxLoad - t.weight) * 1000 / w) : Infinity;
    return { len: Math.min(t.remaining, byW), byWeight: byW < t.remaining };
  }

  function renderCapTable() {
    const maxLoad = num(state.carrier.maxLoad);
    let h = `<table class="data"><thead><tr><th>Cable</th>${result.compartments.map(cr => `<th class="r">${esc(cr.comp.label)}</th>`).join('')}<th class="r">By volume</th>${maxLoad ? '<th class="r">By weight (SWL)</th>' : ''}<th class="r">Max. loadable</th><th class="r">Weight</th><th class="r">Working (80 %)</th></tr></thead><tbody>`;
    capRows().forEach(c => {
      h += `<tr><td><b>${esc(c.row.cable.name)}</b><br><span class="muted">Ø ${fmt(num(c.row.cable.od), 0)} mm · ${fmt(num(c.row.cable.weight), 1)} kg/m</span></td>${c.row.caps.map(v => `<td class="r">${fmt(v, 0)} m</td>`).join('')}
        <td class="r">${fmt(c.vol, 0)} m</td>${maxLoad ? `<td class="r">${fmt(c.bySwl, 0)} m</td>` : ''}<td class="r"><b>${fmt(c.max, 0)} m</b><br><span class="muted">limited by ${c.byWeight ? 'weight' : 'volume'}</span></td><td class="r">${fmt(c.weightAtMax, 1)} t</td><td class="r">${fmt(c.working, 0)} m</td></tr>`;
    });
    h += '</tbody></table><p class="muted" style="font-size:11.5px;margin:6px 0 0">Max. loadable = the smaller of the volume capacity and the length allowed by the SWL. Working = 80 % of the volume capacity, never more than the SWL allows.</p>';
    $('capTable').innerHTML = h;
  }

  /* ================================================================== */
  /* A4 report                                                           */
  /* ================================================================== */
  function buildReport() {
    if (!result) return;
    const i = state.info, c = state.carrier, w = state.winding, t = result.totals;
    const coil = kind() === 'coil';
    const typeLabel = (CARRIER_TYPES[c.type] || {}).label || '';
    const statusTxt = { ok: 'Loading plan OK', warn: 'Loading plan to be checked', fail: 'Loading plan NOT OK' }[t.status];
    const order = { fail: 0, warn: 1, info: 2, ok: 3 };
    const checks = result.checks.slice().sort((a, b) => order[a.level] - order[b.level]);

    // drawings
    const W = 1000;
    const img1 = renderImage('section', 'all', W, coil ? 560 : 520);
    const img2 = [];
    if (coil) img2.push({ src: renderImage('plan', 'all', 520, 520), cap: 'Plan view — top two layers' });
    else result.compartments.slice(0, 3).forEach(cr => img2.push({ src: renderImage('side', String(cr.comp.index), 420, 420), cap: `Side view — ${cr.comp.name}` }));

    const kpi = (k, v, cls) => `<div class="rk ${cls || ''}"><div class="rk-k">${k}</div><div class="rk-v">${v}</div></div>`;
    let kpis = kpi('Cable loaded', `${fmt(t.length, 0)} m`) + kpi('Cable weight', `${fmt(t.weight, 1)} t`);
    if (num(c.tare) > 0) kpis += kpi(coil ? 'Total weight (carrier + cable)' : 'Total drum weight (drum + cable)', `${fmt(t.gross, 1)} t`, 'strong');
    if (t.loadPct !== null) kpis += kpi('Load vs SWL', `${fmt(t.loadPct * 100, 1)} %`, t.loadPct > 1 ? 'bad' : '');
    const sp = spare();
    kpis += kpi(sp.byWeight ? 'Spare capacity (by SWL)' : 'Spare capacity', `${fmt(sp.len, 0)} m`);
    if (t.vcg !== null) kpis += kpi('Cable VCG', `${fmt(t.vcg, 2)} m`);

    const info = [['Client / project', i.client], ['Vessel / site', i.vessel], ['Carrier', `${typeLabel}${c.name ? ' — ' + c.name : ''}`],
      ['Max. cable load (SWL)', num(c.maxLoad) ? fmt(num(c.maxLoad), 1) + ' t' : '–'], ['Empty weight (tare)', num(c.tare) ? fmt(num(c.tare), 1) + ' t' : '–'],
      ['Coiling / winding', `${w.stacking === 'nested' ? 'Nested' : 'Square'} stacking · turn gap ${fmt(num(w.turnGapPct), 1)} % OD ${gapMm(w.turnGapPct)} · layer gap ${fmt(num(w.layerGapPct), 1)} % OD ${gapMm(w.layerGapPct)}`]];

    // sections table (compact, portrait)
    let sec = `<table class="rt"><thead><tr><th>#</th><th>Section / cable</th><th>${coil ? 'Comp.' : 'Bay'}</th><th class="r">Loaded</th><th class="r">Weight</th><th class="r">Top</th><th>Inner end (start)</th><th>Outer end (end)</th><th class="r">Off</th><th>Status</th></tr></thead><tbody>`;
    result.sections.forEach((sr, k) => {
      const s = state.sections[k], cr = result.compartments[sr.compIndex], cab = sr.cable;
      let st = '<span class="rb ok">OK</span>';
      if (sr.placed === undefined || !cr) st = '<span class="rb bad">Error</span>';
      else if (sr.overflow > 0.01) st = `<span class="rb bad">Overflow ${fmt(sr.overflow, 0)} m</span>`;
      else if (cab && num(cab.mbr) > 0 && sr.minRadius < num(cab.mbr)) st = '<span class="rb bad">MBR</span>';
      const off = cr ? cr.sectionIdx.length - cr.sectionIdx.indexOf(k) : '';
      sec += `<tr><td>${k + 1}</td><td><span class="sw" style="background:${esc(sectionColor(k))}"></span><b>${esc(s.name)}</b><br><span class="mut">${esc(cab ? cab.name : '–')}${cab ? ` · Ø ${fmt(num(cab.od), 0)} mm` : ''}</span></td>
        <td>${cr ? esc(cr.comp.label.replace('Compartment ', 'C')) : '–'}</td><td class="r">${fmt(sr.placed, 0)} m${sr.requested && Math.abs(sr.requested - sr.placed) > 0.5 ? `<br><span class="mut">of ${fmt(sr.requested, 0)}</span>` : ''}</td><td class="r">${fmt(sr.weight, 1)} t</td><td class="r">${topText(sr)}</td>
        <td>${cr ? posText(cr, sr.first, false) : '–'}</td><td>${cr ? posText(cr, sr.last, true) : '–'}</td><td class="r">${off ? '#' + off : ''}</td><td>${st}</td></tr>`;
    });
    sec += '</tbody></table>';

    // compartments
    let comp = `<table class="rt"><thead><tr><th>${coil ? 'Compartment' : 'Bay'}</th><th>Geometry</th><th class="r">Loaded</th><th class="r">Weight</th><th class="r">Layers</th><th class="r">Turns / layer</th><th class="r">Stack used</th>${coil ? '<th class="r">VCG</th>' : ''}<th class="r">Spare</th></tr></thead><tbody>`;
    result.compartments.forEach(cr => {
      const cc = cr.comp;
      const geo = coil ? `R ${fmt(cc.acrossMin, 2)}–${fmt(cc.acrossMax, 2)} m · H ${fmt(cc.stackMax, 2)} m` : `W ${fmt(cc.acrossMax - cc.acrossMin, 2)} m · R ${fmt(cc.stackMin, 2)}–${fmt(cc.stackMax, 2)} m`;
      comp += `<tr><td><b>${esc(cc.label)}</b><br><span class="mut">${esc(cc.name)}</span></td><td>${geo}</td><td class="r">${fmt(cr.length, 0)} m</td><td class="r">${fmt(cr.weight, 1)} t</td><td class="r">${cr.fill.layers}</td><td class="r">${cr.turnsLayer1}</td>
        <td class="r">${fmt(cr.used, 2)} m · ${fmt(cr.usedPct * 100, 0)} %</td>${coil ? `<td class="r">${cr.vcg === null ? '–' : fmt(cr.vcg, 2) + ' m'}</td>` : ''}<td class="r">${cr.fill.full ? 'full' : fmt(cr.remaining, 0) + ' m'}</td></tr>`;
    });
    comp += `<tr class="tot"><td><b>Total</b></td><td></td><td class="r"><b>${fmt(t.length, 0)} m</b></td><td class="r"><b>${fmt(t.weight, 1)} t</b></td><td></td><td></td><td></td>${coil ? `<td class="r">${t.vcg === null ? '–' : fmt(t.vcg, 2) + ' m'}</td>` : ''}<td class="r"><b>${fmt(t.remaining, 0)} m</b></td></tr>`;
    if (num(c.tare) > 0) comp += `<tr class="tot"><td colspan="3"><b>${coil ? 'Total weight (carrier + cable)' : 'Total drum weight (drum + cable)'}</b></td><td class="r"><b>${fmt(t.gross, 1)} t</b></td><td colspan="${coil ? 5 : 4}" class="mut">tare ${fmt(num(c.tare), 1)} t + cable ${fmt(t.weight, 1)} t</td></tr>`;
    comp += '</tbody></table>';

    // geometry
    let geo;
    if (coil) {
      geo = '<table class="rt"><thead><tr><th>Ring / cerce</th><th class="r">Inner Ø</th><th class="r">Wall thickness</th><th class="r">Height</th></tr></thead><tbody>' +
        ringsSorted().map(r => `<tr><td>${esc(r.name)}</td><td class="r">${fmt(num(r.diameter), 2)} m</td><td class="r">${fmt(num(r.thickness), 0)} mm</td><td class="r">${fmt(num(r.height), 2)} m</td></tr>`).join('') +
        `<tr><td>Freeboard</td><td colspan="3" class="r">${fmt(num(c.freeboard), 2)} m</td></tr></tbody></table>`;
    } else {
      const d = c.drum;
      geo = `<table class="rt"><tbody><tr><td>Barrel Ø</td><td class="r">${fmt(num(d.barrelDiameter), 2)} m</td></tr><tr><td>Flange Ø</td><td class="r">${fmt(num(d.flangeDiameter), 2)} m</td></tr>
        <tr><td>Flange thickness</td><td class="r">${fmt(num(d.flangeThickness), 0)} mm</td></tr><tr><td>Freeboard</td><td class="r">${fmt(num(d.freeboard), 2)} m</td></tr>` +
        d.bays.map(b => `<tr><td>${esc(b.name)} — inner width</td><td class="r">${fmt(num(b.width), 2)} m</td></tr>`).join('') + '</tbody></table>';
    }
    const cabT = '<table class="rt"><thead><tr><th>Cable</th><th class="r">OD</th><th class="r">Weight</th><th class="r">MBR</th></tr></thead><tbody>' +
      state.cables.map(cb => `<tr><td>${esc(cb.name)}</td><td class="r">${fmt(num(cb.od), 0)} mm</td><td class="r">${fmt(num(cb.weight), 1)} kg/m</td><td class="r">${fmt(num(cb.mbr), 2)} m</td></tr>`).join('') + '</tbody></table>';

    const capT = `<table class="rt"><thead><tr><th>Cable</th>${result.compartments.map(cr => `<th class="r">${esc(cr.comp.label.replace('Compartment ', 'C'))}</th>`).join('')}<th class="r">By volume</th>${num(c.maxLoad) ? '<th class="r">By weight (SWL)</th>' : ''}<th class="r">Max. loadable</th><th class="r">Working 80 %</th></tr></thead><tbody>` +
      capRows().map(cp => `<tr><td>${esc(cp.row.cable.name)}</td>${cp.row.caps.map(v => `<td class="r">${fmt(v, 0)} m</td>`).join('')}<td class="r">${fmt(cp.vol, 0)} m</td>${num(c.maxLoad) ? `<td class="r">${fmt(cp.bySwl, 0)} m</td>` : ''}<td class="r"><b>${fmt(cp.max, 0)} m</b><br><span class="mut">by ${cp.byWeight ? 'weight' : 'volume'}</span></td><td class="r">${fmt(cp.working, 0)} m</td></tr>`).join('') +
      '</tbody></table><p class="mut small">Max. loadable = the smaller of the volume capacity and the length allowed by the SWL.</p>';

    const legend = state.sections.map((s, k) => `<span><i style="background:${esc(sectionColor(k))}"></i>${esc(s.name)}</span>`).join('');

    $('report').innerHTML = `<div class="rp">
      <header class="rp-head">
        <div class="rp-logo"><svg width="34" height="34" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#fff"/><circle cx="16" cy="16" r="10" fill="none" stroke="#1565c0" stroke-width="2.5"/><circle cx="16" cy="16" r="5.5" fill="none" stroke="#1565c0" stroke-width="2.5"/></svg></div>
        <div class="rp-title"><div class="rp-kicker">Cable loading plan</div><h1>${esc(state.name || 'Untitled project')}</h1></div>
        <table class="rp-meta"><tr><td>Reference</td><td>${esc(i.reference || '–')}</td></tr><tr><td>Date</td><td>${esc(i.date || '–')}</td></tr><tr><td>Prepared by</td><td>${esc(i.preparedBy || '–')}</td></tr></table>
      </header>
      <table class="rp-info rp-info-full">${info.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1] || '–')}</td></tr>`).join('')}</table>
      <section class="rp-kpis">${kpis}</section>
      <figure class="rp-fig"><img src="${img1}" alt=""><figcaption>Figure 1 — ${coil ? 'Cross-section through the centre (full diameter)' : 'Cross-section along the drum axis'}. Red dashed line = freeboard limit.</figcaption></figure>
      <div class="rp-legend">${legend}</div>
      <section class="rp-two">
        <div class="rp-figs">${img2.map((im, k) => `<figure class="rp-fig small"><img src="${im.src}" alt=""><figcaption>Figure ${k + 2} — ${esc(im.cap)}</figcaption></figure>`).join('')}</div>
        <div class="rp-gauges"><h2>Fill per ${coil ? 'compartment' : 'bay'}</h2>${$('gauges').innerHTML}</div>
      </section>
      <h2 class="rp-h">1. Cable sections — start and end positions</h2>${sec}
      <p class="mut small">Inner end = first end loaded (bottom of the coil / on the barrel). Outer end = last end loaded. "Off" = order in which the sections come off the ${coil ? 'compartment' : 'bay'}.</p>
      <h2 class="rp-h">2. ${coil ? 'Compartments' : 'Bays'}</h2>${comp}
      <div class="rp-cols"><div><h2 class="rp-h">3. Carrier geometry</h2>${geo}</div><div><h2 class="rp-h">4. Cables</h2>${cabT}</div></div>
      <h2 class="rp-h">5. Maximum capacity (each cable alone, empty carrier)</h2>${capT}
      <h2 class="rp-h">6. Assumptions and notes</h2>
      <ul class="rp-notes"><li>Turn-by-turn simulation, layers alternate direction; ${w.stacking === 'nested' ? 'nested stacking (layer pitch 0.866 × OD)' : 'square stacking (layer pitch 1.0 × OD)'}, turn gap ${fmt(num(w.turnGapPct), 1)} % of OD ${gapMm(w.turnGapPct)}, layer gap ${fmt(num(w.layerGapPct), 1)} % of OD ${gapMm(w.layerGapPct)}.</li>
        <li>Freeboard ${fmt(num(coil ? c.freeboard : c.drum.freeboard), 2)} m kept below the ${coil ? 'top of the walls' : 'flange rim'}. Working capacity taken as ≈ 80 % of the theoretical capacity.</li>
        <li>Planning aid only: check against the carrier drawings, the cable data sheets and the loading procedure.</li>${i.notes ? `<li>${esc(i.notes)}</li>` : ''}</ul>
      <h2 class="rp-h">7. Conclusion</h2>
      <div class="rp-status ${t.status}"><div class="rp-status-t">${statusTxt}</div>${checks.map(ch => `<div class="ln ${ch.level}">${esc(ch.text)}</div>`).join('')}</div>
      <table class="rp-sign"><tr><th></th><th>Name</th><th>Date</th><th>Signature</th></tr><tr><td>Prepared</td><td>${esc(i.preparedBy)}</td><td>${esc(i.date)}</td><td></td></tr><tr><td>Checked</td><td></td><td></td><td></td></tr><tr><td>Approved</td><td></td><td></td><td></td></tr></table>
    </div>`;
  }

  function ask(msg, onYes) {
    const box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML = `<div class="modal-card"><p>${esc(msg)}</p><div class="modal-btns"><button class="btn" data-no>Cancel</button><button class="btn primary" data-yes>${onYes ? 'Continue' : 'OK'}</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-no]').style.display = onYes ? '' : 'none';
    box.addEventListener('click', e => {
      if (e.target.closest('[data-yes]')) { box.remove(); if (onYes) onYes(); }
      else if (e.target.closest('[data-no]') || e.target === box) box.remove();
    });
    box.querySelector('[data-yes]').focus();
  }

  /* ================================================================== */
  /* Top bar actions                                                     */
  /* ================================================================== */
  $('projectName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  $('projectName').addEventListener('input', e => { state.name = e.target.value; autosave(); });
  $('exampleSelect').addEventListener('change', e => {
    const k = e.target.value;
    e.target.value = '';
    if (!k) return;
    ask('Replace the current project with this example?', () => {
      state = normalise(EXAMPLES[k]());
      ui.zoom = 'all'; ui.view = 'section';
      update(); renderTab();
    });
  });
  $('btnNew').addEventListener('click', () => {
    ask('Start a new empty project? Unsaved changes will be lost.', () => {
      state = normalise(emptyProject());
      ui.zoom = 'all'; ui.view = 'section'; ui.tab = 'carrier';
      update(); renderTab();
    });
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
      catch (err) { ask('This file could not be read as a cable loading plan.'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  });
  $('btnPrint').addEventListener('click', () => { buildReport(); window.print(); });

  update();
  renderTab();
})();
