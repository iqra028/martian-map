// Runtime simulation test for Step 8: Biophysical Life-Support Consumables HUD
const fs = require('fs');
const assert = require('assert');

// 1. Mock DOM
const domElements = {};
function createMockElement(id) {
  const el = {
    id: id,
    textContent: '',
    _html: '',
    value: '',
    src: '',
    className: '',
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); },
      contains(c) { return this._classes.has(c); }
    },
    children: [],
    appendChild(child) { el.children.push(child); return child; },
    get innerHTML() { return el._html || ''; },
    set innerHTML(val) {
      el._html = val;
      el.children = [];
      const idMatches = val.matchAll(/id="([^"]+)"/g);
      for (const m of idMatches) {
        const child = createMockElement(m[1]);
        el.children.push(child);
        domElements[m[1]] = child;
      }
      const inputMatches = val.matchAll(/<input[^>]+>/g);
      for (const im of inputMatches) {
        const str = im[0];
        const idM = str.match(/id="([^"]+)"/);
        const inputId = idM ? idM[1] : '';
        let child = el.children.find(c => c.id === inputId);
        if (!child) {
          child = createMockElement(inputId);
          el.children.push(child);
        }
        child._tag = 'input';
        child.checked = str.includes('checked');
        const valM = str.match(/value="([^"]+)"/);
        child.value = valM ? valM[1] : '';
      }
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return findById(el, sel.slice(1));
      if (sel === 'input') return findByTag(el, 'input');
      return null;
    },
    querySelectorAll: () => [],
    addEventListener(event, handler) {
      el.listeners = el.listeners || {};
      el.listeners[event] = handler;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 165 })
  };
  return el;
}

function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const res = findById(child, id);
    if (res) return res;
  }
  return null;
}

function findByTag(node, tag) {
  if (node._tag === tag) return node;
  for (const child of node.children || []) {
    const res = findByTag(child, tag);
    if (res) return res;
  }
  return null;
}

[
  'title', 'goal', 'status', 'warn', 'coords', 'elevation-info', 'dist', 'time',
  'waypoint-count', 'reserve-label', 'elev-range', 'elev-gain', 'max-slope',
  'stops-list', 'btn-add-mode', 'btn-reset', 'btn-abort', 'abort-panel',
  'abort-stats', 'chart-tooltip', 'res-banner', 'dust-haze-overlay',
  'worldview-panel', 'worldview-toggle', 'worldview-body', 'worldview-collapse-icon',
  'wv-layers-list', 'wv-vectors-list', 'env-temp', 'env-tau', 'env-solar',
  'env-vis', 'dust-readout', 'dust-slider', 'env-status-badge',
  'btn-prev-step', 'btn-next-step', 'btn-stepper-play', 'stepper-progress',
  'recon-card', 'recon-badge', 'recon-title', 'recon-coords', 'recon-elev',
  'recon-leg', 'recon-slope', 'recon-desc', 'recon-photo-curiosity',
  'recon-sub-curiosity', 'recon-photo-perseverance', 'recon-sub-perseverance',
  'rad-eva-dose', 'rad-margin-label', 'rad-bar-pct', 'rad-bar-fill', 'rad-status-badge',
  'hud-metabolic', 'hud-stop-metabolic', 'hud-o2-val', 'hud-o2-bar', 'hud-o2-rate',
  'hud-h2o-val', 'hud-h2o-bar', 'hud-h2o-rate', 'hud-bat-val', 'hud-bat-bar', 'hud-pnr-badge'
].forEach(id => {
  domElements[id] = createMockElement(id);
});

const mockCanvasCtx = {
  scale: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
  arc: () => {}, fillText: () => {}, setLineDash: () => {}, createLinearGradient: () => ({ addColorStop: () => {} })
};
domElements['elevation-canvas'] = {
  id: 'elevation-canvas',
  getContext: () => mockCanvasCtx,
  parentElement: { getBoundingClientRect: () => ({ width: 800, height: 165 }) },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 165 }),
  addEventListener: () => {}
};

global.document = {
  getElementById: (id) => domElements[id] || (domElements[id] = createMockElement(id)),
  createElement: (tag) => {
    const el = createMockElement('');
    el._tag = tag;
    return el;
  },
  querySelectorAll: () => []
};
global.window = global;
global.window.addEventListener = () => {};
global.fetch = () => Promise.resolve({ ok: false });
global.setInterval = () => 123;
global.clearInterval = () => {};
global.alert = () => {};

// 2. Mock Leaflet
const mockLayer = () => ({
  addTo: function() { return this; },
  remove: function() {},
  setOpacity: function() {},
  clearLayers: function() {},
  bindPopup: function() { return this; },
  openPopup: function() { return this; },
  on: function() { return this; },
  getLatLng: () => ({ lat: -5.06, lng: 137.46 }),
  bringToFront: function() { return this; }
});
global.L = {
  CRS: { EPSG4326: {} },
  map: () => ({
    on: function() {},
    addLayer: function() {},
    removeLayer: function() {},
    hasLayer: () => true,
    flyTo: function() {},
    getContainer: () => ({ style: {} })
  }),
  tileLayer: () => mockLayer(),
  layerGroup: () => mockLayer(),
  polygon: () => mockLayer(),
  rectangle: () => mockLayer(),
  polyline: () => mockLayer(),
  marker: () => mockLayer(),
  circleMarker: () => mockLayer(),
  divIcon: () => ({}),
  geoJSON: () => mockLayer(),
  control: { scale: () => mockLayer() }
};

// 3. Extract & Evaluate Inline Script
const html = fs.readFileSync('c:\\Users\\DELL\\Desktop\\verify\\martian-map-main\\index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const inlineJs = scripts[scripts.length - 1][1];
eval(inlineJs);

console.log('--- RUNNING STEP 8 VERIFICATION TEST SUITE ---\n');

// Test 1: Biophysical formula alignment with src/core/resource-model.js
console.log('[Test 1] Verify Biophysical Formulas (0.38g, 210kg, 0.56 m/s):');
const restW = calculateMetabolicPowerWatts(0.0, 0, 210);
const flatW = calculateMetabolicPowerWatts(0.56, 0, 210);
const slope10W = calculateMetabolicPowerWatts(0.56, 10, 210);
const slope15W = calculateMetabolicPowerWatts(0.56, 15, 210);
assert.strictEqual(restW, 160.0, 'Resting wattage should be 160 W');
assert(flatW > 280 && flatW < 305, `Flat walking wattage (~287-295W), got ${flatW.toFixed(1)}`);
assert(slope10W > 395 && slope10W < 425, `10 deg incline wattage (~408W), got ${slope10W.toFixed(1)}`);
assert(slope15W > 460 && slope15W < 540, `15 deg incline wattage, got ${slope15W.toFixed(1)}`);
console.log(`  Rest: ${restW.toFixed(0)}W | 0°: ${flatW.toFixed(1)}W | 10°: ${slope10W.toFixed(1)}W | 15°: ${slope15W.toFixed(1)}W`);
console.log('  ✔ Metabolic power model matches Mars 0.38g suited locomotion');

// Test 2: Oxygen, Water, Battery, and PNR calculations
console.log('\n[Test 2] Verify O2, H2O Sublimator, Battery, and PNR Margin:');
const o2Rate = calculateOxygenRateLitersPerMin(flatW);
const h2oRate = calculateWaterLossRateKgPerHour(flatW, 180);
const batDraw = calculateBatteryPowerWatts(180, 0);
assert(Math.abs(o2Rate - (flatW * 60 / 20100)) < 1e-6);
assert(Math.abs(h2oRate - ((flatW + 180) * 3600 / 2.83e6)) < 1e-6);
assert.strictEqual(batDraw, 180.0);
const pnrNom = calculatePnrMargin(1000, 100, 1200, 0.25);
assert.strictEqual(pnrNom.status, 'NOMINAL');
const pnrCrit = calculatePnrMargin(100, 100, 1200, 0.25);
assert.strictEqual(pnrCrit.status, 'CRITICAL_ABORT');
console.log(`  O2 Rate: ${o2Rate.toFixed(3)} L/min | H2O Rate: ${h2oRate.toFixed(3)} kg/hr | Battery: ${batDraw} W`);
console.log('  ✔ Consumable depletion & PNR state machine verified');

// Test 3: Initial HUD DOM Population
console.log('\n[Test 3] Verify Initial Life-Support HUD DOM Elements:');
const metText = domElements['hud-metabolic'].textContent;
const o2Text = domElements['hud-o2-val'].textContent;
const h2oText = domElements['hud-h2o-val'].textContent;
const batText = domElements['hud-bat-val'].textContent;
const pnrText = domElements['hud-pnr-badge'].textContent;
assert(metText.includes('W avg') && metText.includes('W peak'), `Unexpected metabolic text: ${metText}`);
assert(o2Text.includes('L (') && o2Text.includes('%)'), `Unexpected O2 text: ${o2Text}`);
assert(h2oText.includes('kg (') && h2oText.includes('%)'), `Unexpected H2O text: ${h2oText}`);
assert(batText.includes('Wh (') && batText.includes('h left)'), `Unexpected Battery text: ${batText}`);
assert(pnrText.includes('PNR NOMINAL'), `Expected NOMINAL PNR on baseline loop, got: ${pnrText}`);
console.log(`  Metabolic: ${metText}`);
console.log(`  O2: ${o2Text} | H2O: ${h2oText} | Battery: ${batText}`);
console.log(`  PNR: ${pnrText}`);
console.log('  ✔ Initial HUD populated accurately');

// Test 4: Stepper Navigation Updates Active Stop Slope Load & PNR
console.log('\n[Test 4] Verify Marswalk Stepper Updates Active Stop Load & PNR:');
setStep(2); // Boxwork Polygonal Ridge (16.4 deg)
const stop2Met = domElements['hud-stop-metabolic'].textContent;
assert(stop2Met.includes('16.4°'), `Expected 16.4° slope load at Stop 2, got: ${stop2Met}`);
console.log(`  Stop 2 Slope Load: ${stop2Met}`);
console.log('  ✔ Stepper sync updates Life-Support HUD in real time');

// Test 5: Route Extension Dynamically Drains Consumables & Updates PNR
console.log('\n[Test 5] Verify Route Modification Updates Consumables:');
const o2Before = parseFloat(o2Text);
ROUTE.push({
  id: 'extra_far',
  name: 'Extended Rim Survey',
  type: 'science',
  pos: [-5.1400, 137.5400],
  aheadSlopeDeg: 14.0,
  desc: 'Extended traverse test'
});
renderTraverse();
const o2After = parseFloat(domElements['hud-o2-val'].textContent);
assert(o2After < o2Before, `Expected O2 remaining to decrease (${o2After} < ${o2Before})`);
console.log(`  O2 Before: ${o2Before} L -> O2 After Extension: ${o2After} L`);
console.log('  ✔ Route modification dynamically updates life-support HUD');

console.log('\n=== ALL STEP 8 VERIFICATION TESTS PASSED (100%) ===');
