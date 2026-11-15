// Runtime simulation test for Step 7: Curiosity RAD Radiation Telemetry Card
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
  'rad-eva-dose', 'rad-margin-label', 'rad-bar-pct', 'rad-bar-fill', 'rad-status-badge'
].forEach(id => {
  domElements[id] = createMockElement(id);
});

// Canvas mock
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
global.window = { addEventListener: () => {}, devicePixelRatio: 1 };

// Leaflet Mock
global.L = {
  CRS: { EPSG4326: {} },
  map: () => ({
    setView: () => {}, on: () => {},
    addLayer: () => {}, removeLayer: () => {}, hasLayer: () => true,
    flyTo: () => {}, invalidateSize: () => {}, getContainer: () => ({ style: {} })
  }),
  tileLayer: () => ({ on: () => {}, addTo: () => ({}) }),
  layerGroup: () => {
    const lg = {
      layers: [], addLayer: () => lg, removeLayer: () => lg, clearLayers: () => lg, addTo: () => lg
    };
    return lg;
  },
  circleMarker: () => ({ bindPopup: () => ({}), setLatLng: () => {}, addTo: () => ({}) }),
  marker: () => ({ on: () => {}, addTo: () => ({}) }),
  polyline: () => ({ addTo: () => ({}) }),
  polygon: () => ({ bindPopup: () => ({ addTo: () => {} }) }),
  rectangle: () => ({ bindPopup: () => ({ addTo: () => {} }) }),
  divIcon: () => ({})
};

// Evaluate script
const html = fs.readFileSync('c:/Users/DELL/Desktop/verify/martian-map-main/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
eval(scriptMatch[1]);

console.log('--- RUNNING STEP 7 VERIFICATION TEST SUITE ---');

// Test 1: Authentic Curiosity RAD Baseline Values & Citation
console.log('\n[Test 1] Verify Curiosity RAD Baseline Values & Official Citations:');
assert(html.includes('0.67 mSv/day (28 &mu;Sv/hr)'), 'Curiosity RAD surface dose baseline present');
assert(html.includes('1.80 mSv/day (75 &mu;Sv/hr)'), 'Curiosity RAD in-transit cruise baseline present');
assert(html.includes('0.210 &plusmn; 0.040 mGy/day'), 'Absorbed dose rate present');
assert(html.includes('SwRI / Hassler et al., <em>Science</em> 2014'), 'Formal peer-reviewed citation present');
console.log('  ✔ Surface dose (0.67 mSv/day), cruise comparison (1.80 mSv/day), and SwRI/Science 2014 citation verified');

// Test 2: Dynamic Cumulative EVA Exposure Calculation
console.log('\n[Test 2] Verify Real-Time Cumulative EVA Dose Calculation:');
renderTraverse();
const traverseKm = parseFloat(domElements['dist'].textContent);
const walkTimeHours = traverseKm / SITE.walkSpeedKmh;
const expectedMicroSv = walkTimeHours * 28.0;
const actualDoseText = domElements['rad-eva-dose'].textContent;
console.log(`  Traverse Distance: ${traverseKm.toFixed(2)} km`);
console.log(`  Suited Walk Time: ${walkTimeHours.toFixed(2)} hours`);
console.log(`  Calculated EVA Radiation Dose: ${actualDoseText}`);
assert(actualDoseText.includes(expectedMicroSv.toFixed(1)), 'EVA dose calculated correctly using 28.0 uSv/hr rate');
assert(actualDoseText.includes('mSv'), 'Expressed in both uSv and mSv');
console.log('  ✔ Dynamic loop EVA exposure calculation verified');

// Test 3: Route Modification Dynamically Updates Radiation Exposure
console.log('\n[Test 3] Dynamic Recalculation upon Route Modification:');
// Add an extra science stop ~2 km away
ROUTE.push({
  id: "test-stop",
  name: "Opportunistic Ridge Target",
  pos: [-5.0500, 137.4700],
  type: "opportunistic"
});
renderTraverse();
const newTraverseKm = parseFloat(domElements['dist'].textContent);
const newWalkHours = newTraverseKm / SITE.walkSpeedKmh;
const newExpectedMicroSv = newWalkHours * 28.0;
const newActualDoseText = domElements['rad-eva-dose'].textContent;
console.log(`  Extended Traverse Distance: ${newTraverseKm.toFixed(2)} km`);
console.log(`  Extended EVA Radiation Dose: ${newActualDoseText}`);
assert(newTraverseKm > traverseKm, 'Distance increased');
assert(newActualDoseText.includes(newExpectedMicroSv.toFixed(1)), 'Radiation dose dynamically increased proportional to distance');
console.log('  ✔ Route modification automatically updates radiation telemetry');

// Test 4: Radiation Operational Safety Badge & Visual Gauge
console.log('\n[Test 4] Verify Radiation Safety Margin & Status:');
assert(html.includes('rad-bar-fill'), 'Progress gauge container present');
assert(html.includes('GCR BACKGROUND NOMINAL'), 'GCR background nominal status badge present');
console.log('  ✔ Safety margin and status indicators verified');

console.log('\n=== ALL STEP 7 VERIFICATION TESTS PASSED (100%) ===\n');
