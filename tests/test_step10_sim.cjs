// Runtime simulation test for Step 10: Mission Briefing & Debrief Modals
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
  'hud-h2o-val', 'hud-h2o-bar', 'hud-h2o-rate', 'hud-bat-val', 'hud-bat-bar', 'hud-pnr-badge',
  'briefing-modal', 'debrief-modal', 'debrief-dist', 'debrief-stops', 'debrief-slope',
  'debrief-rad', 'debrief-margins'
].forEach(id => {
  domElements[id] = createMockElement(id);
});
domElements['briefing-modal'].classList.add('open');

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

const html = fs.readFileSync('c:\\Users\\DELL\\Desktop\\verify\\martian-map-main\\index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const inlineJs = scripts[scripts.length - 1][1];
eval(inlineJs);

console.log('--- RUNNING STEP 10 VERIFICATION TEST SUITE ---\n');

// Test 1: Opening Briefing Modal & Begin Marswalk
console.log('[Test 1] Verify Opening Mission Briefing Modal & Begin Marswalk:');
assert(domElements['briefing-modal'].classList.contains('open'), 'Briefing modal should start open');
assert(!domElements['debrief-modal'].classList.contains('open'), 'Debrief modal should start closed');
beginMarswalk();
assert(!domElements['briefing-modal'].classList.contains('open'), 'beginMarswalk() should close briefing modal');
console.log('  ✔ Opening briefing modal closes cleanly on Begin Marswalk');

// Test 2: Full Traverse Loop Triggers Closing Debrief Modal
console.log('\n[Test 2] Verify Complete Traverse Loop Triggers Debrief Modal:');
nextStep(); // Stop 1
nextStep(); // Stop 2
nextStep(); // Stop 3
assert(!domElements['debrief-modal'].classList.contains('open'), 'Debrief should not open before returning to Base Camp');
nextStep(); // Return to Base Camp (Stop 0)
assert(domElements['debrief-modal'].classList.contains('open'), 'Returning to Base Camp after science stops should open Debrief modal');
console.log('  ✔ Returning to Base Camp automatically opens Mission Debrief modal');

// Test 3: Verify Debrief Telemetry Fields
console.log('\n[Test 3] Verify Mission Debrief Summary Fields:');
const dDist = domElements['debrief-dist'].textContent;
const dStops = domElements['debrief-stops'].textContent;
const dSlope = domElements['debrief-slope'].textContent;
const dRad = domElements['debrief-rad'].textContent;
const dMargins = domElements['debrief-margins'].innerHTML;
assert(dDist.includes('km'), `Expected km in debrief distance, got: ${dDist}`);
assert(dStops.includes('3 Science Targets Cataloged'), `Expected 3 science targets, got: ${dStops}`);
assert(dSlope.includes('°'), `Expected slope degrees in debrief, got: ${dSlope}`);
assert(dRad.includes('µSv'), `Expected µSv in debrief radiation, got: ${dRad}`);
assert(dMargins.includes('PNR NOMINAL'), `Expected PNR NOMINAL in debrief margins, got: ${dMargins}`);
console.log(`  Distance: ${dDist}`);
console.log(`  Targets: ${dStops} | Max Slope: ${dSlope} | RAD: ${dRad}`);
console.log('  ✔ Debrief summary card populated accurately');

// Test 4: Close Debrief & Reopen Briefing
console.log('\n[Test 4] Verify Close Debrief & Reopen Briefing Controls:');
closeDebriefModal();
assert(!domElements['debrief-modal'].classList.contains('open'), 'closeDebriefModal() should close debrief');
openBriefingModal();
assert(domElements['briefing-modal'].classList.contains('open'), 'openBriefingModal() should reopen briefing');
console.log('  ✔ Modal open/close controls verified');

console.log('\n=== ALL STEP 10 VERIFICATION TESTS PASSED (100%) ===');
