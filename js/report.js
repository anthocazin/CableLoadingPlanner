/*
 * Cable Loading Planner — report layout (A4 pages with freely positioned elements)
 *
 * Every element of the report (title block, tables, figures, texts) is a "frame" placed on an A4 page:
 *   frame = { p: page index, x, y: position in mm, w: width in mm, fs: text scale, hidden, title, html, cols }
 * The height of a frame follows its content (figures keep their proportions), so nothing is ever cut.
 * The same pages are used for the on-screen editor (Report tab) and for printing.
 */
(function () {
  'use strict';
  const MM = 96 / 25.4;                                    // CSS px per mm
  const PG = { w: 210, h: 297, ml: 14, mr: 14, mt: 26, mb: 20, mt0: 14 };
  const CW = PG.w - PG.ml - PG.mr;                         // usable width: 182 mm
  const GAP = 5;
  const HALF = (CW - GAP) / 2;
  let A = null;                                            // API given by the application
  let blocks = [], built = null, sel = null, editing = null, opts_noresolve = false;

  /* ------------------------------------------------------------------ */
  const S = () => A.state();
  function rep() {
    const s = S();
    if (!s.rep || typeof s.rep !== 'object') s.rep = {};
    const r = s.rep;
    r.frames = r.frames || {}; r.custom = r.custom || []; r.pages = Math.max(1, r.pages || 1);
    return r;
  }
  const fr = id => (rep().frames[id] = rep().frames[id] || {});
  const esc = s => A.esc(s);
  const fmt = (v, d) => A.fmt(v, d);
  const num = (v, d) => A.num(v, d);

  /* ================================================================== */
  /* Content                                                             */
  /* ================================================================== */
  function content() {
    const st = S(), res = A.result(), i = st.info, c = st.carrier, w = st.winding, t = res.totals;
    const coil = A.kind() === 'coil';
    const typeLabel = (A.CARRIER_TYPES[c.type] || {}).label || '';
    const equipment = `${c.name ? c.name + ' — ' : ''}${typeLabel}`;
    const docNo = i.reference || '—', rev = i.revision || '0';
    const status = { ok: ['OK', 'Loading plan OK'], warn: ['TO CHECK', 'Loading plan to be checked'], fail: ['NOT OK', 'Loading plan NOT OK'] }[t.status];
    const rot = w.rotation === 'ccw' ? 'counter-clockwise' : 'clockwise';
    const unitC = coil ? 'compartment' : 'bay';
    const B = [];

    // figures (canvases drawn by the application)
    const figs = [];
    figs.push({ cv: A.renderImage('section', 'all'), cap: coil ? 'Cross-section through the centre (full diameter). Red dashed line = maximum stack (freeboard limit).' : 'Cross-section along the drum axis. Red dashed line = freeboard limit.' });
    if (coil) figs.push({ cv: A.renderImage('plan', 'all'), cap: `Plan view — top two layers, coiling ${rot} seen from above.` });
    else res.compartments.slice(0, 3).forEach(cr => figs.push({ cv: A.renderImage('side', String(cr.comp.index)), cap: `Side view from the ${w.startSide === 'right' ? 'right' : 'left'} flange (start side) — ${cr.comp.name}.` }));

    const logos = (i.logos || []).map((l, k) => `<span class="rf-logo" data-logo="${k}"></span>`).join('');
    B.push({ id: 'title', name: 'Title block', w: CW, html: `<div class="rt-title">
      <div class="rt-top">${logos ? `<div class="rt-logos">${logos}</div>` : ''}
        <div class="rt-main"><div class="rt-kicker">Cable loading plan</div><div class="rt-h1">${esc(st.name || 'Untitled project')}</div><div class="rt-sub">${esc(equipment)}${i.vessel ? ' · ' + esc(i.vessel) : ''}${i.client ? ' · ' + esc(i.client) : ''}</div></div></div>
      <div class="rt-strip"><div><span>Document No.</span><b>${esc(docNo)}</b></div><div><span>Revision</span><b>${esc(rev)}</b></div><div><span>Date</span><b>${esc(i.date || '—')}</b></div><div><span>Status</span><b class="st-${t.status}">${status[0]}</b></div></div></div>` });

    const kv = (k, v) => `<th>${esc(k)}</th><td>${esc(v || '—')}</td>`;
    B.push({ id: 'ident', name: 'Project information', w: CW, html: `<table class="rt-kv">
      <tr>${kv('Client / project', i.client)}${kv('Vessel / site', i.vessel)}</tr>
      <tr>${kv('Equipment', equipment)}${kv('Max. cable load (SWL)', num(c.maxLoad) ? fmt(num(c.maxLoad), 1) + ' t' : '')}</tr>
      <tr>${kv('Empty weight (tare)', num(c.tare) ? fmt(num(c.tare), 1) + ' t' : '')}${kv('Coiling direction', rot.charAt(0).toUpperCase() + rot.slice(1))}</tr>
      <tr>${kv('Prepared by', i.preparedBy)}${kv('Checked by', i.checkedBy)}</tr></table>` });

    const summary = `This plan covers ${fmt(t.length, 0)} m of cable (${fmt(t.weight, 1)} t) in ${st.sections.length} section${st.sections.length > 1 ? 's' : ''}, loaded in ${res.compartments.length} ${unitC}${res.compartments.length > 1 ? 's' : ''} of ${esc(equipment)}${t.loadPct !== null ? `, i.e. ${fmt(t.loadPct * 100, 1)} % of the maximum cable load` : ''}. The cable is coiled ${rot}.`;
    B.push({ id: 'summary', name: 'Summary', title: 'Summary', w: CW, html: `<p>${summary}</p>` });

    const kf = [['Cable loaded', `${fmt(t.length, 0)} m`], ['Cable weight', `${fmt(t.weight, 1)} t`]];
    if (num(c.tare) > 0) kf.push([coil ? 'Total weight (equipment + cable)' : 'Total drum weight (drum + cable)', `${fmt(t.gross, 1)} t`]);
    if (t.loadPct !== null) kf.push(['Load vs SWL', `${fmt(t.loadPct * 100, 1)} %`]);
    if (t.vcg !== null) kf.push(['Cable VCG above floor', `${fmt(t.vcg, 2)} m`]);
    B.push({ id: 'keyfig', name: 'Key figures', w: CW, html: `<table class="rt-kf"><tr>${kf.map(k => `<th>${esc(k[0])}</th>`).join('')}</tr><tr>${kf.map(k => `<td>${k[1]}</td>`).join('')}</tr></table>` });

    const legend = st.sections.map((s, k) => `<span><i style="background:${esc(A.sectionColor(k))}"></i>${esc(s.name)}</span>`).join('');
    figs.forEach((f, k) => {
      B.push({ id: 'fig' + (k + 1), name: k === 0 ? 'Figure — cross-section' : coil ? 'Figure — plan view' : `Figure — side view ${k}`, fig: k, w: k === 0 ? CW : coil ? 100 : (figs.length > 2 ? HALF : 100),
        html: `<figure class="rt-fig"><div class="rt-canvas" data-fig="${k}"></div><figcaption><b class="rf-fign">Figure</b> — ${esc(f.cap)}</figcaption>${k === 0 ? `<div class="rt-legend">${legend}</div>` : ''}</figure>` });
    });

    // fill per compartment (table with bars, no text inside the bars)
    B.push({ id: 'fill', name: `Fill per ${unitC}`, title: `Fill per ${unitC}`, w: coil ? CW - 100 - GAP : CW, html: `<table class="rt-t"><thead><tr><th>${coil ? 'Comp.' : 'Bay'}</th><th class="r">Loaded</th><th class="r">Layers</th><th>Stack used</th></tr></thead><tbody>${res.compartments.map(cr => `<tr><td><b>${esc(cr.comp.label.replace('Compartment ', 'C'))}</b><br><span class="mut">${esc(cr.comp.name)}</span></td><td class="r">${fmt(cr.length, 0)} m<br><span class="mut">${fmt(cr.weight, 1)} t</span></td><td class="r">${cr.fill.layers}</td><td><div class="rt-bar"><i style="width:${Math.min(100, cr.usedPct * 100).toFixed(1)}%"></i></div><span class="nw"><b>${fmt(cr.usedPct * 100, 0)} %</b> <span class="mut">· ${fmt(cr.used, 2)} / ${fmt(cr.comp.stackMax - cr.comp.stackMin, 2)} m</span></span></td></tr>`).join('')}</tbody></table>` });

    // cable sections
    const secRows = res.sections.map((sr, k) => {
      const s = st.sections[k], cr = res.compartments[sr.compIndex], cab = sr.cable;
      let stt = '<span class="ok">OK</span>';
      if (sr.placed === undefined || !cr) stt = '<span class="bad">Error</span>';
      else if (sr.overflow > 0.01) stt = `<span class="bad">Overflow ${fmt(sr.overflow, 0)} m</span>`;
      else if (cab && num(cab.mbr) > 0 && sr.minRadius < num(cab.mbr)) stt = '<span class="bad">MBR</span>';
      const off = cr ? cr.sectionIdx.length - cr.sectionIdx.indexOf(k) : '';
      return `<tr><td>${k + 1}</td><td><i class="sw" style="background:${esc(A.sectionColor(k))}"></i><b>${esc(s.name)}</b><br><span class="mut">${esc(cab ? cab.name : '—')}${cab ? ` · Ø ${fmt(num(cab.od), 0)} mm` : ''}</span></td>
        <td>${cr ? esc(cr.comp.label.replace('Compartment ', 'C')) : '—'}</td><td class="r">${fmt(sr.placed, 0)} m</td><td class="r">${fmt(sr.weight, 1)} t</td><td class="r wrap">${A.topText(sr)}</td>
        <td>${cr ? A.posText(cr, sr.first, false) : '—'}</td><td>${cr ? A.posText(cr, sr.last, true) : '—'}</td><td class="r">${off ? '#' + off : ''}</td><td>${stt}</td></tr>`;
    }).join('');
    B.push({ id: 'sections', name: 'Cable sections', title: 'Cable sections — start and end positions', w: CW, html: `<table class="rt-t"><thead><tr><th>#</th><th>Section / cable</th><th>${coil ? 'Comp.' : 'Bay'}</th><th class="r">Loaded</th><th class="r">Weight</th><th class="r">Top</th><th>Inner end (start)</th><th>Outer end (end)</th><th class="r">Off</th><th>Status</th></tr></thead><tbody>${secRows}</tbody></table>
      <p class="rt-note">Inner end = first end loaded (bottom of the coil / on the barrel). Outer end = last end loaded. Off = order in which the sections come off. Top = highest point of the section.</p>` });

    // compartments (no spare capacity)
    B.push({ id: 'comp', name: coil ? 'Compartments' : 'Bays', title: coil ? 'Compartments' : 'Bays', w: CW, html: `<table class="rt-t"><thead><tr><th>${coil ? 'Compartment' : 'Bay'}</th><th>Geometry</th><th class="r">Sections</th><th class="r">Loaded</th><th class="r">Weight</th><th class="r">Layers</th><th class="r">Turns / layer</th><th class="r">Stack used</th>${coil ? '<th class="r">VCG</th>' : ''}</tr></thead><tbody>
      ${res.compartments.map(cr => { const cc = cr.comp; return `<tr><td><b>${esc(cc.label)}</b><br><span class="mut">${esc(cc.name)}</span></td><td>${coil ? `R ${fmt(cc.acrossMin, 2)}–${fmt(cc.acrossMax, 2)} m · H ${fmt(cc.stackMax, 2)} m` : `W ${fmt(cc.acrossMax - cc.acrossMin, 2)} m · R ${fmt(cc.stackMin, 2)}–${fmt(cc.stackMax, 2)} m`}</td><td class="r">${cr.sectionIdx.length}</td><td class="r">${fmt(cr.length, 0)} m</td><td class="r">${fmt(cr.weight, 1)} t</td><td class="r">${cr.fill.layers}</td><td class="r">${cr.turnsLayer1}</td><td class="r">${fmt(cr.used, 2)} m · ${fmt(cr.usedPct * 100, 0)} %</td>${coil ? `<td class="r">${cr.vcg === null ? '—' : fmt(cr.vcg, 2) + ' m'}</td>` : ''}</tr>`; }).join('')}
      <tr class="tot"><td><b>Total</b></td><td></td><td class="r">${st.sections.length}</td><td class="r">${fmt(t.length, 0)} m</td><td class="r">${fmt(t.weight, 1)} t</td><td></td><td></td><td></td>${coil ? `<td class="r">${t.vcg === null ? '—' : fmt(t.vcg, 2) + ' m'}</td>` : ''}</tr>
      ${num(c.tare) > 0 ? `<tr class="tot"><td colspan="4"><b>${coil ? 'Total weight (equipment + cable)' : 'Total drum weight (drum + cable)'}</b></td><td class="r"><b>${fmt(t.gross, 1)} t</b></td><td colspan="${coil ? 4 : 3}" class="mut">tare ${fmt(num(c.tare), 1)} t + cable ${fmt(t.weight, 1)} t</td></tr>` : ''}</tbody></table>` });

    // geometry & cables
    let geo;
    if (coil) {
      geo = `<table class="rt-t"><thead><tr><th>Ring</th><th class="r">Inner Ø</th><th class="r">Wall</th><th class="r">Height</th></tr></thead><tbody>${A.ringsSorted().map(r => `<tr><td>${esc(r.name)}</td><td class="r">${fmt(num(r.diameter), 2)} m</td><td class="r">${fmt(num(r.thickness), 0)} mm</td><td class="r">${fmt(num(r.height), 2)} m</td></tr>`).join('')}<tr><td>Freeboard</td><td></td><td></td><td class="r">${fmt(num(c.freeboard), 2)} m</td></tr></tbody></table>`;
    } else {
      const d = c.drum;
      geo = `<table class="rt-t"><thead><tr><th>Item</th><th class="r">Value</th></tr></thead><tbody><tr><td>Barrel Ø</td><td class="r">${fmt(num(d.barrelDiameter), 2)} m</td></tr><tr><td>Flange Ø</td><td class="r">${fmt(num(d.flangeDiameter), 2)} m</td></tr><tr><td>Flange thickness</td><td class="r">${fmt(num(d.flangeThickness), 0)} mm</td></tr><tr><td>Freeboard</td><td class="r">${fmt(num(d.freeboard), 2)} m</td></tr>${d.bays.map(b => `<tr><td>${esc(b.name)} — inner width</td><td class="r">${fmt(num(b.width), 2)} m</td></tr>`).join('')}</tbody></table>`;
    }
    B.push({ id: 'geom', name: 'Equipment geometry', title: 'Equipment geometry', w: HALF, html: geo });
    B.push({ id: 'cables', name: 'Cables', title: 'Cables', w: HALF, html: `<table class="rt-t"><thead><tr><th>Cable</th><th class="r">OD</th><th class="r">Weight</th><th class="r">MBR</th></tr></thead><tbody>${st.cables.map(cb => `<tr><td>${esc(cb.name)}</td><td class="r">${fmt(num(cb.od), 0)} mm</td><td class="r">${fmt(num(cb.weight), 1)} kg/m</td><td class="r">${fmt(num(cb.mbr), 2)} m</td></tr>`).join('')}</tbody></table>` });

    // capacity
    const rows = A.capRows();
    B.push({ id: 'capacity', name: 'Maximum capacity', title: 'Maximum capacity — each cable alone, empty equipment', w: CW, html: `<table class="rt-t"><thead><tr><th>Cable</th>${res.compartments.map(cr => `<th class="r">${esc(cr.comp.label.replace('Compartment ', 'C'))}</th>`).join('')}<th class="r">By volume</th>${num(c.maxLoad) ? '<th class="r">By weight (SWL)</th>' : ''}<th class="r">Max. loadable</th><th class="r">Working 80 %</th></tr></thead><tbody>
      ${rows.map(cp => `<tr><td>${esc(cp.row.cable.name)}</td>${cp.row.caps.map(v => `<td class="r">${fmt(v, 0)} m</td>`).join('')}<td class="r">${fmt(cp.vol, 0)} m</td>${num(c.maxLoad) ? `<td class="r">${fmt(cp.bySwl, 0)} m</td>` : ''}<td class="r"><b>${fmt(cp.max, 0)} m</b><br><span class="mut">by ${cp.byWeight ? 'weight' : 'volume'}</span></td><td class="r">${fmt(cp.working, 0)} m</td></tr>`).join('')}</tbody></table>
      <p class="rt-note">Max. loadable = the smaller of the volume capacity and the length allowed by the SWL.</p>` });

    B.push({ id: 'notes', name: 'Assumptions and notes', title: 'Assumptions and notes', w: CW, html: `<ul class="rt-ul">
      <li>Turn-by-turn simulation, layers alternate direction; ${w.stacking === 'nested' ? 'nested stacking (layer pitch 0.866 × OD)' : 'square stacking (layer pitch 1.0 × OD)'}; gap between turns ${fmt(num(w.turnGapPct), 1)} % of OD ${A.gapMm(w.turnGapPct)}, between layers ${fmt(num(w.layerGapPct), 1)} % of OD.</li>
      <li>Coiling ${rot} ${coil ? 'seen from above' : 'seen from the start flange'}. Freeboard ${fmt(num(coil ? c.freeboard : c.drum.freeboard), 2)} m kept below the ${coil ? 'top of the walls' : 'flange rim'}.</li>
      <li>Planning aid: to be checked against the equipment drawings, the cable data sheets and the loading procedure.</li>${i.notes ? `<li>${esc(i.notes)}</li>` : ''}</ul>` });

    const order = { fail: 0, warn: 1, info: 2, ok: 3 };
    const checks = res.checks.slice().sort((a, b) => order[a.level] - order[b.level]);
    B.push({ id: 'conclusion', name: 'Conclusion', title: 'Conclusion', w: CW, html: `<div class="rt-concl st-${t.status}"><div class="rt-concl-h">${status[1]}</div><ul>${checks.map(ch => `<li>${esc(ch.text)}</li>`).join('')}</ul></div>` });

    B.push({ id: 'revision', name: 'Revision & signatures', w: CW, html: `<table class="rt-rev"><thead><tr><th>Rev.</th><th>Date</th><th>Description</th><th>Prepared</th><th>Checked</th><th>Approved</th></tr></thead>
      <tbody><tr><td>${esc(rev)}</td><td>${esc(i.date || '')}</td><td>${esc(i.revDescription || 'Issued for use')}</td><td>${esc(i.preparedBy || '')}</td><td>${esc(i.checkedBy || '')}</td><td>${esc(i.approvedBy || '')}</td></tr>
      <tr class="sig"><td colspan="3">Signature</td><td></td><td></td><td></td></tr></tbody></table>` });

    rep().custom.forEach(cb => B.push({ id: cb.id, name: 'Text', title: '', custom: true, w: CW, html: '<p>Double-click to write your text.</p>' }));
    return { blocks: B, figs, meta: { docNo, rev, project: st.name || '', client: i.client || '' } };
  }

  /* ================================================================== */
  /* Rendering                                                           */
  /* ================================================================== */
  function frameHTML(b, cfg, numStr) {
    const title = cfg.title !== undefined ? cfg.title : (b.title || '');
    const head = title || (b.title !== undefined && editing === b.id) ? `<div class="rf-h">${numStr && title ? `<span class="rf-n">${numStr}</span>` : ''}<span class="rf-t" data-ph="Title">${esc(title)}</span></div>` : '';
    return `${head}<div class="rf-body">${cfg.html !== undefined ? cfg.html : b.html}</div>`;
  }

  function pageChrome(k, n, meta) {
    const st = S();
    const logos = (st.info.logos || []).map((l, j) => `<span class="rf-logo" data-logo="${j}"></span>`).join('');
    return `${k > 0 ? `<div class="pg-hdr"><div class="pg-hl">${logos ? `<span class="pg-logos">${logos}</span>` : ''}<span>Cable loading plan — ${esc(meta.project)}</span></div><div class="pg-hr">${esc(meta.docNo)} · Rev. ${esc(meta.rev)}</div></div>` : ''}
      <div class="pg-ftr"><span>${esc(meta.docNo)} · Rev. ${esc(meta.rev)}</span><span>${esc(meta.client)}</span><span>Page ${k + 1} of ${n}</span></div>`;
  }

  function render(target, editor) {
    built = content();
    blocks = built.blocks;
    const R = rep();
    const visible = blocks.filter(b => !fr(b.id).hidden);
    // place what has never been placed (new blocks, first use)
    if (visible.some(b => fr(b.id).x === undefined)) { autoLayout(visible.filter(b => fr(b.id).x === undefined), true); if (editor) A.save(); }
    const maxP = Math.max(0, ...visible.map(b => fr(b.id).p || 0));
    R.pages = Math.max(R.pages, maxP + 1);
    // numbering in reading order
    const ordered = visible.slice().sort((a, b) => (fr(a.id).p - fr(b.id).p) || (fr(a.id).y - fr(b.id).y) || (fr(a.id).x - fr(b.id).x));
    let n = 0, f = 0;
    const nums = {}, fign = {};
    ordered.forEach(b => {
      const cfg = fr(b.id), title = cfg.title !== undefined ? cfg.title : (b.title || '');
      if (title) nums[b.id] = ++n + '.';
      if (b.fig !== undefined) fign[b.id] = ++f;
    });
    let html = '';
    for (let k = 0; k < R.pages; k++) {
      html += `<div class="rpage" data-p="${k}">${pageChrome(k, R.pages, built.meta)}`;
      visible.filter(b => (fr(b.id).p || 0) === k).forEach(b => {
        const cfg = fr(b.id);
        html += `<div class="rframe k-${b.fig !== undefined ? 'fig' : b.id}${b.custom ? ' k-text' : ''}${cfg.html !== undefined && !b.custom ? ' frozen' : ''}" data-id="${b.id}" style="left:${cfg.x}mm;top:${cfg.y}mm;width:${cfg.w || b.w}mm;font-size:${(cfg.fs || 1) * 100}%">${frameHTML(b, cfg, nums[b.id])}</div>`;
      });
      html += '</div>';
    }
    target.innerHTML = `<div class="rdoc${editor ? ' editor' : ''}">${html}</div>`;
    // figures, figure numbers, logos, hidden columns
    target.querySelectorAll('.rt-canvas').forEach(el => { const fg = built.figs[+el.dataset.fig]; if (fg) el.appendChild(fg.cv.cloneNode ? cloneCanvas(fg.cv) : fg.cv); });
    target.querySelectorAll('.rframe').forEach(el => {
      const fn = el.querySelector('.rf-fign');
      if (fn && fign[el.dataset.id]) fn.textContent = 'Figure ' + fign[el.dataset.id];
      hideCols(el, fr(el.dataset.id).cols || []);
    });
    target.querySelectorAll('.rf-logo').forEach(el => { const cv = A.logoCanvas((S().info.logos || [])[+el.dataset.logo]); if (cv) el.appendChild(cv); });
    if (!opts_noresolve && resolve(target)) { if (editor) A.save(); opts_noresolve = true; render(target, editor); opts_noresolve = false; return; }
    if (editor) decorate(target);
  }
  /* nothing may overlap: elements are taken in reading order; an element that would cover one already placed is
     pushed just below it, and goes to the next page when it no longer fits. Returns true when something moved. */
  function resolve(root) {
    const R = rep();
    const top = p => (p === 0 ? PG.mt0 : PG.mt);
    const bottom = PG.h - PG.mb;
    const H = {};
    root.querySelectorAll('.rframe').forEach(el => { H[el.dataset.id] = el.offsetHeight / MM; });
    const vis = blocks.filter(b => !fr(b.id).hidden && H[b.id] !== undefined)
      .sort((a, b) => ((fr(a.id).p || 0) - (fr(b.id).p || 0)) || (fr(a.id).y - fr(b.id).y) || (fr(a.id).x - fr(b.id).x));
    const placed = {};
    let changed = false;
    vis.forEach(b => {
      const cfg = fr(b.id);
      const w = cfg.w || b.w, h = H[b.id];
      let p = cfg.p || 0, x = Math.max(0, Math.min(PG.w - w, cfg.x)), y = Math.max(top(p), cfg.y);
      if (h > bottom - top(p) + 0.5 && (cfg.fs || 1) > 0.56) { cfg.fs = Math.max(0.55, Math.floor((bottom - top(p)) / h * (cfg.fs || 1) * 100) / 100); changed = true; }
      for (let guard = 0; guard < 60; guard++) {
        let bumped = true;
        while (bumped) {
          bumped = false;
          (placed[p] || []).forEach(o => {
            if (x < o.x + o.w - 0.5 && x + w > o.x + 0.5 && y < o.y + o.h + GAP - 0.3 && y + h > o.y - 0.3) { y = o.y + o.h + GAP; bumped = true; }
          });
        }
        if (y + h > bottom + 0.5 && y > top(p) + 0.5) { p += 1; y = top(p); continue; }
        break;
      }
      if (p !== (cfg.p || 0) || Math.abs(y - cfg.y) > 0.05 || Math.abs(x - cfg.x) > 0.05) { cfg.p = p; cfg.y = Math.round(y * 10) / 10; cfg.x = Math.round(x * 10) / 10; changed = true; }
      (placed[p] = placed[p] || []).push({ x, y, w, h });
    });
    const need = Math.max(0, ...Object.keys(placed).map(Number)) + 1;
    if (need > R.pages) { R.pages = need; changed = true; }
    return changed;
  }
  function cloneCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
  function hideCols(el, cols) {
    const tbl = el.querySelector('.rf-body table');
    if (!tbl || !cols.length) return;
    [...tbl.rows].forEach(row => { let col = 0; [...row.cells].forEach(cell => { const sp = cell.colSpan || 1; if (sp === 1 && cols.includes(col)) cell.style.display = 'none'; col += sp; }); });
  }

  /* height of each block at a given width (mm), measured off-screen */
  function measure(list) {
    const m = document.createElement('div');
    m.className = 'rdoc rmeasure';
    document.body.appendChild(m);
    const out = {};
    list.forEach(b => {
      const cfg = fr(b.id);
      const el = document.createElement('div');
      el.className = 'rframe';
      el.style.cssText = `position:relative;left:0;top:0;width:${cfg.w || b.w}mm;font-size:${(cfg.fs || 1) * 100}%`;
      el.innerHTML = frameHTML(b, cfg, '0.');
      el.querySelectorAll('.rt-canvas').forEach(c => { const fg = built.figs[+c.dataset.fig]; if (fg) { const cv = document.createElement('canvas'); cv.width = fg.cv.width; cv.height = fg.cv.height; c.appendChild(cv); } });
      el.querySelectorAll('.rf-logo').forEach(c => { const cv = A.logoCanvas((S().info.logos || [])[+c.dataset.logo]); if (cv) c.appendChild(cv); });
      m.appendChild(el);
      out[b.id] = el.getBoundingClientRect().height / MM;
    });
    m.remove();
    return out;
  }

  /* place blocks one after the other, side by side when they fit, page after page */
  function autoLayout(list, append) {
    const R = rep();
    const H = measure(list);
    const usable = PG.h - PG.mt - PG.mb;   // (page 1 has a little more room)
    const top = pg => (pg === 0 ? PG.mt0 : PG.mt);
    let p = 0, y = top(0), x = PG.ml, rowH = 0;
    if (append) { // continue after what is already on the pages
      const placed = blocks.filter(b => !fr(b.id).hidden && fr(b.id).x !== undefined && !list.includes(b));
      if (placed.length) {
        const all = measure(placed);
        p = Math.max(...placed.map(b => fr(b.id).p || 0));
        y = Math.max(top(p), ...placed.filter(b => (fr(b.id).p || 0) === p).map(b => fr(b.id).y + all[b.id] + GAP));
      }
    }
    list.forEach(b => {
      const cfg = fr(b.id);
      const w = Math.min(cfg.w || b.w, CW);
      let h = H[b.id];
      if (x > PG.ml && x + w > PG.ml + CW + 0.5) { y += rowH + GAP; x = PG.ml; rowH = 0; }
      if (h > usable) { cfg.fs = Math.max(0.55, Math.floor(usable / h * (cfg.fs || 1) * 100) / 100); h = usable; }
      if (y + h > PG.h - PG.mb) { p += 1; y = top(p); x = PG.ml; rowH = 0; }
      Object.assign(cfg, { p, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w });
      x += w + GAP; rowH = Math.max(rowH, h);
      if (x > PG.ml + CW - 20) { y += rowH + GAP; x = PG.ml; rowH = 0; }
    });
    R.pages = Math.max(R.pages, p + 1);
  }

  /* ================================================================== */
  /* Editor                                                              */
  /* ================================================================== */
  let stage = null;
  function showEditor(el) {
    stage = el;
    render(stage, true);
    if (sel && !stage.querySelector(`.rframe[data-id="${sel}"]`)) sel = null;
    select(sel);
  }
  function hideEditor() { closeEdit(true); sel = null; }

  function decorate(root) {
    root.querySelectorAll('.rframe').forEach(el => {
      el.insertAdjacentHTML('beforeend', '<span class="hd hd-w" data-h="w"></span><span class="hd hd-e" data-h="e"></span><span class="hd hd-nw" data-h="w"></span><span class="hd hd-ne" data-h="e"></span><span class="hd hd-sw" data-h="w"></span><span class="hd hd-se" data-h="e"></span>');
      const pg = el.closest('.rpage');
      if (el.offsetTop + el.offsetHeight > pg.clientHeight - PG.mb * MM + 2) el.classList.add('over');
    });
    // frames that cover each other on the same page
    root.querySelectorAll('.rpage').forEach(pg => {
      const fs = [...pg.querySelectorAll('.rframe')];
      fs.forEach((a, i) => fs.slice(i + 1).forEach(b => {
        const ox = Math.min(a.offsetLeft + a.offsetWidth, b.offsetLeft + b.offsetWidth) - Math.max(a.offsetLeft, b.offsetLeft);
        const oy = Math.min(a.offsetTop + a.offsetHeight, b.offsetTop + b.offsetHeight) - Math.max(a.offsetTop, b.offsetTop);
        if (ox > 4 && oy > 4) { a.classList.add('overlap'); b.classList.add('overlap'); }
      }));
    });
  }

  function select(id) {
    sel = id;
    if (!stage) return;
    stage.querySelectorAll('.rframe.sel').forEach(e => e.classList.remove('sel'));
    stage.querySelectorAll('.rtool').forEach(e => e.remove());
    if (!id) { A.onSelect && A.onSelect(null); return; }
    const el = stage.querySelector(`.rframe[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('sel');
    const b = blocks.find(x => x.id === id), cfg = fr(id);
    const isTable = !!el.querySelector('.rf-body table');
    const tb = document.createElement('div');
    tb.className = 'rtool';
    tb.innerHTML = `<b>${esc(b ? b.name : '')}</b>
      <button data-t="fs-" title="Smaller text">A−</button><button data-t="fs+" title="Larger text">A+</button>
      <button data-t="full" title="Full page width">↔ Full width</button><button data-t="half" title="Half page width">½</button>
      ${b && b.fig === undefined ? '<button data-t="edit" title="Edit the text (or double-click)">✎ Edit</button>' : ''}
      ${isTable ? '<button data-t="cols" title="Show / hide columns">Columns ▾</button>' : ''}
      ${cfg.html !== undefined && b && !b.custom ? '<button data-t="live" title="Back to the calculated content">↺ Live data</button>' : ''}
      <button data-t="del" title="Remove from the report (Delete key)">🗑</button>`;
    el.closest('.rpage').appendChild(tb);
    placeTool(el, tb);
    A.onSelect && A.onSelect(id);
  }
  function placeTool(el, tb) {
    const top = el.offsetTop - 34;
    tb.style.left = Math.max(4, Math.min(el.offsetLeft, el.closest('.rpage').clientWidth - tb.offsetWidth - 4)) + 'px';
    tb.style.top = (top < 4 ? el.offsetTop + el.offsetHeight + 6 : top) + 'px';
  }

  function toolAction(t, btn) {
    const id = sel, b = blocks.find(x => x.id === id), cfg = fr(id);
    if (!b) return;
    if (t === 'fs-' || t === 'fs+') { cfg.fs = Math.round(Math.max(0.5, Math.min(2, (cfg.fs || 1) + (t === 'fs+' ? 0.1 : -0.1))) * 10) / 10; if (cfg.fs === 1) delete cfg.fs; }
    else if (t === 'full') { cfg.x = PG.ml; cfg.w = CW; }
    else if (t === 'half') { cfg.w = HALF; if (cfg.x + HALF > PG.w - PG.mr) cfg.x = PG.w - PG.mr - HALF; }
    else if (t === 'edit') { openEdit(id); return; }
    else if (t === 'live') { delete cfg.html; delete cfg.title; delete cfg.cols; }
    else if (t === 'del') { removeFrame(id); return; }
    else if (t === 'cols') { colsMenu(btn); return; }
    commit();
  }
  function removeFrame(id) {
    const b = blocks.find(x => x.id === id);
    if (b && b.custom) { rep().custom = rep().custom.filter(c => c.id !== id); delete rep().frames[id]; }
    else fr(id).hidden = true;
    sel = null; commit();
  }

  function colsMenu(btn) {
    const el = stage.querySelector(`.rframe[data-id="${sel}"]`);
    const tbl = el && el.querySelector('.rf-body table');
    if (!tbl) return;
    const head = tbl.tHead ? tbl.tHead.rows[0] : tbl.rows[0];
    const cols = fr(sel).cols || [];
    let col = 0;
    const items = [...head.cells].map(cell => { const c = col; col += cell.colSpan || 1; return (cell.colSpan || 1) === 1 ? { c, name: cell.textContent.trim() || '#' } : null; }).filter(Boolean);
    const m = document.createElement('div');
    m.className = 'rcols';
    m.innerHTML = items.map(it => `<label><input type="checkbox" data-c="${it.c}" ${cols.includes(it.c) ? '' : 'checked'}> ${esc(it.name)}</label>`).join('');
    const tb = btn.closest('.rtool');
    tb.appendChild(m);
    m.addEventListener('change', e => {
      const c = +e.target.dataset.c, cfg = fr(sel);
      cfg.cols = (cfg.cols || []).filter(x => x !== c);
      if (!e.target.checked) cfg.cols.push(c);
      if (!cfg.cols.length) delete cfg.cols;
      hideColsLive(el, cfg.cols || []);
      A.save();
    });
  }
  function hideColsLive(el, cols) { el.querySelectorAll('.rf-body table td, .rf-body table th').forEach(c => { c.style.display = ''; }); hideCols(el, cols); }

  /* in-place text editing (double-click) */
  function openEdit(id) {
    closeEdit(true);
    editing = id;
    render(stage, true);
    select(id);
    const el = stage.querySelector(`.rframe[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('editing');
    const body = el.querySelector('.rf-body'), t = el.querySelector('.rf-t');
    body.contentEditable = 'true';
    if (t) t.contentEditable = 'true';
    el.dataset.orig = body.innerHTML;
    el.dataset.origT = t ? t.textContent : '';
    (body).focus();
  }
  function closeEdit(save) {
    if (!editing || !stage) { editing = null; return; }
    const el = stage.querySelector(`.rframe[data-id="${editing}"]`);
    const id = editing;
    editing = null;
    if (el && save) {
      const cfg = fr(id), b = blocks.find(x => x.id === id);
      const body = el.querySelector('.rf-body'), t = el.querySelector('.rf-t');
      if (body.innerHTML !== el.dataset.orig) cfg.html = body.innerHTML;
      if (t && t.textContent !== el.dataset.origT) { const v = t.textContent.trim(); if (b && !b.custom && v === (b.title || '')) delete cfg.title; else cfg.title = v; }
    }
    commit();
  }

  function commit() { A.save(); if (stage) { render(stage, true); select(sel); } A.onChange && A.onChange(); }

  /* ---- move / resize with snapping ---- */
  let drag = null;
  function guides(pageEl, xs, ys) {
    pageEl.querySelectorAll('.rguide').forEach(g => g.remove());
    xs.forEach(x => pageEl.insertAdjacentHTML('beforeend', `<div class="rguide v" style="left:${x}mm"></div>`));
    ys.forEach(y => pageEl.insertAdjacentHTML('beforeend', `<div class="rguide h" style="top:${y}mm"></div>`));
  }
  function snapLines(pageEl, id) {
    const xs = [PG.ml, PG.w - PG.mr, PG.w / 2], ys = [+pageEl.dataset.p === 0 ? PG.mt0 : PG.mt, PG.h - PG.mb];
    pageEl.querySelectorAll('.rframe').forEach(o => {
      if (o.dataset.id === id) return;
      const l = o.offsetLeft / MM, t = o.offsetTop / MM, w = o.offsetWidth / MM, h = o.offsetHeight / MM;
      xs.push(l, l + w, l + w / 2); ys.push(t, t + h, t + h + GAP, t - GAP);
    });
    return { xs, ys };
  }
  const near = (v, list, tol) => { let best = null; list.forEach(c => { if (Math.abs(c - v) <= tol && (best === null || Math.abs(c - v) < Math.abs(best - v))) best = c; }); return best; };

  function pageAt(cx, cy) {
    return [...stage.querySelectorAll('.rpage')].find(p => { const r = p.getBoundingClientRect(); return cy >= r.top - 20 && cy <= r.bottom + 20 && cx >= r.left - 60 && cx <= r.right + 60; });
  }

  function bind(el) {
    // clicking anywhere outside the frame being edited ends the editing (and keeps the text)
    document.addEventListener('pointerdown', e => {
      if (editing && stage && !stage.contains(e.target)) closeEdit(true);
    }, true);
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !stage) return;
      if (e.target.closest('.rtool')) return;
      const frame = e.target.closest('.rframe');
      if (editing && frame && frame.dataset.id === editing) return;      // typing inside the edited frame
      if (editing) closeEdit(true);
      if (!frame) { if (e.target.closest('.rpage')) select(null); return; }
      const id = frame.dataset.id;
      if (sel !== id) select(id);
      const fresh = stage.querySelector(`.rframe[data-id="${id}"]`);
      const h = e.target.closest('.hd');
      const r = fresh.getBoundingClientRect();
      drag = { id, el: fresh, mode: h ? h.dataset.h : 'move', sx: e.clientX, sy: e.clientY,
        x0: fresh.offsetLeft / MM, y0: fresh.offsetTop / MM, w0: fresh.offsetWidth / MM, gx: (e.clientX - r.left) / MM, gy: (e.clientY - r.top) / MM, moved: false };
      fresh.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = (e.clientX - drag.sx) / MM, dy = (e.clientY - drag.sy) / MM;
      if (!drag.moved && Math.hypot(dx, dy) < 0.8) return;
      drag.moved = true;
      stage.querySelectorAll('.rtool').forEach(t => { t.style.visibility = 'hidden'; });
      const fEl = drag.el;
      if (drag.mode === 'move') {
        const pg = pageAt(e.clientX, e.clientY) || fEl.closest('.rpage');
        if (fEl.parentElement !== pg) pg.appendChild(fEl);
        const pr = pg.getBoundingClientRect();
        let x = (e.clientX - pr.left) / MM - drag.gx, y = (e.clientY - pr.top) / MM - drag.gy;
        const w = fEl.offsetWidth / MM, h = fEl.offsetHeight / MM;
        const L = snapLines(pg, drag.id), gx = [], gy = [];
        const tol = 1.6;
        let s;
        if ((s = near(x, L.xs, tol)) !== null) { x = s; gx.push(s); }
        else if ((s = near(x + w, L.xs, tol)) !== null) { x = s - w; gx.push(s); }
        else if ((s = near(x + w / 2, L.xs, tol)) !== null) { x = s - w / 2; gx.push(s); }
        if ((s = near(y, L.ys, tol)) !== null) { y = s; gy.push(s); }
        else if ((s = near(y + h, L.ys, tol)) !== null) { y = s - h; gy.push(s); }
        x = Math.max(0, Math.min(PG.w - w, x)); y = Math.max(0, Math.min(PG.h - 8, y));
        fEl.style.left = x + 'mm'; fEl.style.top = y + 'mm';
        drag.res = { p: +pg.dataset.p, x, y };
        guides(pg, gx, gy);
      } else {
        const pg = fEl.closest('.rpage');
        let x = drag.x0, w = drag.w0;
        if (drag.mode === 'e') w = drag.w0 + dx;
        else { x = drag.x0 + dx; w = drag.w0 - dx; }
        const L = snapLines(pg, drag.id), gx = [];
        let s;
        if (drag.mode === 'e' && (s = near(x + w, L.xs, 1.6)) !== null) { w = s - x; gx.push(s); }
        if (drag.mode === 'w' && (s = near(x, L.xs, 1.6)) !== null) { w += x - s; x = s; gx.push(s); }
        w = Math.max(30, Math.min(PG.w - x, w)); x = Math.max(0, x);
        fEl.style.left = x + 'mm'; fEl.style.width = w + 'mm';
        drag.res = { x, w };
        guides(pg, gx, []);
      }
    });
    const end = () => {
      if (!drag) return;
      const d = drag; drag = null;
      stage.querySelectorAll('.rguide').forEach(g => g.remove());
      if (!d.moved) { stage.querySelectorAll('.rtool').forEach(t => { t.style.visibility = ''; }); return; }
      const cfg = fr(d.id);
      if (d.res) Object.keys(d.res).forEach(k => { cfg[k] = Math.round(d.res[k] * 10) / 10; });
      commit();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', e => {
      const frame = e.target.closest('.rframe');
      if (!frame) return;
      const b = blocks.find(x => x.id === frame.dataset.id);
      if (b && b.fig === undefined) openEdit(frame.dataset.id);
    });
    el.addEventListener('click', e => {
      const btn = e.target.closest('.rtool button');
      if (btn) toolAction(btn.dataset.t, btn);
    });
    document.addEventListener('keydown', e => {
      if (!stage || !sel || editing || !stage.isConnected || !stage.offsetParent) return;
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
      const cfg = fr(sel);
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeFrame(sel); }
      else if (e.key === 'Escape') select(null);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') cfg.x -= step; if (e.key === 'ArrowRight') cfg.x += step;
        if (e.key === 'ArrowUp') cfg.y -= step; if (e.key === 'ArrowDown') cfg.y += step;
        commit();
      }
    });
  }

  /* ================================================================== */
  /* Side panel                                                          */
  /* ================================================================== */
  function panelHTML() {
    if (!blocks.length && A.result()) { built = content(); blocks = built.blocks; }
    const R = rep();
    const removed = blocks.filter(b => fr(b.id).hidden).length;
    return `<div class="hint"><b>Click</b> an element to select it · <b>drag</b> it to move it, also onto another page (guides snap it to the margins and the other elements) · <b>drag its side handles</b> to resize it · <b>double-click</b> to edit its text · <b>Delete</b> to remove it.<br><br>
      Nothing can overlap: an element dropped on another one makes room below, and moves to the next page if needed.<br><br>
      The drawings show the labels exactly as you arranged them in the Type, Loading and Settings tabs.</div>
      <div class="rp-actions"><button class="btn" data-r="text">+ Text block</button><button class="btn" data-r="page">+ Page</button><button class="btn" data-r="delpage" ${R.pages > 1 ? '' : 'disabled'}>− Last page</button></div>
      <div class="rp-actions"><button class="btn" data-r="auto">Auto-arrange</button>${removed ? `<button class="btn" data-r="restore">Restore removed elements (${removed})</button>` : ''}<button class="btn" data-r="reset">Reset the report</button></div>
      <div class="rp-actions"><button class="btn primary big" data-r="print">Print / save as PDF</button></div>
      <p class="muted" style="font-size:12px">${R.pages} page${R.pages > 1 ? 's' : ''} · A4 portrait</p>`;
  }
  function panelAction(a, id) {
    const R = rep();
    if (a === 'restore') { blocks.forEach(b => { const c = fr(b.id); if (c.hidden) { delete c.hidden; delete c.x; delete c.y; delete c.p; } }); }
    else if (a === 'vis') { const cfg = fr(id); if (cfg.hidden) { delete cfg.hidden; delete cfg.x; delete cfg.y; delete cfg.p; } else cfg.hidden = true; }
    else if (a === 'go') { select(id); const el = stage && stage.querySelector(`.rframe[data-id="${id}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); A.onChange && A.onChange(); return; }
    else if (a === 'del') { removeFrame(id); return; }
    else if (a === 'text') { const nid = 'txt-' + Math.random().toString(36).slice(2, 8); R.custom.push({ id: nid, type: 'text' }); sel = nid; }
    else if (a === 'page') R.pages += 1;
    else if (a === 'delpage') {
      const last = R.pages - 1;
      blocks.forEach(b => { const c = fr(b.id); if (!c.hidden && (c.p || 0) === last) { c.p = Math.max(0, last - 1); } });
      R.pages = Math.max(1, last);
    } else if (a === 'auto') {
      const vis = blocks.filter(b => !fr(b.id).hidden)
        .sort((x, y) => (fr(x.id).p - fr(y.id).p) || (fr(x.id).y - fr(y.id).y) || (fr(x.id).x - fr(y.id).x));
      R.pages = 1;
      autoLayout(vis, false);
    } else if (a === 'reset') { const s = S(); s.rep = { frames: {}, custom: R.custom, pages: 1 }; }
    commit();
  }

  /* ================================================================== */
  /* Printing                                                            */
  /* ================================================================== */
  function buildForPrint(target) {
    const keepEditing = editing; editing = null;
    render(target, false);
    editing = keepEditing;
  }

  window.CLPReport = {
    init(api) { A = api; return api; },
    bind, render, showEditor, hideEditor, panelHTML, panelAction, buildForPrint, select,
    get selected() { return sel; },
  };
})();
