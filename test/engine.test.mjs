import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CLP = require('../js/engine.js');

const square = { stacking: 'square', turnGapPct: 0, layerGapPct: 0, startSide: 'inner' };
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

const drumProject = (sections, extra = {}) => ({
  carrier: { type: 'drum', maxLoad: 100, drum: { barrelDiameter: 2, flangeDiameter: 4, flangeThickness: 0, freeboard: 0, bays: [{ name: 'A', width: 1 }] }, ...extra },
  winding: square,
  cables: [{ id: 'c1', name: 'Test 100', od: 100, weight: 10, mbr: 0.5 }],
  sections,
});

test('drum capacity — square winding, analytic value', () => {
  const p = drumProject([]);
  const comp = CLP.compartments(p.carrier)[0];
  // 10 turns per layer, 10 layers, centre radius 1.05 + 0.1 i
  const expected = 10 * 2 * Math.PI * (10 * 1.05 + 0.1 * 45);
  near(CLP.capacity(comp, p.cables[0], square), expected, 1e-4);
});

test('tank capacity — square coiling, analytic value', () => {
  const carrier = { type: 'tank', freeboard: 0, rings: [
    { name: 'Core', diameter: 4, thickness: 0, height: 1 },
    { name: 'Wall', diameter: 6, thickness: 0, height: 1 },
  ] };
  const comp = CLP.compartments(carrier)[0];
  near(comp.acrossMin, 2); near(comp.acrossMax, 3);
  // 10 turns per layer at r = 2.05 + 0.1 j, 10 layers
  const perLayer = 2 * Math.PI * (10 * 2.05 + 0.1 * 45);
  near(CLP.capacity(comp, { od: 100 }, square), 10 * perLayer, 1e-4);
});

test('sections are loaded in order and end where expected', () => {
  const layer1 = 10 * 2 * Math.PI * 1.05; // length of the first drum layer
  const p = drumProject([
    { id: 's1', name: 'S1', cableId: 'c1', length: layer1, compartment: 0 },
    { id: 's2', name: 'S2', cableId: 'c1', length: 100, compartment: 0 },
  ]);
  const r = CLP.compute(p);
  const [s1, s2] = r.sections;
  assert.equal(s1.last.layer, 1);
  assert.equal(s1.last.turn, 10);
  near(s1.last.frac, 1, 1e-6);
  assert.equal(s2.first.layer, 2);
  assert.equal(s2.first.turn, 1);
  near(s2.placed, 100);
  near(r.totals.weight, (layer1 + 100) * 10 / 1000, 1e-6);
});

test('overflow and weight checks', () => {
  const p = drumProject([{ id: 's1', name: 'Too long', cableId: 'c1', length: 5000, compartment: 0 }]);
  p.carrier.maxLoad = 5;
  const r = CLP.compute(p);
  assert.ok(r.sections[0].overflow > 4000);
  assert.equal(r.totals.status, 'fail');
  assert.ok(r.checks.some(c => /does not fit/.test(c.text)));
  assert.ok(r.checks.some(c => /exceeds the carrier capacity/.test(c.text)));
});

test('MBR check on the barrel', () => {
  const p = drumProject([{ id: 's1', name: 'S1', cableId: 'c1', length: 10, compartment: 0 }]);
  p.cables[0].mbr = 1.5;
  const r = CLP.compute(p);
  assert.ok(r.checks.some(c => /bend radius/.test(c.text) && c.level === 'fail'));
});

test('nested winding holds more than square winding', () => {
  const p = drumProject([]);
  const comp = CLP.compartments(p.carrier)[0];
  const sq = CLP.capacity(comp, p.cables[0], square);
  const ne = CLP.capacity(comp, p.cables[0], { ...square, stacking: 'nested' });
  assert.ok(ne > sq, `${ne} > ${sq}`);
});

test('multi-ring tank gives one compartment per pair of rings', () => {
  const carrier = { type: 'turntable', freeboard: 0.2, rings: [
    { name: 'Core', diameter: 8, thickness: 20, height: 5 },
    { name: 'Inner ring', diameter: 16, thickness: 20, height: 4 },
    { name: 'Outer wall', diameter: 26, thickness: 20, height: 5 },
  ] };
  const comps = CLP.compartments(carrier);
  assert.equal(comps.length, 2);
  near(comps[0].acrossMin, 4.02); near(comps[0].acrossMax, 8);
  near(comps[1].acrossMin, 8.02); near(comps[1].acrossMax, 13);
  near(comps[0].stackMax, 3.8); near(comps[1].stackMax, 3.8);
});

test('drum with intermediate flange: two bays', () => {
  const carrier = { type: 'drum', drum: { barrelDiameter: 2, flangeDiameter: 4, flangeThickness: 50, freeboard: 0.1, bays: [{ width: 1 }, { width: 0.5 }] } };
  const comps = CLP.compartments(carrier);
  assert.equal(comps.length, 2);
  near(comps[1].acrossMin, 1.05); near(comps[1].acrossMax, 1.55);
  near(comps[0].stackMax, 1.9);
});

test('turn gap in % of OD', () => {
  const comp = CLP.compartments({ type: 'drum', drum: { barrelDiameter: 2, flangeDiameter: 4, flangeThickness: 0, freeboard: 0, bays: [{ width: 1.05 }] } })[0];
  // pitch = 0.1 × 1.05 = 0.105 m → 10 turns in 1.05 m (last turn needs only 0.1 m)
  const r = CLP.fillCompartment(comp, [{ length: 1e6, d: 0.1 }], { ...square, turnGapPct: 5 });
  assert.equal(r.turnsPerLayer[1], 10);
});
