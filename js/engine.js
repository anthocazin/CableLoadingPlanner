/*
 * Cable Loading Planner — calculation engine
 * Turn-by-turn simulation of cable loaded onto a turntable (carousel), a static tank or a cable drum.
 * Pure functions, no DOM. Works in the browser (window.CLP) and in Node (module.exports).
 *
 * Units used internally: metres, kilograms, tonnes. Cable OD and gaps are entered in mm.
 */
(function (root) {
  'use strict';

  const EPS = 1e-9;
  const SQ3_2 = Math.sqrt(3) / 2;
  const TWO_PI = 2 * Math.PI;

  const CARRIER_TYPES = {
    turntable: { label: 'Turntable (carousel)', kind: 'coil' },
    tank: { label: 'Static tank', kind: 'coil' },
    drum: { label: 'Cable drum (reel)', kind: 'drum' },
  };

  /* ------------------------------------------------------------------ */
  /* Geometry: split the carrier into compartments                       */
  /* ------------------------------------------------------------------ */
  /*
   * Coil carriers (turntable / tank): a list of concentric rings ("cerces"), from the core outwards.
   *   ring = { name, diameter (inner face Ø, m), thickness (m), height (m) }
   *   compartment k lies between the outer face of ring k and the inner face of ring k+1.
   *   across = radius (m), stack = height above floor (m).
   * Drum: barrel + flanges ("joues"); intermediate flanges split the width into bays.
   *   drum = { barrelDiameter, flangeDiameter, flangeThickness (m), freeboard, bays: [{ name, width }] }
   *   across = axial position from the inner face of the first flange (m), stack = radius (m).
   */
  function compartments(carrier) {
    const kind = (CARRIER_TYPES[carrier.type] || CARRIER_TYPES.turntable).kind;
    const out = [];
    if (kind === 'coil') {
      const rings = (carrier.rings || []).slice().sort((a, b) => num(a.diameter) - num(b.diameter));
      const fb = num(carrier.freeboard, 0);
      for (let k = 0; k < rings.length - 1; k++) {
        const a = rings[k], b = rings[k + 1];
        const rMin = num(a.diameter) / 2 + num(a.thickness); // thickness in m
        const rMax = num(b.diameter) / 2;
        const wallH = Math.min(num(a.height), num(b.height));
        out.push({
          index: out.length,
          kind,
          name: (a.name || 'Ring ' + (k + 1)) + ' → ' + (b.name || 'Ring ' + (k + 2)),
          label: 'Compartment ' + (out.length + 1),
          acrossMin: rMin, acrossMax: rMax,
          stackMin: 0, stackMax: wallH - fb,
          wallHeight: wallH,
          innerRing: k, outerRing: k + 1,
          valid: rMax > rMin + EPS && wallH - fb > EPS,
        });
      }
    } else {
      const d = carrier.drum || {};
      const tFl = num(d.flangeThickness); // m
      const Rb = num(d.barrelDiameter) / 2;
      const Rf = num(d.flangeDiameter) / 2;
      const fb = num(d.freeboard, 0);
      let x = 0;
      (d.bays || []).forEach((bay, k) => {
        const w = num(bay.width);
        out.push({
          index: k,
          kind,
          name: bay.name || 'Bay ' + (k + 1),
          label: 'Bay ' + (k + 1),
          acrossMin: x, acrossMax: x + w,
          stackMin: Rb, stackMax: Rf - fb,
          flangeRadius: Rf,
          valid: w > EPS && Rf - fb > Rb + EPS,
        });
        x += w + tFl;
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Turn placer: places one turn after the other, layer after layer     */
  /* ------------------------------------------------------------------ */
  function makePlacer(comp, winding) {
    const nested = winding.stacking === 'nested';
    const gapT = num(winding.turnGap, 0) / 1000;
    const gapL = num(winding.layerGap, 0) / 1000;
    // coil: 'inner' → first layer starts at the inner ring and goes outwards; drum: 'left' (min) / 'right' (max)
    const startAtMin = comp.kind === 'coil' ? winding.startSide !== 'outer' : winding.startSide !== 'right';

    const st = {
      layer: 1,
      dir: startAtMin ? 1 : -1,
      edge: startAtMin ? comp.acrossMin : comp.acrossMax,
      turnInLayer: 0,
      layerCenter: null, // stack position of the centre of the current layer
      layerMaxD: 0,
      prevCenter: null,
      prevMaxD: 0,
    };

    function newLayer() {
      st.prevCenter = st.layerCenter;
      st.prevMaxD = st.layerMaxD;
      st.layer += 1;
      st.dir = -st.dir;
      st.edge = st.dir > 0 ? comp.acrossMin : comp.acrossMax;
      st.turnInLayer = 0;
      st.layerCenter = null;
      st.layerMaxD = 0;
      st.nestOffsetPending = nested && st.layer % 2 === 0; // every other layer sits half a pitch in
    }

    function place(d) {
      for (let guard = 0; guard < 3; guard++) {
        let edge = st.edge;
        if (st.turnInLayer === 0 && st.nestOffsetPending) edge += st.dir * d / 2; // sits in the groove
        const fits = st.dir > 0 ? edge + d <= comp.acrossMax + EPS : edge - d >= comp.acrossMin - EPS;
        if (!fits) {
          if (st.turnInLayer === 0 && guard > 0) return null; // compartment narrower than the cable
          if (st.turnInLayer === 0 && st.layer === 1) return null;
          newLayer();
          continue;
        }
        let center;
        if (st.layer === 1 || st.prevCenter === null) center = comp.stackMin + d / 2;
        else center = st.prevCenter + (nested ? SQ3_2 : 1) * (st.prevMaxD + d) / 2 + gapL;
        if (st.turnInLayer > 0 && st.layerCenter !== null) center = Math.max(center, st.layerCenter);
        if (center + d / 2 > comp.stackMax + EPS) return null; // full
        const across = edge + st.dir * d / 2;
        st.edge = edge + st.dir * (d + gapT);
        st.nestOffsetPending = false;
        st.turnInLayer += 1;
        st.layerCenter = center;
        st.layerMaxD = Math.max(st.layerMaxD, d);
        const radius = comp.kind === 'coil' ? across : center;
        return { layer: st.layer, turn: st.turnInLayer, dir: st.dir, across, stack: center, d, radius, circ: TWO_PI * radius };
      }
      return null;
    }
    return { place, state: st };
  }

  /* ------------------------------------------------------------------ */
  /* Fill one compartment with an ordered list of items                  */
  /* item = { key, length (m), d (m), w (kg/m) }                          */
  /* ------------------------------------------------------------------ */
  function fillCompartment(comp, items, winding, opts) {
    opts = opts || {};
    const placer = makePlacer(comp, winding);
    const turns = [];
    const res = items.map(() => ({ placed: 0, overflow: 0, first: null, last: null, minRadius: Infinity, minLayer: Infinity, maxLayer: 0, momentStack: 0 }));
    let open = null; // turn partially used
    let full = !comp.valid;

    items.forEach((it, i) => {
      const r = res[i];
      let remaining = Math.max(0, num(it.length));
      const d = num(it.d);
      if (d <= 0) { r.overflow = remaining; return; }
      while (remaining > 1e-7) {
        if (full) { r.overflow += remaining; break; }
        if (!open || Math.abs(open.d - d) > 1e-9) {
          const t = opts.maxTurns && turns.length >= opts.maxTurns ? null : placer.place(d);
          if (!t) { full = true; continue; }
          t.used = 0; t.segs = [];
          open = t;
          turns.push(t);
        }
        const avail = open.circ - open.used;
        const use = Math.min(avail, remaining);
        const seg = { item: i, from: open.used / open.circ, to: (open.used + use) / open.circ, length: use, kp: r.placed };
        open.segs.push(seg);
        open.used += use;
        remaining -= use;
        r.placed += use;
        r.momentStack += use * open.stack;
        if (!r.first) r.first = { layer: open.layer, turn: open.turn, frac: seg.from, across: open.across, stack: open.stack, dir: open.dir, radius: open.radius };
        r.last = { layer: open.layer, turn: open.turn, frac: seg.to, across: open.across, stack: open.stack, dir: open.dir, radius: open.radius, d: open.d };
        r.minRadius = Math.min(r.minRadius, open.radius);
        r.minLayer = Math.min(r.minLayer, open.layer);
        r.maxLayer = Math.max(r.maxLayer, open.layer);
        if (open.used >= open.circ - 1e-7) open = null;
      }
    });

    const layers = turns.length ? turns[turns.length - 1].layer : 0;
    let top = comp.stackMin;
    turns.forEach(t => { top = Math.max(top, t.stack + t.d / 2); });
    const turnsPerLayer = {};
    turns.forEach(t => { turnsPerLayer[t.layer] = (turnsPerLayer[t.layer] || 0) + 1; });
    return { turns, items: res, layers, top, turnsPerLayer, full };
  }

  /* Maximum length of one cable in an empty (or partly loaded) compartment */
  function capacity(comp, cable, winding, preItems) {
    const items = (preItems || []).slice();
    const BIG = 1e7; // 10 000 km — far more than any carrier
    items.push({ key: '__cap', length: BIG, d: num(cable.od) / 1000, w: num(cable.weight) });
    const r = fillCompartment(comp, items, winding);
    return r.items[items.length - 1].placed;
  }

  /* ------------------------------------------------------------------ */
  /* Whole project                                                       */
  /* ------------------------------------------------------------------ */
  function compute(project) {
    const carrier = project.carrier || {};
    const winding = project.winding || {};
    const comps = compartments(carrier);
    const cables = project.cables || [];
    const cableById = {};
    cables.forEach(c => { cableById[c.id] = c; });
    const sections = project.sections || [];
    const checks = [];

    const perComp = comps.map(c => ({ comp: c, sectionIdx: [], items: [] }));
    const secRes = sections.map((s, i) => ({ index: i, section: s, cable: cableById[s.cableId] || null, compIndex: s.compartment | 0 }));

    secRes.forEach(sr => {
      const s = sr.section;
      if (!sr.cable) { checks.push(chk('fail', `Section "${s.name}": no cable type selected.`)); return; }
      const pc = perComp[sr.compIndex];
      if (!pc) { checks.push(chk('fail', `Section "${s.name}": compartment ${sr.compIndex + 1} does not exist.`)); return; }
      pc.sectionIdx.push(sr.index);
      pc.items.push({ key: s.id, length: num(s.length), d: num(sr.cable.od) / 1000, w: num(sr.cable.weight) });
    });

    let totalLength = 0, totalWeight = 0, momentZ = 0;
    const compRes = perComp.map(pc => {
      const c = pc.comp;
      if (!c.valid) checks.push(chk('fail', `${c.label} (${c.name}): invalid geometry — check diameters, widths, heights and freeboard.`));
      const fill = fillCompartment(c, pc.items, winding);
      let weight = 0, length = 0, mz = 0;
      pc.sectionIdx.forEach((si, j) => {
        const r = fill.items[j];
        const sr = secRes[si];
        Object.assign(sr, r);
        sr.weight = r.placed * pc.items[j].w / 1000; // t
        sr.requested = pc.items[j].length;
        weight += sr.weight; length += r.placed;
        mz += r.momentStack * pc.items[j].w / 1000;
      });
      // remaining capacity with the last loaded cable (or the first cable of the library if empty)
      const lastSec = pc.sectionIdx.length ? secRes[pc.sectionIdx[pc.sectionIdx.length - 1]] : null;
      const refCable = lastSec ? lastSec.cable : cables[0];
      let remaining = 0;
      if (refCable && c.valid && !fill.full) remaining = capacity(c, refCable, winding, pc.items);
      const emptyCap = refCable && c.valid ? capacity(c, refCable, winding) : 0;
      const stackRange = c.stackMax - c.stackMin;
      totalLength += length; totalWeight += weight;
      if (c.kind === 'coil') momentZ += mz;
      const firstD = pc.items.length ? pc.items[0].d : (refCable ? num(refCable.od) / 1000 : 0);
      return {
        comp: c, fill, weight, length, remaining, refCable, emptyCap,
        used: fill.top - c.stackMin,
        usedPct: stackRange > 0 ? (fill.top - c.stackMin) / stackRange : 0,
        lengthPct: length + remaining > 0 ? length / (length + remaining) : 0,
        vcg: c.kind === 'coil' && weight > 0 ? mz / weight : null,
        turnsLayer1: fill.turnsPerLayer[1] || estimateTurns(c, firstD, winding),
        sectionIdx: pc.sectionIdx,
      };
    });

    // ---------------- checks ----------------
    secRes.forEach(sr => {
      if (!sr.cable || sr.placed === undefined) return;
      const s = sr.section, cab = sr.cable;
      if (sr.overflow > 0.01) checks.push(chk('fail', `Section "${s.name}" does not fit: ${fmt(sr.overflow, 0)} m of ${fmt(sr.requested, 0)} m cannot be loaded in ${compRes[sr.compIndex].comp.label}.`));
      const mbr = num(cab.mbr);
      if (mbr > 0 && sr.placed > 0) {
        if (sr.minRadius + EPS < mbr) checks.push(chk('fail', `Section "${s.name}": minimum bend radius on the carrier ${fmt(sr.minRadius, 2)} m < cable MBR ${fmt(mbr, 2)} m.`));
        else if (sr.minRadius < mbr * 1.1) checks.push(chk('warn', `Section "${s.name}": bend radius ${fmt(sr.minRadius, 2)} m is within 10 % of the MBR (${fmt(mbr, 2)} m).`));
      }
      const maxL = num(cab.maxLayers, 0);
      if (maxL > 0 && sr.placed > 0) {
        const above = compRes[sr.compIndex].fill.layers - sr.minLayer;
        if (above > maxL) checks.push(chk('fail', `Section "${s.name}": ${above} layers on top of its lowest layer > crush limit of ${maxL} layers (${cab.name}).`));
      }
    });
    const maxLoad = num(carrier.maxLoad, 0);
    if (maxLoad > 0) {
      const ratio = totalWeight / maxLoad;
      if (ratio > 1) checks.push(chk('fail', `Cable weight ${fmt(totalWeight, 1)} t exceeds the carrier capacity of ${fmt(maxLoad, 1)} t (${fmt(ratio * 100, 0)} %).`));
      else if (ratio > 0.95) checks.push(chk('warn', `Cable weight is ${fmt(ratio * 100, 1)} % of the carrier capacity.`));
    }
    compRes.forEach(cr => {
      if (cr.comp.valid && cr.fill.full && cr.sectionIdx.length) checks.push(chk('warn', `${cr.comp.label} (${cr.comp.name}) is full.`));
    });
    if (!sections.length) checks.push(chk('info', 'No cable section in the loading plan yet — add one in "Loading plan".'));
    if (!checks.some(c => c.level === 'fail' || c.level === 'warn') && sections.length) checks.push(chk('ok', 'All sections fit. No weight, bend radius or crush issue detected.'));

    const tare = num(carrier.tare, 0);
    return {
      compartments: compRes,
      sections: secRes,
      checks,
      totals: {
        length: totalLength,
        weight: totalWeight,
        gross: totalWeight + tare,
        maxLoad,
        loadPct: maxLoad > 0 ? totalWeight / maxLoad : null,
        vcg: CARRIER_TYPES[carrier.type] && CARRIER_TYPES[carrier.type].kind === 'coil' && totalWeight > 0 ? momentZ / totalWeight : null,
        remaining: compRes.reduce((a, c) => a + c.remaining, 0),
        status: checks.some(c => c.level === 'fail') ? 'fail' : checks.some(c => c.level === 'warn') ? 'warn' : 'ok',
      },
    };
  }

  function estimateTurns(comp, d, winding) {
    if (!(d > 0)) return 0;
    const pitch = d + num(winding.turnGap, 0) / 1000;
    return Math.max(0, Math.floor((comp.acrossMax - comp.acrossMin - d) / pitch + 1 + EPS));
  }

  /* Capacity matrix: every cable type in every empty compartment */
  function capacityMatrix(project) {
    const comps = compartments(project.carrier || {});
    return (project.cables || []).map(cab => ({
      cable: cab,
      caps: comps.map(c => (c.valid && num(cab.od) > 0 ? capacity(c, cab, project.winding || {}) : 0)),
    }));
  }

  /* ------------------------------------------------------------------ */
  function num(v, dflt) {
    const n = typeof v === 'number' ? v : parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.'));
    return Number.isFinite(n) ? n : (dflt === undefined ? 0 : dflt);
  }
  function fmt(v, dec) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '–';
    return v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function chk(level, text) { return { level, text }; }

  const api = { CARRIER_TYPES, compartments, makePlacer, fillCompartment, capacity, capacityMatrix, compute, num, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CLP = api;
})(typeof window !== 'undefined' ? window : globalThis);
