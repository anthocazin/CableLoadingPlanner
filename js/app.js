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
  const info = () => ({ client: '', vessel: '', preparedBy: '', checkedBy: '', approvedBy: '', date: today(), reference: '', revision: '0', revDescription: 'Issued for use', notes: '', logos: [] });

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
    p.carrier.rings.forEach(r => { if (!r.id) r.id = uid(); });
    p.carrier.drum.bays.forEach(b => { if (!b.id) b.id = uid(); });
    if (!p.labels || typeof p.labels !== 'object') p.labels = {};
    if (!p.labelScale) p.labelScale = 1;
    if (!p.report || typeof p.report !== 'object') p.report = {};
    p.report = Object.assign({ order: [], blocks: {}, custom: [] }, p.report);
    if (p.winding.rotation !== 'ccw') p.winding.rotation = 'cw';
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

  let reportBuiltAt = 0;
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
    h += '<div class="grid2">' + field('Equipment', 'carrier.name', c.name, { type: 'text', full: true, placeholder: 'e.g. TT1002' }) +
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
    const rot = state.winding.rotation === 'ccw' ? 'ccw' : 'cw';
    const coil = kind() === 'coil';
    let h = `<div class="dirbox"><div class="dir-title">${coil ? 'Coiling direction (seen from above)' : 'Winding direction (seen from the start flange)'}</div>
      <div class="seg2"><button data-action="rot" data-value="cw" class="${rot === 'cw' ? 'active' : ''}">↻ Clockwise</button><button data-action="rot" data-value="ccw" class="${rot === 'ccw' ? 'active' : ''}">↺ Counter-clockwise</button></div>
      <div class="dir-note">Shown by an arrow on the ${coil ? 'plan view' : 'side view'} and in the report.</div></div>`;
    h += '<div class="hint"><b>Loading order:</b> the first section in the list is loaded first, so it ends up at the bottom of the coil (or on the barrel) and comes off last. Sections loaded in the same compartment follow each other turn after turn.</div>';
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
      <label class="f full">Rotation ${kind() === 'coil' ? '(seen from above)' : '(seen from the start flange)'}<select data-bind="winding.rotation" data-type="text">
        <option value="cw"${w.rotation !== 'ccw' ? ' selected' : ''}>Clockwise</option><option value="ccw"${w.rotation === 'ccw' ? ' selected' : ''}>Counter-clockwise</option></select></label>
    </div>
    ${standardBox()}
    <h3>Report information</h3><div class="grid2">
      ${field('Client / project', 'info.client', inf.client, { type: 'text' })}
      ${field('Vessel / site', 'info.vessel', inf.vessel, { type: 'text' })}
      ${field('Document No.', 'info.reference', inf.reference, { type: 'text' })}
      ${field('Revision', 'info.revision', inf.revision, { type: 'text' })}
      ${field('Date', 'info.date', inf.date, { type: 'date' })}
      ${field('Revision description', 'info.revDescription', inf.revDescription, { type: 'text' })}
      ${field('Prepared by', 'info.preparedBy', inf.preparedBy, { type: 'text' })}
      ${field('Checked by', 'info.checkedBy', inf.checkedBy, { type: 'text' })}
      ${field('Approved by', 'info.approvedBy', inf.approvedBy, { type: 'text' })}
      ${field('Notes', 'info.notes', inf.notes, { type: 'textarea', full: true })}
    </div>
    <h3>Logos (top left of the report)</h3>
    <div class="logos">${(inf.logos || []).map((l, k) => `<div class="logo-item"><img src="${l.src}" alt="${esc(l.name || 'logo')}">
      <div class="logo-ctrl"><button class="icon-btn" data-action="logoLeft" data-i="${k}" title="Move left" ${k === 0 ? 'disabled' : ''}>◀</button><button class="icon-btn" data-action="logoRight" data-i="${k}" title="Move right" ${k === inf.logos.length - 1 ? 'disabled' : ''}>▶</button><button class="icon-btn del" data-action="delLogo" data-i="${k}" title="Remove">✕</button></div></div>`).join('') || '<p class="muted" style="margin:0">No logo yet.</p>'}</div>
    <label class="btn add">+ Add logo(s) — PNG, JPG or SVG<input type="file" id="logoInput" accept="image/*" multiple hidden></label>`;
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
    const r = { carrier: renderCarrierTab, cables: renderCablesTab, plan: renderPlanTab, settings: renderSettingsTab, report: renderReportTab }[ui.tab];
    $('tabBody').innerHTML = r();
    document.body.classList.toggle('mode-report', ui.tab === 'report');
    if (ui.tab === 'report') { showReportEditor(); renderReportList(); } else hideReportEditor();
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
    if (el.id === 'logoInput') { addLogoFiles(el.files); el.value = ''; return; }
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
      case 'rot': state.winding.rotation = b.dataset.value; break;
      case 'rpText': state.report.custom = (state.report.custom || []).concat([{ id: 'txt-' + uid(), type: 'text' }]); break;
      case 'rpBreak': state.report.custom = (state.report.custom || []).concat([{ id: 'brk-' + uid(), type: 'break' }]); break;
      case 'rpPrint': printReport(); return;
      case 'rpReset':
        ask('Reset the report layout (order, sizes, hidden blocks, edited contents)? Your text blocks are kept.', () => {
          state.report.order = []; state.report.blocks = {}; refreshReport();
        });
        return;
      case 'delLogo': state.info.logos.splice(i, 1); break;
      case 'logoLeft': if (i > 0) state.info.logos.splice(i - 1, 0, state.info.logos.splice(i, 1)[0]); break;
      case 'logoRight': if (i < state.info.logos.length - 1) state.info.logos.splice(i + 1, 0, state.info.logos.splice(i, 1)[0]); break;
      case 'std': {
        applyStandard(state);
        break;
      }
      case 'addRing': {
        const last = c.rings[c.rings.length - 1];
        const prev = c.rings[c.rings.length - 2];
        const dNew = (num(prev.diameter) + num(last.diameter)) / 2;
        c.rings.splice(c.rings.length - 1, 0, { id: uid(), name: 'Cerce ' + (c.rings.length - 1), diameter: Math.round(dNew * 100) / 100, thickness: num(last.thickness) || 20, height: num(last.height) });
        break;
      }
      case 'delRing': c.rings.splice(i, 1); break;
      case 'addBay': c.drum.bays.push({ id: uid(), name: 'Bay ' + (c.drum.bays.length + 1), width: num(c.drum.bays[c.drum.bays.length - 1].width) || 1 }); break;
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

  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { ui.tab = b.dataset.tab; renderTab(); drawCanvas(); }));

  /* ================================================================== */
  /* Results                                                             */
  /* ================================================================== */
  function update() {
    reportBuiltAt = 0; // the project changed: the report must be rebuilt before printing
    ensureLogos();
    comps = compartments(state.carrier);
    const nComp = comps.length;
    state.sections.forEach(s => { if ((s.compartment | 0) >= nComp) s.compartment = Math.max(0, nComp - 1); });
    result = compute(state);
    capMatrix = capacityMatrix(state);
    $('projectName').value = state.name || '';
    $('labelSize').value = String(state.labelScale || 1);
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
    if (ui.tab === 'report' && !(document.activeElement && $('report').contains(document.activeElement))) { showReportEditor(); renderReportList(); }
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
      : [{ id: 'section', t: 'Cross-section' }, { id: 'side', t: 'Side view (start side)' }];
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
  $('labelSize').addEventListener('change', e => { state.labelScale = num(e.target.value, 1); autosave(); drawCanvas(); });

  /* ================================================================== */
  /* Canvas drawing                                                      */
  /* ================================================================== */
  const canvas = $('canvas');
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;
  let CW = 0, CH = 0, printing = false;
  let hit = { mode: null, items: [], labels: [], hidden: 0, handles: [], view: null };
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

  /* ---------- labels arranged by the user ----------
   * Each label has a stable id tied to what it describes (section id, ring id, bay id, field), so it stays
   * attached to the right element when the order or the dimensions change. Its position (offset from the
   * point it describes), its text and its visibility are stored per view in state.labels. */
  function viewKey() { return `${state.carrier.type}|${ui.view}|${ui.zoom}`; }
  function labCfg(id) { const v = state.labels && state.labels[viewKey()]; return (v && v[id]) || {}; }
  function setLabCfg(id, patch) {
    state.labels = state.labels || {};
    const k = viewKey();
    const v = state.labels[k] = state.labels[k] || {};
    const c = Object.assign({}, v[id] || {}, patch);
    Object.keys(c).forEach(key => { if (c[key] === undefined || c[key] === null || c[key] === '' || c[key] === false) delete c[key]; });
    if (Object.keys(c).length) v[id] = c; else delete v[id];
    if (!Object.keys(v).length) delete state.labels[k];
  }
  function stableId(path) {
    return path.replace(/^carrier\.rings\.(\d+)\./, (m, i) => `ring:${(state.carrier.rings[i] || {}).id}.`)
      .replace(/^carrier\.drum\.bays\.(\d+)\./, (m, i) => `bay:${(state.carrier.drum.bays[i] || {}).id}.`)
      .replace(/^sections\.(\d+)\./, (m, i) => `sec:${(state.sections[i] || {}).id}.`);
  }
  const secId = si => (state.sections[si] || {}).id;
  const VAL_RE = /-?\d[\d.,]*\s*(mm|m|t|%)?\s*$/;

  // L = { id, style: 'chip' | 'marker' | 'top' | 'text', ax, ay (point described), text, pos(w, h) → [x, y] default box,
  //       color, textColor, font, path / value (editable value), leader: 'always' | 'moved' }
  function label(L) {
    if (!ui.labels && L.style !== 'chip') return null;
    const cfg = labCfg(L.id);
    if (cfg.hidden) { hit.hidden += 1; return null; }
    let text = L.text;
    if (cfg.text) {
      const m = L.path ? (L.text.match(/-?\d[\d.,]*\s*(mm|m|t|%)/) || null) : null;
      text = cfg.text + (m ? ' · ' + m[0] : '');
    }
    const style = L.style;
    const editable = !!L.path && !printing;
    const sc = Math.max(0.5, Math.min(4, (num(state.labelScale, 1) || 1) * (cfg.scale || 1)));   // global × per-label size
    const scaleFont = f => f.replace(/([\d.]+)px/, (m, n) => (n * sc).toFixed(1) + 'px');
    ctx.save();
    ctx.font = scaleFont(L.font || ('600 11px ' + FONT));
    const tw = ctx.measureText(text).width;
    const padL = (style === 'marker' || style === 'top' ? 10 : style === 'text' ? 3 : 5) * sc;
    const w = tw + padL + 5 * sc + (editable ? 13 * sc : 0), h = (style === 'text' ? 16 : 18) * sc;
    let [x, y] = L.pos(w, h);
    const moved = cfg.dx !== undefined;
    if (moved) { x = L.ax + cfg.dx; y = L.ay + cfg.dy; }
    x = Math.max(2, Math.min(CW - w - 2, x)); y = Math.max(2, Math.min(CH - h - 2, y));
    // leader line to the element described
    if (L.leader === 'always' || moved) {
      const tx = Math.max(x, Math.min(x + w, L.ax)), ty = Math.max(y, Math.min(y + h, L.ay));
      if (Math.hypot(tx - L.ax, ty - L.ay) > 3) {
        const col = style === 'top' ? L.color : style === 'marker' ? INK : DIM;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = style === 'top' ? 1.4 : 1;
        if (style !== 'marker') ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(L.ax, L.ay); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        if (style !== 'marker') { ctx.beginPath(); ctx.arc(L.ax, L.ay, 2.5, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    if (style === 'marker') { ctx.fillStyle = INK; roundRect(x, y, w, h, 4); ctx.fill(); }
    else if (style === 'top') { ctx.fillStyle = '#fff'; roundRect(x, y, w, h, 4); ctx.fill(); ctx.strokeStyle = L.color; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (style === 'chip') { ctx.fillStyle = editable ? '#fff' : 'rgba(255,255,255,.85)'; roundRect(x, y, w, h, 4); ctx.fill(); if (editable) { ctx.strokeStyle = BLUE; ctx.lineWidth = 1.2; ctx.stroke(); } }
    else if (moved) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x, y, w, h); }
    if (style === 'marker' || style === 'top') { ctx.fillStyle = L.color; ctx.fillRect(x + 4 * sc, y + 5 * sc, 3 * sc, h - 10 * sc); }
    ctx.fillStyle = style === 'marker' ? '#fff' : (L.textColor || INK);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padL, y + h / 2 + 0.5);
    if (editable) { ctx.fillStyle = style === 'marker' ? '#9cc4f5' : BLUE; ctx.font = scaleFont('11px ' + FONT); ctx.fillText('✎', x + padL + tw + 3 * sc, y + h / 2 + 0.5); }
    ctx.restore();
    if (!printing) hit.labels.push({ id: L.id, x, y, w, h, ax: L.ax, ay: L.ay, path: L.path, value: L.value, text, defText: L.text, custom: !!cfg.text, valueLabel: !!L.path });
    return { x, y, w, h };
  }

  /* rotation seen from above (turntable / tank) or from the start flange (drum): clockwise = +1 */
  const rotSign = () => (state.winding.rotation === 'ccw' ? -1 : 1);
  function directionArrow(id, cx, cy, ra, text, outside) {
    if (labCfg(id).hidden) { hit.hidden += 1; return; }   // hiding the label removes the arrow too
    const sg = rotSign();
    ctx.save(); ctx.strokeStyle = BLUE; ctx.fillStyle = BLUE; ctx.lineWidth = 2.5;
    const a0 = -Math.PI / 2 + sg * 0.25, a1 = -Math.PI / 2 + sg * 1.35;
    ctx.beginPath(); ctx.arc(cx, cy, ra, a0, a1, sg < 0); ctx.stroke();
    arrow(cx + ra * Math.cos(a1), cy + ra * Math.sin(a1), a1 + sg * Math.PI / 2);
    ctx.restore();
    const txt = `${sg > 0 ? '↻' : '↺'} ${text} (${sg > 0 ? 'clockwise' : 'counter-clockwise'})`;
    if (outside) { // label just past the arrow head, outside the drawing
      const ex = cx + ra * Math.cos(a1), ey = cy + ra * Math.sin(a1);
      label({ id, style: 'text', ax: ex, ay: ey, text: txt, font: '600 11px ' + FONT, textColor: '#0b3a75', leader: 'moved',
        pos: (w, h) => [sg > 0 ? ex + 14 : ex - 14 - w, ey + 4] });
      return;
    }
    const tx = cx + ra * Math.cos(-Math.PI / 2 + sg * 0.8), ty = cy + ra * Math.sin(-Math.PI / 2 + sg * 0.8);
    textLabel(id, (cx + tx) / 2, (cy + ty) / 2 + 8, `${sg > 0 ? '↻' : '↺'} ${text} (${sg > 0 ? 'clockwise' : 'counter-clockwise'})`, '600 10.5px ' + FONT, '#0b3a75', 'bottom');
  }

  const showGeom = () => !printing && ui.tab === 'carrier';

  /* editable value on the drawing ("chip") */
  function chip(px, py, text, path, value, align) {
    // geometry (diameters, thickness, heights, widths, freeboard) is shown only while the "Type" tab is open — never in the report
    if (/^carrier\./.test(path) && !showGeom()) return;
    label({ id: 'v:' + stableId(path), style: 'chip', ax: px, ay: py, text, path, value, leader: 'moved',
      pos: (w, h) => [align === 'left' ? px : align === 'right' ? px - w : px - w / 2, py - h / 2] });
  }
  /* plain text on the drawing */
  function textLabel(id, ax, ay, text, font, color, baseline) {
    label({ id, style: 'text', ax, ay, text, font, textColor: color, leader: 'moved',
      pos: (w, h) => [ax - w / 2, baseline === 'top' ? ay : ay - h] });
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
      const left = lx + tw > maxX;
      if (left) lx = m.px - 14 - tw;
      // first free slot above the point (more room there), then below
      const hits = y => placed.some(p => Math.abs(p.y - y) < 20 && lx < p.x + p.w + 4 && lx + tw + 4 > p.x);
      const cands = [];
      for (let k = 0; k < 10; k++) cands.push(m.py - 26 - k * 22);
      for (let k = 0; k < 4; k++) cands.push(m.py + 12 + k * 22);
      let ly = cands.find(y => y > 4 && y < CH - 22 && !hits(y));
      if (ly === undefined) ly = Math.max(4, m.py - 26);
      const cfg = labCfg(m.id);
      if (cfg.dx === undefined && !cfg.hidden) placed.push({ x: lx, y: ly, w: tw });
      label({ id: m.id, style: 'marker', ax: m.px, ay: m.py, text: m.text, color: m.color, path: m.path, value: m.value, leader: 'always',
        pos: (w) => [left ? m.px - 14 - w : m.px + 14, ly] });
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
        list.push({ id: `end:${secId(si)}`, px: v.X(x), py: v.Y(y), text: `${shortName(si)} end · ${fmt(sr.placed, 0)} m`, color: sectionColor(si), path: `sections.${si}.length`, value: state.sections[si].length });
        if (j === 0 && sr.first) {
          const [x0, y0] = mapXY({ across: sr.first.across, stack: sr.first.stack });
          const px = v.X(x0), py = v.Y(y0), c = cr.comp, coil = c.kind === 'coil';
          const sideName = coil ? (state.winding.startSide === 'outer' ? 'outer wall' : 'core side') : (state.winding.startSide === 'right' ? 'right flange' : 'left flange');
          list.push({ id: `start:${secId(si)}`, px, py, text: `${shortName(si)} start ⇄`, color: sectionColor(si) });
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
    const padB = full ? (showGeom() ? 26 + rings.length * 26 : 30) : 40;
    const world = { x0: x0 - spanX * 0.03, x1: x1 + spanX * 0.03, y0: -hMax * 0.03, y1: hMax * 1.02 };
    const v = makeView(world, W, H, { l: 46, r: 150, t: showGeom() ? 70 : 34, b: padB });
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
        const lx = v.X((full ? -1 : 1) * (c.acrossMin + c.acrossMax) / 2); // annotations on the left half, cable data on the right half
        const cid = `comp:${(rings[c.innerRing] || {}).id}-${(rings[c.outerRing] || {}).id}`;
        textLabel(cid + ':fill', lx, v.Y(c.stackMax) + 4, wpx < 170 ? `C${c.index + 1} · ${fmt(cr.usedPct * 100, 0)} %` : `${c.label} · ${fmt(cr.usedPct * 100, 0)} % of height`, '600 11.5px ' + FONT, INK, 'top');
        if (cr.fill.turns.length && wpx > 150) textLabel(cid + ':top', lx, v.Y(cr.fill.top) - 3, `top of cable ${fmt(cr.fill.top, 2)} m`, '10.5px ' + FONT, INK, 'bottom');
      }
      // freeboard dimension (first compartment shown; on the left half in the full view)
      if (k === 0) {
        const wallH = c.wallHeight;
        const px = full ? v.X(-c.acrossMin) - 8 : v.X(c.acrossMax) - 8;
        if (showGeom() && (wallH - c.stackMax) * v.s > 10) dimLine(px, v.Y(wallH), px, v.Y(c.stackMax));
        chip(px - 6, (v.Y(wallH) + v.Y(c.stackMax)) / 2 + (full ? 0 : 14), `Freeboard ${fmt(num(state.carrier.freeboard), 2)} m`, 'carrier.freeboard', state.carrier.freeboard, 'right');
      }
    });
    // dimensions of the rings
    shown.forEach((r, k) => {
      const ri = num(r.diameter) / 2, ro = ri + Math.max(num(r.thickness) / 1000, 0), h = num(r.height);
      const pxR = v.X((ri + ro) / 2), pxL = v.X(-(ri + ro) / 2), top = v.Y(h);
      const pxA = full ? pxL : pxR; // annotation side
      chip(pxA, top - 12, `H ${fmt(h, 2)} m`, `carrier.rings.${r._i}.height`, r.height);
      textLabel(`ringname:${r.id}`, pxA, showGeom() ? (full ? top - 50 : top - 24) : top - 5, r.name || '', '700 10.5px ' + FONT, '#000', 'bottom');
      if (full) {
        chip(pxL, top - 32, `t ${fmt(num(r.thickness), 0)} mm`, `carrier.rings.${r._i}.thickness`, r.thickness);
        const py = v.Y(world.y0) + 16 + k * 26;
        if (showGeom()) dimLine(v.X(-ri), py, v.X(ri), py, [v.Y(0), v.Y(0)]);
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
    list.forEach(it => {
      const col = sectionColor(it.si);
      ctx.save(); ctx.setLineDash([5, 3]); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(it.x0, it.y); ctx.lineTo(xLabel - 6, it.y); ctx.stroke(); ctx.restore();
      label({ id: `top:${secId(it.si)}`, style: 'top', ax: xLabel - 6, ay: it.y, color: col, text: `${shortName(it.si)} top · ${fmtTop(it.top)}`, leader: 'always',
        pos: (w, h) => [xLabel, it.ly - h / 2] });
    });
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
      textLabel(`baytitle:${(d.bays[c.index] || {}).id}`, v.X((c.acrossMin + c.acrossMax) / 2), v.Y(Rf) - 4, `${c.name} · ${cr.fill.layers} layers`, '600 11.5px ' + FONT, INK, 'bottom');
      // bay width
      const py = v.Y(Rb) + (v.Y(y0) - v.Y(Rb)) * 0.33;
      if (showGeom()) dimLine(v.X(c.acrossMin), py, v.X(c.acrossMax), py);
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
          const rs = rotSign();
          ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2 + rs * sg.from * 2 * Math.PI, -Math.PI / 2 + rs * sg.to * 2 * Math.PI, rs < 0); ctx.stroke();
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
      const a = -Math.PI / 2 + rotSign() * sr.last.frac * 2 * Math.PI;
      list.push({ id: `end:${secId(si)}`, px: cx + Math.cos(a) * sr.last.across * v.s, py: cy + Math.sin(a) * sr.last.across * v.s, text: `${shortName(si)} end`, color: sectionColor(si), path: `sections.${si}.length`, value: state.sections[si].length });
    }));
    drawMarkers(list);
    const core = rings[0];
    directionArrow('rotdir', cx, cy, Rmax * v.s + 14, 'rotation / coiling', true);
    if (ui.labels) {
      ctx.fillStyle = '#5a7391'; ctx.font = '11px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`Top two layers seen from above. Turns start at 12 o'clock and run ${rotSign() > 0 ? 'clockwise' : 'counter-clockwise'}.`, 10, 6);
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
    const v = makeView(world, W, H, { l: 10, r: 290, t: 44, b: 10 });
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
        const a1 = a0 + rotSign() * share[si] / capL * 2 * Math.PI;
        ctx.strokeStyle = sectionColor(si);
        ctx.beginPath(); ctx.arc(cx, cy, r * v.s, a0, a1, rotSign() < 0); ctx.stroke();
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
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        const y0 = ly;
        label({ id: `top:${secId(o.si)}`, style: 'top', ax: cx + rr, ay: cy, color: col, leader: 'always',
          text: `${shortName(o.si)} top · R ${fmt(o.sr.top, 2)} m · H ${fmt(Rf + o.sr.top, 2)} m`, pos: (w, h) => [lx, y0 - h / 2] });
        ly += 22;
      });
    }
    // seen from the start side: where the cable starts and which way it is wound
    const side = state.winding.startSide === 'right' ? 'right' : 'left';
    const startList = [];
    cr.sectionIdx.forEach((si, j) => {
      const sr = result.sections[si];
      if (j !== 0 || !sr || !sr.first || !(sr.placed > 0)) return;
      const r = sr.first.stack;
      startList.push({ id: `start:${secId(si)}`, px: cx, py: cy - r * v.s, color: sectionColor(si),
        text: `${shortName(si)} start (inner end) · ${side} flange · R ${fmt(r, 2)} m · 12 o'clock` });
    });
    // winding direction arrow (seen from the start side) — hide its label to remove it
    directionArrow('winddir', cx, cy, Rb * v.s * 0.72, 'winding direction');
    drawMarkers(startList, cx + Rf * v.s);
    if (ui.labels) {
      ctx.save();
      ctx.fillStyle = INK; ctx.font = '700 12px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${cr.comp.name} — seen from the ${side.toUpperCase()} flange (start side)`, 10, 6);
      ctx.fillStyle = '#5a7391'; ctx.font = '11px ' + FONT;
      ctx.fillText(`1st turn at 12 o'clock against the ${side} flange, wound ${rotSign() > 0 ? 'clockwise' : 'counter-clockwise'}. R from the axis · H above ground · red dashed = freeboard.`, 10, 24);
      ctx.restore();
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
    hit = { mode: null, items: [], labels: [], hidden: 0, handles: [], view: null };
    drawView(W, H);
    const custom = state.labels && state.labels[viewKey()];
    $('labelTools').innerHTML = (hit.hidden ? `<button class="btn small" data-lt="show">Show hidden labels (${hit.hidden})</button>` : '') +
      (custom ? '<button class="btn small" data-lt="reset">Reset labels</button>' : '');
  }
  $('labelTools').addEventListener('click', e => {
    const b = e.target.closest('[data-lt]');
    if (!b) return;
    if (b.dataset.lt === 'show') showHiddenLabels(); else resetLabels();
    autosave(); drawCanvas();
  });

  /* off-screen rendering for the report (PNG data URL) */
  function renderImage(view, zoom, W, H) {
    const c = document.createElement('canvas');
    const sc = 2.5;
    c.width = Math.round(W * sc); c.height = Math.round(H * sc);
    const saved = { ctx, CW, CH, hit, view: ui.view, zoom: ui.zoom, labels: ui.labels };
    ctx = c.getContext('2d'); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    CW = W; CH = H; printing = true; ui.view = view; ui.zoom = zoom; ui.labels = true;
    hit = { mode: null, items: [], labels: [], hidden: 0, handles: [], view: null };
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
    return out; // a canvas: already drawn, so it always prints (an <img> may not be decoded in time)
  }

  /* ---------------- tooltip & on-drawing editing ---------------- */
  const tip = $('tooltip');
  const wrap = $('canvasWrap');
  function labelAt(mx, my) { return hit.labels.slice().reverse().find(c => mx >= c.x - 2 && mx <= c.x + c.w + 2 && my >= c.y - 2 && my <= c.y + c.h + 2); }

  function handleAt(mx, my) { return hit.handles.find(h => h.priority && h.test(mx, my)) || hit.handles.find(h => !h.priority && h.test(mx, my)); }
  let drag = null, dragMoved = false, ldrag = null, redrawPending = false;
  const posOf = e => { const rc = canvas.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
  const redraw = () => { if (redrawPending) return; redrawPending = true; requestAnimationFrame(() => { redrawPending = false; drawCanvas(); }); };

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    closeMenu();
    const [mx, my] = posOf(e);
    const lab = labelAt(mx, my);
    if (lab) { // move a label
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      ldrag = { lab, sx: mx, sy: my, moved: false };
      tip.style.display = 'none';
      return;
    }
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
    const [mx, my] = posOf(e);
    if (ldrag) {
      if (!ldrag.moved && Math.hypot(mx - ldrag.sx, my - ldrag.sy) < 4) return;
      ldrag.moved = true;
      canvas.style.cursor = 'grabbing';
      const L = ldrag.lab;
      setLabCfg(L.id, { dx: L.x + (mx - ldrag.sx) - L.ax, dy: L.y + (my - ldrag.sy) - L.ay });
      redraw();
      return;
    }
    if (!drag) return;
    drag.h.move(mx, my, drag.st);
    dragMoved = true;
    scheduleUpdate();
  });
  const endDrag = () => {
    if (ldrag) {
      const L = ldrag.lab, moved = ldrag.moved;
      ldrag = null;
      if (moved) { autosave(); drawCanvas(); }
      else if (L.path) openEditor(L);        // click on a value → edit the value
      else openRename(L);                     // click on a name → rename it
      return;
    }
    if (!drag) return;
    drag = null; frozen = null;
    update(); renderTab();
    setTimeout(() => { dragMoved = false; }, 0);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', e => {
    const [mx, my] = posOf(e);
    const lab = labelAt(mx, my);
    if (!lab) return;
    e.preventDefault();
    const cur = labCfg(lab.id).scale || 1;
    const nx = Math.max(0.6, Math.min(3, cur * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    setLabCfg(lab.id, { scale: Math.abs(nx - 1) < 0.04 ? undefined : nx });
    autosave(); redraw();
  }, { passive: false });

  canvas.addEventListener('dblclick', e => {
    const [mx, my] = posOf(e);
    const lab = labelAt(mx, my);
    if (lab) { e.preventDefault(); openRename(lab); }
  });

  /* right-click menu on a label */
  const menu = document.createElement('div');
  menu.className = 'lab-menu';
  wrap.appendChild(menu);
  function closeMenu() { menu.style.display = 'none'; }
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target) && e.target !== canvas) closeMenu(); });
  canvas.addEventListener('contextmenu', e => {
    const [mx, my] = posOf(e);
    const lab = labelAt(mx, my);
    e.preventDefault();
    tip.style.display = 'none';
    const cfg = lab ? labCfg(lab.id) : {};
    const items = [];
    if (lab) {
      if (lab.path) items.push(['value', 'Edit value…']);
      items.push(['rename', 'Rename…']);
      if (cfg.text) items.push(['name', 'Restore original name']);
      items.push(['big', 'Bigger  (or mouse wheel up)']);
      items.push(['small', 'Smaller  (or mouse wheel down)']);
      if (cfg.scale) items.push(['size', 'Default size']);
      if (lab.id === 'winddir' || lab.id === 'rotdir') items.push(['rev', 'Reverse the direction']);
      if (cfg.dx !== undefined) items.push(['pos', 'Put back in place']);
      items.push(['hide', 'Hide this label']);
    }
    const extra = [];
    if (hit.hidden) extra.push(['show', `Show hidden labels (${hit.hidden})`]);
    if (state.labels && state.labels[viewKey()]) extra.push(['reset', 'Reset all labels of this view']);
    if (items.length && extra.length) items.push(['-']);
    items.push(...extra);
    if (!items.length) { closeMenu(); return; }
    menu.innerHTML = items.map(it => it[0] === '-' ? '<hr>' : `<button data-a="${it[0]}">${esc(it[1])}</button>`).join('');
    menu.style.display = 'block';
    menu.style.left = Math.max(2, Math.min(mx, wrap.clientWidth - menu.offsetWidth - 4)) + 'px';
    menu.style.top = Math.max(2, Math.min(my, wrap.clientHeight - menu.offsetHeight - 4)) + 'px';
    menu.onclick = ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      closeMenu();
      const a = b.dataset.a;
      if (a === 'value') return openEditor(lab);
      if (a === 'rename') return openRename(lab);
      if (a === 'name') setLabCfg(lab.id, { text: undefined });
      else if (a === 'pos') setLabCfg(lab.id, { dx: undefined, dy: undefined });
      else if (a === 'big' || a === 'small') setLabCfg(lab.id, { scale: Math.max(0.6, Math.min(3, (cfg.scale || 1) * (a === 'big' ? 1.2 : 1 / 1.2))) });
      else if (a === 'size') setLabCfg(lab.id, { scale: undefined });
      else if (a === 'rev') { state.winding.rotation = state.winding.rotation === 'ccw' ? 'cw' : 'ccw'; if (ui.tab === 'settings') renderTab(); }
      else if (a === 'hide') setLabCfg(lab.id, { hidden: true });
      else if (a === 'show') showHiddenLabels();
      else if (a === 'reset') resetLabels();
      autosave(); drawCanvas();
    };
  });
  function showHiddenLabels() {
    const v = state.labels && state.labels[viewKey()];
    if (v) Object.keys(v).forEach(id => setLabCfg(id, { hidden: undefined }));
  }
  function resetLabels() { if (state.labels) delete state.labels[viewKey()]; }

  /* rename a label (empty = original name) */
  function openRename(L) {
    const old = wrap.querySelector('.dim-editor');
    if (old) old.remove();
    const cfg = labCfg(L.id);
    const valueRe = /\s*·?\s*-?\d[\d.,]*\s*(mm|m|t|%)\s*$/;
    const def = L.valueLabel ? L.defText.replace(valueRe, '') : L.defText;
    const box = document.createElement('div');
    box.className = 'dim-editor';
    box.innerHTML = `<input type="text" value="${esc(cfg.text || def)}" placeholder="${esc(def)}"><span>${L.valueLabel ? '+ value' : 'name'}</span>`;
    const w = Math.max(L.w + 60, 200);
    box.style.left = Math.max(2, Math.min(wrap.clientWidth - w - 2, L.x + L.w / 2 - w / 2)) + 'px';
    box.style.top = Math.max(2, L.y - 4) + 'px';
    box.style.width = w + 'px';
    wrap.appendChild(box);
    const inp = box.querySelector('input');
    inp.focus(); inp.select();
    let done = false;
    const commit = ok => {
      if (done) return; done = true;
      const val = inp.value.trim();
      box.remove();
      if (!ok) return;
      setLabCfg(L.id, { text: val && val !== def ? val : undefined });
      autosave(); drawCanvas();
    };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') commit(true); else if (ev.key === 'Escape') commit(false); });
    inp.addEventListener('blur', () => commit(true));
  }

  canvas.addEventListener('mousemove', e => {
    if (drag || ldrag) return;
    const rc = canvas.getBoundingClientRect();
    const mx = e.clientX - rc.left, my = e.clientY - rc.top;
    const lab = labelAt(mx, my);
    if (lab) {
      canvas.style.cursor = 'move';
      tip.innerHTML = `<b>Drag</b> to move · <b>click</b> to ${lab.path ? 'edit the value' : 'rename'} · <b>right-click</b>: rename, hide, reset`;
      tip.style.display = 'block'; tip.style.left = Math.min(mx + 14, rc.width - 270) + 'px'; tip.style.top = (my + 16) + 'px';
      return;
    }
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
  window.addEventListener('beforeprint', () => { if (Date.now() - reportBuiltAt > 2000) { hideReportEditor(); buildReport(); } });

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
  /* ---------- report logos ---------- */
  const logoCache = new Map();
  function ensureLogos() {
    (state.info.logos || []).forEach(l => {
      if (logoCache.has(l.src)) return;
      const im = new Image();
      im.onload = () => { reportBuiltAt = 0; };
      im.src = l.src;
      logoCache.set(l.src, im);
    });
  }
  function logoCanvas(l) {
    const im = l && logoCache.get(l.src);
    if (!im || !im.complete || !im.naturalWidth) return null;
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    cv.getContext('2d').drawImage(im, 0, 0);
    return cv;
  }
  function addLogoFiles(files) {
    [...files].filter(f => /^image\//.test(f.type)).forEach(f => {
      const rd = new FileReader();
      rd.onload = () => {
        const im = new Image();
        im.onload = () => {
          // keep the project light: logos are stored at most 600 × 200 px
          const k = Math.min(1, 600 / (im.naturalWidth || 600), 200 / (im.naturalHeight || 200));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round((im.naturalWidth || 600) * k)); cv.height = Math.max(1, Math.round((im.naturalHeight || 200) * k));
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          state.info.logos = (state.info.logos || []).concat([{ id: uid(), name: f.name, src: cv.toDataURL('image/png') }]);
          ensureLogos(); autosave(); reportBuiltAt = 0;
          if (ui.tab === 'settings') renderTab();
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
  }

  function buildReport(opts) {
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
    if (coil) img2.push({ src: renderImage('plan', 'all', 720, 520), cap: 'Plan view — top two layers' });
    else result.compartments.slice(0, 3).forEach(cr => img2.push({ src: renderImage('side', String(cr.comp.index), 420, 420), cap: `Side view from the ${state.winding.startSide === 'right' ? 'right' : 'left'} flange (start side) — ${cr.comp.name}` }));

    const kpi = (k, v, cls) => `<div class="rk ${cls || ''}"><div class="rk-k">${k}</div><div class="rk-v">${v}</div></div>`;
    let kpis = kpi('Cable loaded', `${fmt(t.length, 0)} m`) + kpi('Cable weight', `${fmt(t.weight, 1)} t`);
    if (num(c.tare) > 0) kpis += kpi(coil ? 'Total weight (carrier + cable)' : 'Total drum weight (drum + cable)', `${fmt(t.gross, 1)} t`, 'strong');
    if (t.loadPct !== null) kpis += kpi('Load vs SWL', `${fmt(t.loadPct * 100, 1)} %`, t.loadPct > 1 ? 'bad' : '');
    const sp = spare();
    kpis += kpi(sp.byWeight ? 'Spare capacity (by SWL)' : 'Spare capacity', `${fmt(sp.len, 0)} m`);
    if (t.vcg !== null) kpis += kpi('Cable VCG', `${fmt(t.vcg, 2)} m`);

    const info = [['Client / project', i.client], ['Vessel / site', i.vessel], ['Equipment', `${c.name ? c.name + ' — ' : ''}${typeLabel}`],
      ['Max. cable load (SWL)', num(c.maxLoad) ? fmt(num(c.maxLoad), 1) + ' t' : '–'], ['Empty weight (tare)', num(c.tare) ? fmt(num(c.tare), 1) + ' t' : '–'],
      ['Coiling / winding', `${w.stacking === 'nested' ? 'Nested' : 'Square'} stacking · turn gap ${fmt(num(w.turnGapPct), 1)} % OD ${gapMm(w.turnGapPct)} · layer gap ${fmt(num(w.layerGapPct), 1)} % OD ${gapMm(w.layerGapPct)}`]];

    // sections table (compact, portrait)
    let sec = `<table class="rt"><thead><tr><th>#</th><th>Section / cable</th><th>${coil ? 'Comp.' : 'Bay'}</th><th class="r">Loaded</th><th class="r">Weight</th><th class="r">Top</th><th>Inner end (start)</th><th>Outer end (end)</th><th class="r">Off</th><th>Status</th></tr></thead><tbody>`;
    result.sections.forEach((sr, k) => {
      const s = state.sections[k], cr = result.compartments[sr.compIndex], cab = sr.cable;
      let st = '<span class="rbadge ok">OK</span>';
      if (sr.placed === undefined || !cr) st = '<span class="rbadge bad">Error</span>';
      else if (sr.overflow > 0.01) st = `<span class="rbadge bad">Overflow ${fmt(sr.overflow, 0)} m</span>`;
      else if (cab && num(cab.mbr) > 0 && sr.minRadius < num(cab.mbr)) st = '<span class="rbadge bad">MBR</span>';
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

    const docNo = i.reference || '—', rev = i.revision || '0';
    const equipment = `${c.name ? c.name + ' — ' : ''}${typeLabel}`;
    const summary = `${fmt(t.length, 0)} m of cable (${fmt(t.weight, 1)} t) in ${state.sections.length} section${state.sections.length > 1 ? 's' : ''}, loaded in ${result.compartments.length} ${coil ? 'compartment' : 'bay'}${result.compartments.length > 1 ? 's' : ''}` +
      `${t.loadPct !== null ? `, i.e. ${fmt(t.loadPct * 100, 1)} % of the SWL` : ''}. Spare capacity: ${fmt(sp.len, 0)} m${sp.byWeight ? ' (limited by the SWL)' : ''}. Coiling ${w.rotation === 'ccw' ? 'counter-clockwise' : 'clockwise'}.`;
    const tb = (k, v) => `<td class="tb-k">${esc(k)}</td><td class="tb-v">${esc(v || '—')}</td>`;

    /* ---- the report is a list of blocks; the user arranges them in the Report tab ---- */
    const defs = [
      { id: 'head', name: 'Title block (logos, document No.)', html: `<header class="rp-top">
        <div class="rp-logos">${(i.logos || []).length ? (i.logos || []).map((l, k) => `<span class="rp-logo-c" data-logo="${k}"></span>`).join('') : '<span class="rp-nologo">Cable Loading Planner</span>'}</div>
        <div class="rp-ttl"><div class="rp-doc-type">Cable loading plan</div><h1>${esc(state.name || 'Untitled project')}</h1><div class="rp-sub">${esc(equipment)}${i.vessel ? ' · ' + esc(i.vessel) : ''}</div></div>
        <table class="rp-docbox"><tr><td>Document No.</td><td>${esc(docNo)}</td></tr><tr><td>Revision</td><td>${esc(rev)}</td></tr><tr><td>Date</td><td>${esc(i.date || '—')}</td></tr><tr><td>Status</td><td class="st ${t.status}">${t.status === 'ok' ? 'OK' : t.status === 'warn' ? 'TO CHECK' : 'NOT OK'}</td></tr></table></header>` },
      { id: 'ident', name: 'Identification table', table: true, html: `<table class="rp-tblock">
        <tr>${tb('Client / project', i.client)}${tb('Vessel / site', i.vessel)}</tr>
        <tr>${tb('Equipment', equipment)}${tb('Max. cable load (SWL)', num(c.maxLoad) ? fmt(num(c.maxLoad), 1) + ' t' : '')}</tr>
        <tr>${tb('Empty weight (tare)', num(c.tare) ? fmt(num(c.tare), 1) + ' t' : '')}${tb('Coiling / winding', `${w.stacking === 'nested' ? 'Nested' : 'Square'} · ${w.rotation === 'ccw' ? 'counter-clockwise' : 'clockwise'} · turn gap ${fmt(num(w.turnGapPct), 1)} % OD ${gapMm(w.turnGapPct)}`)}</tr>
        <tr>${tb('Prepared by', i.preparedBy)}${tb('Checked by', i.checkedBy)}</tr></table>` },
      { id: 'summary', name: 'Summary', title: 'Summary', html: `<p class="rp-lead">${esc(summary)}</p>` },
      { id: 'kpis', name: 'Key figures', html: `<section class="rp-kpis">${kpis}</section>` },
      { id: 'fig1', name: 'Figure — cross-section', title: 'Loading drawings', fig: [0], html: `<figure class="rp-fig"><div class="rp-canvas" data-fig="0"></div><figcaption><b>Figure 1</b> — ${coil ? 'Cross-section through the centre (full diameter)' : 'Cross-section along the drum axis'}. Red dashed line = maximum stack (freeboard limit).</figcaption></figure><div class="rp-legend">${legend}</div>` },
      { id: 'fig2', name: coil ? 'Figure — plan view' : 'Figure — side views', w: 48, fig: img2.map((im, k) => k + 1), html: `<div class="rp-figs">${img2.map((im, k) => `<figure class="rp-fig small"><div class="rp-canvas" data-fig="${k + 1}"></div><figcaption><b>Figure ${k + 2}</b> — ${esc(im.cap)}</figcaption></figure>`).join('')}</div>` },
      { id: 'gauges', name: 'Fill per compartment', w: 52, html: `<div class="rp-gauges"><h3>Fill per ${coil ? 'compartment' : 'bay'}</h3>${$('gauges').innerHTML}</div>` },
      { id: 'sections', name: 'Cable sections table', title: 'Cable sections — start and end positions', table: true, html: sec + `<p class="mut small">Inner end = first end loaded (bottom of the coil / on the barrel). Outer end = last end loaded. "Off" = order in which the sections come off the ${coil ? 'compartment' : 'bay'}. Top = highest point of the section.</p>` },
      { id: 'comp', name: coil ? 'Compartments table' : 'Bays table', title: coil ? 'Compartments' : 'Bays', table: true, html: comp },
      { id: 'geom', name: 'Equipment geometry', title: 'Equipment geometry', w: 50, table: true, html: geo },
      { id: 'cables', name: 'Cables', title: 'Cables', w: 50, table: true, html: cabT },
      { id: 'capacity', name: 'Maximum capacity', title: 'Maximum capacity (each cable alone, empty equipment)', table: true, html: capT },
      { id: 'notes', name: 'Assumptions and notes', title: 'Assumptions and notes', html: `<ul class="rp-notes"><li>Turn-by-turn simulation, layers alternate direction; ${w.stacking === 'nested' ? 'nested stacking (layer pitch 0.866 × OD)' : 'square stacking (layer pitch 1.0 × OD)'}, turn gap ${fmt(num(w.turnGapPct), 1)} % of OD ${gapMm(w.turnGapPct)}, layer gap ${fmt(num(w.layerGapPct), 1)} % of OD ${gapMm(w.layerGapPct)}; rotation ${w.rotation === 'ccw' ? 'counter-clockwise' : 'clockwise'} ${coil ? 'seen from above' : 'seen from the start flange'}.</li>
        <li>Freeboard ${fmt(num(coil ? c.freeboard : c.drum.freeboard), 2)} m kept below the ${coil ? 'top of the walls' : 'flange rim'}. Working capacity taken as ≈ 80 % of the theoretical capacity.</li>
        <li>Planning aid only: to be checked against the equipment drawings, the cable data sheets and the loading procedure.</li>${i.notes ? `<li>${esc(i.notes)}</li>` : ''}</ul>` },
      { id: 'conclusion', name: 'Conclusion', title: 'Conclusion', html: `<div class="rp-status ${t.status}"><div class="rp-status-t">${statusTxt}</div>${checks.map(ch => `<div class="ln ${ch.level}">${esc(ch.text)}</div>`).join('')}</div>` },
      { id: 'revision', name: 'Revision & signatures', table: true, html: `<table class="rp-rev">
        <thead><tr><th>Rev.</th><th>Date</th><th>Description</th><th>Prepared</th><th>Checked</th><th>Approved</th></tr></thead>
        <tbody><tr><td>${esc(rev)}</td><td>${esc(i.date || '')}</td><td>${esc(i.revDescription || 'Issued for use')}</td><td>${esc(i.preparedBy || '')}</td><td>${esc(i.checkedBy || '')}</td><td>${esc(i.approvedBy || '')}</td></tr>
        <tr class="sig"><td colspan="3">Signatures</td><td></td><td></td><td></td></tr></tbody></table>` },
    ];
    const blocks = reportBlocks(defs);
    const editor = !!(opts && opts.editor);
    let n = 0;
    const html = blocks.map(b => {
      const cfg = b.cfg;
      if (cfg.hidden && !editor) return '';
      if (b.type === 'break') return editor ? `<div class="rb rb-break${cfg.hidden ? ' rb-hidden' : ''}" data-id="${b.id}" style="width:100%">${tools(b, editor)}<div class="rb-break-line">Page break</div></div>` : '<div class="rb-pagebreak"></div>';
      const title = b.type === 'text' ? (cfg.title || '') : (cfg.title !== undefined ? cfg.title : (b.title || ''));
      const num_ = title && !cfg.hidden && cfg.numbered !== false ? `<span>${++n}.</span> ` : '';
      const h = title || editor && b.title !== undefined ? `<h2 class="rp-h"${title ? '' : ' data-empty="1"'}>${num_}<span class="rb-title"${editor ? ' contenteditable="true" spellcheck="false"' : ''} data-placeholder="Title">${esc(title)}</span></h2>` : '';
      const body = cfg.html !== undefined ? cfg.html : (b.type === 'text' ? '<p>Type your text here…</p>' : b.html);
      const editable = editor && (b.type === 'text' || cfg.editing);
      const style = `width:${cfg.w || b.w || 100}%;${cfg.fs ? `font-size:${cfg.fs * 100}%;` : ''}`;
      return `<div class="rb${cfg.hidden ? ' rb-hidden' : ''}${cfg.html !== undefined && b.type !== 'text' ? ' rb-frozen' : ''}" data-id="${b.id}" style="${style}">
        ${tools(b, editor)}${h}<div class="rb-body"${editable ? ' contenteditable="true"' : ''}>${body}</div>${editor ? '<span class="rb-resize" title="Drag to resize"></span>' : ''}</div>`;
    }).join('');
    const root = $('report');
    root.classList.toggle('editing', editor);
    root.innerHTML = `<div class="rp"><div class="rb-flow">${html}</div></div>`;
    // hidden table columns
    root.querySelectorAll('.rb').forEach(el => {
      const cfg = (state.report.blocks || {})[el.dataset.id] || {};
      el.querySelectorAll('.rb-body table').forEach((tbl, ti) => {
        const hide = (cfg.hideCols || {})[ti] || [];
        [...tbl.rows].forEach(row => {
          let col = 0;
          [...row.cells].forEach(cell => {
            const span = cell.colSpan || 1;
            if (hide.includes(col) && span === 1) cell.classList.add('rb-col-hidden');
            if (editor && row.parentElement.tagName === 'THEAD' && span === 1) { cell.dataset.col = col; cell.dataset.tbl = ti; }
            col += span;
          });
        });
        if (editor && hide.length) { const b = document.createElement('button'); b.className = 'rb-showcols'; b.dataset.tbl = ti; b.textContent = `Show ${hide.length} hidden column${hide.length > 1 ? 's' : ''}`; tbl.after(b); }
      });
    });
    const figs = [img1].concat(img2.map(im => im.src));
    root.querySelectorAll('.rp-canvas').forEach(el => { const cv = figs[+el.dataset.fig]; if (cv) el.appendChild(cv); });
    root.querySelectorAll('.rp-logo-c').forEach(el => { const cv = logoCanvas((i.logos || [])[+el.dataset.logo]); if (cv) el.appendChild(cv); });
    // running header / footer on every printed page
    const pg = $('pageStyle') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'pageStyle' }));
    const q = v => '"' + String(v).replace(/["\\]/g, '\\$&').replace(/\n/g, ' ') + '"';
    pg.textContent = `@media print { @page {
      @top-left { content: ${q('Cable loading plan — ' + (state.name || ''))}; font: 7.5pt system-ui, sans-serif; color: #5a7391; }
      @top-right { content: ${q(`${docNo} · Rev. ${rev}`)}; font: 7.5pt system-ui, sans-serif; color: #5a7391; }
      @bottom-left { content: ${q((i.client ? i.client + ' · ' : '') + 'Cable Loading Planner')}; font: 7.5pt system-ui, sans-serif; color: #8aa1ba; }
      @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 7.5pt system-ui, sans-serif; color: #8aa1ba; } } }`;
    reportBuiltAt = editor ? 0 : Date.now();
    return blocks;
  }

  /* block list = built-in blocks + the user's text blocks / page breaks, in the user's order */
  function reportBlocks(defs) {
    const R = state.report;
    const all = defs.map(d => Object.assign({ type: 'std' }, d)).concat((R.custom || []).map(cb => ({ id: cb.id, type: cb.type, name: cb.type === 'break' ? 'Page break' : 'Text block', title: '' })));
    const byId = new Map(all.map(b => [b.id, b]));
    const order = (R.order || []).filter(id => byId.has(id));
    all.forEach((b, k) => { if (!order.includes(b.id)) order.splice(Math.min(k, order.length), 0, b.id); });
    return order.map(id => { const b = byId.get(id); b.cfg = (R.blocks || {})[id] || {}; return b; });
  }

  function tools(b, editor) {
    if (!editor) return '';
    const cfg = b.cfg;
    const custom = b.type === 'text' || b.type === 'break';
    return `<div class="rb-tools" contenteditable="false">
      <span class="rb-grip" draggable="true" title="Drag to move">⠿</span><span class="rb-name">${esc(b.name)}</span>
      <button data-rb="up" title="Move up">▲</button><button data-rb="down" title="Move down">▼</button>
      ${b.type === 'break' ? '' : `<button data-rb="w-" title="Narrower">⇤</button><button data-rb="w+" title="Wider">⇥</button><button data-rb="fs-" title="Smaller text">A−</button><button data-rb="fs+" title="Larger text">A+</button>`}
      ${b.type === 'std' && !b.fig ? `<button data-rb="edit" title="Edit the content directly"${cfg.editing ? ' class="on"' : ''}>✎ Edit</button>` : ''}
      ${cfg.html !== undefined && b.type === 'std' ? '<button data-rb="revert" title="Back to the calculated content">↺ Live data</button>' : ''}
      <button data-rb="hide" title="${cfg.hidden ? 'Show in the report' : 'Hide from the report'}">${cfg.hidden ? '👁 Show' : 'Hide'}</button>
      ${custom ? '<button data-rb="del" title="Delete">✕</button>' : ''}</div>`;
  }

  /* ================================================================== */
  /* Report tab: live A4 preview the user arranges                       */
  /* ================================================================== */
  let lastBlocks = [];
  const W_STEPS = [25, 33, 40, 50, 60, 66, 75, 100];
  function rcfg(id) { state.report.blocks = state.report.blocks || {}; return (state.report.blocks[id] = state.report.blocks[id] || {}); }
  function cleanCfg(id) { const c = state.report.blocks[id]; if (c && !Object.keys(c).some(k => c[k] !== undefined)) delete state.report.blocks[id]; }
  function curOrder() { return lastBlocks.map(b => b.id); }

  function showReportEditor() {
    const stage = $('reportStage');
    if ($('report').parentElement !== stage) stage.appendChild($('report'));
    lastBlocks = buildReport({ editor: true }) || [];
  }
  function hideReportEditor() {
    if ($('report').parentElement !== document.body) document.body.appendChild($('report'));
    $('report').classList.remove('editing');
  }
  function refreshReport() { autosave(); if (ui.tab === 'report') { showReportEditor(); renderReportList(); } }

  function renderReportTab() {
    return `<div class="hint">The report is made of <b>blocks</b>. In the A4 preview: <b>⠿ drag</b> to move a block, <b>⇤ ⇥</b> or the <b>corner handle</b> to resize it, <b>A− A+</b> for its text size,
      <b>✎ Edit</b> to change its content (texts, table cells), click a <b>column header</b> to hide the column, click a <b>title</b> to rename it, <b>Hide</b> to leave it out of the report.</div>
      <div class="rp-actions"><button class="btn" data-action="rpText">+ Text block</button><button class="btn" data-action="rpBreak">+ Page break</button></div>
      <h3>Blocks (in report order)</h3><div id="rpList"></div>
      <div class="rp-actions"><button class="btn" data-action="rpReset">Reset the layout</button><button class="btn primary" data-action="rpPrint">Print / save as PDF</button></div>`;
  }
  function renderReportList() {
    const el = $('rpList');
    if (!el) return;
    el.innerHTML = lastBlocks.map((b, k) => {
      const cfg = b.cfg || {};
      const w = cfg.w || b.w || 100;
      return `<div class="rpl${cfg.hidden ? ' off' : ''}" data-id="${b.id}">
        <input type="checkbox" data-rpl="vis" ${cfg.hidden ? '' : 'checked'} title="Show in the report">
        <span class="rpl-name">${esc(b.type === 'text' ? (cfg.title || 'Text block') : (cfg.title || b.name))}${cfg.html !== undefined && b.type === 'std' ? ' <i>edited</i>' : ''}</span>
        ${b.type === 'break' ? '' : `<select data-rpl="w" title="Width">${W_STEPS.map(x => `<option value="${x}"${x === w ? ' selected' : ''}>${x} %</option>`).join('')}${W_STEPS.includes(w) ? '' : `<option selected>${w} %</option>`}</select>`}
        <button class="icon-btn" data-rpl="up" ${k === 0 ? 'disabled' : ''}>▲</button><button class="icon-btn" data-rpl="down" ${k === lastBlocks.length - 1 ? 'disabled' : ''}>▼</button>
        ${b.type !== 'std' ? '<button class="icon-btn del" data-rpl="del">✕</button>' : ''}</div>`;
    }).join('');
  }

  function moveBlock(id, delta) {
    const o = curOrder(), k = o.indexOf(id), j = k + delta;
    if (k < 0 || j < 0 || j >= o.length) return;
    o.splice(j, 0, o.splice(k, 1)[0]);
    state.report.order = o;
  }
  function blockAction(id, a) {
    const b = lastBlocks.find(x => x.id === id);
    if (!b) return;
    const cfg = rcfg(id);
    if (a === 'up') moveBlock(id, -1);
    else if (a === 'down') moveBlock(id, 1);
    else if (a === 'w-' || a === 'w+') {
      const cur = cfg.w || b.w || 100;
      const next = a === 'w+' ? W_STEPS.find(x => x > cur) || 100 : [...W_STEPS].reverse().find(x => x < cur) || 25;
      cfg.w = next;
    } else if (a === 'fs-' || a === 'fs+') {
      cfg.fs = Math.round(Math.max(0.6, Math.min(1.8, (cfg.fs || 1) + (a === 'fs+' ? 0.1 : -0.1))) * 10) / 10;
      if (cfg.fs === 1) delete cfg.fs;
    } else if (a === 'edit') cfg.editing = !cfg.editing || undefined;
    else if (a === 'revert') { delete cfg.html; delete cfg.editing; delete cfg.hideCols; }
    else if (a === 'hide' || a === 'vis') cfg.hidden = !cfg.hidden || undefined;
    else if (a === 'del') {
      state.report.custom = (state.report.custom || []).filter(x => x.id !== id);
      state.report.order = curOrder().filter(x => x !== id);
      delete state.report.blocks[id];
    }
    cleanCfg(id);
    refreshReport();
  }

  // ---- interactions on the preview ----
  const rep = $('report');
  rep.addEventListener('click', e => {
    if (!rep.classList.contains('editing')) return;
    const btn = e.target.closest('[data-rb]');
    if (btn) { e.preventDefault(); blockAction(btn.closest('.rb').dataset.id, btn.dataset.rb); return; }
    const sc = e.target.closest('.rb-showcols');
    if (sc) { const id = sc.closest('.rb').dataset.id; const cfg = rcfg(id); if (cfg.hideCols) delete cfg.hideCols[sc.dataset.tbl]; if (cfg.hideCols && !Object.keys(cfg.hideCols).length) delete cfg.hideCols; cleanCfg(id); refreshReport(); return; }
    const th = e.target.closest('th[data-col]');
    if (th && !th.closest('[contenteditable="true"]')) {   // hide a table column
      const id = th.closest('.rb').dataset.id, cfg = rcfg(id);
      cfg.hideCols = cfg.hideCols || {};
      const list = cfg.hideCols[th.dataset.tbl] = cfg.hideCols[th.dataset.tbl] || [];
      if (!list.includes(+th.dataset.col)) list.push(+th.dataset.col);
      refreshReport();
    }
  });
  rep.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('rb-title')) { e.preventDefault(); e.target.blur(); }
  });
  rep.addEventListener('focusout', e => {
    if (!rep.classList.contains('editing')) return;
    const el = e.target;
    const blk = el.closest && el.closest('.rb');
    if (!blk) return;
    const id = blk.dataset.id, b = lastBlocks.find(x => x.id === id);
    if (!b) return;
    if (el.classList.contains('rb-title')) {
      const v = el.textContent.trim();
      const cfg = rcfg(id);
      if (b.type === 'std' && v === (b.title || '')) delete cfg.title; else cfg.title = v;
      cleanCfg(id);
      setTimeout(refreshReport, 0);
    } else if (el.classList.contains('rb-body') && el.isContentEditable) {
      rcfg(id).html = el.innerHTML;       // edited content is kept as typed (frozen); "↺ Live data" brings back the calculated content
      autosave(); renderReportList();
    }
  });

  // resize with the corner handle (width in % of the page, snapped to 5 %)
  let rsz = null;
  rep.addEventListener('pointerdown', e => {
    const hnd = e.target.closest('.rb-resize');
    if (!hnd) return;
    e.preventDefault();
    const blk = hnd.closest('.rb'), flow = blk.parentElement;
    rsz = { blk, id: blk.dataset.id, x0: e.clientX, w0: blk.getBoundingClientRect().width, W: flow.getBoundingClientRect().width };
    hnd.setPointerCapture(e.pointerId);
  });
  rep.addEventListener('pointermove', e => {
    if (!rsz) return;
    const pct = Math.max(20, Math.min(100, Math.round((rsz.w0 + e.clientX - rsz.x0) / rsz.W * 100 / 5) * 5));
    rsz.pct = pct; rsz.blk.style.width = pct + '%';
  });
  rep.addEventListener('pointerup', () => {
    if (!rsz) return;
    if (rsz.pct) rcfg(rsz.id).w = rsz.pct;
    rsz = null; refreshReport();
  });

  // drag & drop to reorder
  let dragId = null;
  rep.addEventListener('dragstart', e => {
    const g = e.target.closest && e.target.closest('.rb-grip');
    if (!g) return;
    dragId = g.closest('.rb').dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    g.closest('.rb').classList.add('rb-dragging');
  });
  const dropPos = (blk, e) => {
    const r = blk.getBoundingClientRect();
    return blk.style.width && parseFloat(blk.style.width) < 95 ? (e.clientX < r.left + r.width / 2 ? 'before' : 'after') : (e.clientY < r.top + r.height / 2 ? 'before' : 'after');
  };
  rep.addEventListener('dragover', e => {
    if (!dragId) return;
    const blk = e.target.closest('.rb');
    if (!blk || blk.dataset.id === dragId) return;
    e.preventDefault();
    rep.querySelectorAll('.rb-drop-before,.rb-drop-after').forEach(x => x.classList.remove('rb-drop-before', 'rb-drop-after'));
    blk.classList.add('rb-drop-' + dropPos(blk, e));
  });
  rep.addEventListener('drop', e => {
    if (!dragId) return;
    e.preventDefault();
    const blk = e.target.closest('.rb');
    if (blk && blk.dataset.id !== dragId) {
      const o = curOrder().filter(x => x !== dragId);
      const k = o.indexOf(blk.dataset.id);
      o.splice(dropPos(blk, e) === 'before' ? k : k + 1, 0, dragId);
      state.report.order = o;
    }
    dragId = null;
    refreshReport();
  });
  rep.addEventListener('dragend', () => { dragId = null; rep.querySelectorAll('.rb-dragging,.rb-drop-before,.rb-drop-after').forEach(x => x.classList.remove('rb-dragging', 'rb-drop-before', 'rb-drop-after')); });

  // left panel list
  $('tabBody').addEventListener('change', e => {
    const row = e.target.closest('.rpl');
    if (!row) return;
    if (e.target.dataset.rpl === 'vis') blockAction(row.dataset.id, 'vis');
    else if (e.target.dataset.rpl === 'w') { rcfg(row.dataset.id).w = parseInt(e.target.value, 10); refreshReport(); }
  });
  $('tabBody').addEventListener('click', e => {
    const b = e.target.closest('[data-rpl]');
    if (b && b.tagName === 'BUTTON') blockAction(b.closest('.rpl').dataset.id, b.dataset.rpl);
  });

  function printReport() {
    hideReportEditor();
    buildReport();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
  window.addEventListener('afterprint', () => { if (ui.tab === 'report') showReportEditor(); });

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
  $('btnPrint').addEventListener('click', () => printReport());

  update();
  renderTab();
})();
