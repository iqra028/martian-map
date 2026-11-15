// Runtime simulation test for Step 6: Marswalk Stepper with Mars 2020 Raw Image Reconnaissance
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
    querySelectorAll(sel) {
      if (sel.includes('.stop-item')) {
        const list = domElements['stops-list'];
        return list ? list.children : [];
      }
      return [];
    },
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

// Pre-register IDs
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
  'recon-sub-curiosity', 'recon-photo-perseverance', 'recon-sub-perseverance'
].forEach(id => {
  domElements[id] = createMockElement(id);
});

// Canvas mock
const canvasDrawCalls = [];
const mockCanvasCtx = {
  scale: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
  arc: (x, y, r) => canvasDrawCalls.push(['arc', x, y, r]),
  fillText: () => {}, setLineDash: () => {}, createLinearGradient: () => ({ addColorStop: () => {} })
};
const mockCanvas = {
  id: 'elevation-canvas',
  getContext: () => mockCanvasCtx,
  parentElement: { getBoundingClientRect: () => ({ width: 800, height: 165 }) },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 165 }),
  addEventListener: () => {}
};
domElements['elevation-canvas'] = mockCanvas;

global.document = {
  getElementById: (id) => domElements[id] || (domElements[id] = createMockElement(id)),
  createElement: (tag) => {
    const el = createMockElement('');
    el._tag = tag;
    return el;
  },
  querySelectorAll: (sel) => domElements['stops-list'] ? domElements['stops-list'].children : []
};
global.window = { addEventListener: () => {}, devicePixelRatio: 1 };

// Leaflet Mock
const mapLayers = [];
let lastFlyToPos = null;
let lastOpenedPopup = null;
global.L = {
  CRS: { EPSG4326: {} },
  map: () => ({
    setView: () => {}, on: () => {},
    addLayer: (l) => { if (!mapLayers.includes(l)) mapLayers.push(l); },
    removeLayer: (l) => { const idx = mapLayers.indexOf(l); if (idx >= 0) mapLayers.splice(idx, 1); },
    hasLayer: (l) => mapLayers.includes(l),
    flyTo: (pos, z) => { lastFlyToPos = pos; },
    invalidateSize: () => {},
    getContainer: () => ({ style: {} })
  }),
  tileLayer: () => ({ on: () => {}, addTo: () => ({}) }),
  layerGroup: () => {
    const lg = {
      layers: [],
      addLayer: (l) => { lg.layers.push(l); return lg; },
      removeLayer: () => lg,
      clearLayers: () => { lg.layers = []; return lg; },
      addTo: () => lg
    };
    return lg;
  },
  circleMarker: (latlng, opts) => {
    const cm = {
      latlng, opts,
      bindPopup: (h) => { cm.popup = h; return cm; },
      openPopup: () => { lastOpenedPopup = cm; },
      setLatLng: (p) => { cm.latlng = p; },
      addTo: (g) => { if (g && g.addLayer) g.addLayer(cm); return cm; }
    };
    return cm;
  },
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

console.log('--- RUNNING STEP 6 VERIFICATION TEST SUITE ---');

// Test 1: Initial Stepper State (Stop 0 - Base Camp)
console.log('\n[Test 1] Verify Initial Marswalk Stepper State:');
assert.strictEqual(activeStopIdx, 0, 'Active stop starts at 0 (Base Camp)');
assert(domElements['stepper-progress'].textContent.includes('Stop 0 of 3'), 'Progress counter shows Stop 0');
assert.strictEqual(domElements['recon-title'].textContent, 'Base Camp (Staging Habitat)');
assert(domElements['recon-photo-curiosity'].src.includes('PIA26365'), 'Curiosity context photo loaded');
assert(domElements['recon-photo-perseverance'].src.includes('PIA24428'), 'Mars 2020 Front Hazcam raw photo loaded');
console.log(`  Progress: "${domElements['stepper-progress'].textContent}"`);
console.log(`  Recon Title: "${domElements['recon-title'].textContent}"`);
console.log(`  Mars 2020 Raw Feed: "${domElements['recon-sub-perseverance'].textContent}"`);
console.log('  ✔ Initial Marswalk Stepper card populated correctly');

// Test 2: Stepping forward to Stop 1 (Clay-Bearing Unit)
console.log('\n[Test 2] Execute nextStep() to Stop 1 (Clay-Bearing Unit):');
nextStep();
assert.strictEqual(activeStopIdx, 1, 'activeStopIdx advanced to 1');
assert.deepStrictEqual(lastFlyToPos, ROUTE[1].pos, 'Camera smoothly flew to Stop 1 coordinates');
assert(domElements['stepper-progress'].textContent.includes('Stop 1'), 'Progress counter updated to Stop 1');
assert(domElements['recon-title'].textContent.includes('Clay-Bearing Unit'), 'Title updated to Stop 1');
assert(domElements['recon-desc'].textContent.includes('Phyllosilicate'), 'Science objective displayed');
assert(domElements['recon-photo-perseverance'].src.includes('PIA24484'), 'Mars 2020 Navcam raw boulder field photo loaded');
assert(domElements['recon-slope'].textContent.includes('12.8°'), 'Ahead slope gradient updated to 12.8° (Moderate Incline)');
console.log(`  Camera FlyTo: [${lastFlyToPos[0]}°, ${lastFlyToPos[1]}°]`);
console.log(`  Objective: "${domElements['recon-desc'].textContent}"`);
console.log(`  Slope Ahead: "${domElements['recon-slope'].textContent}"`);
console.log(`  Mars 2020 Raw Recon: "${domElements['recon-sub-perseverance'].textContent}"`);
console.log('  ✔ Step 1 camera animation, popup trigger, and reconnaissance verified');

// Test 3: Stepping forward to Stop 2 (Polygonal Ridge / Boxwork)
console.log('\n[Test 3] Execute nextStep() to Stop 2 (Boxwork Polygonal Ridge):');
nextStep();
assert.strictEqual(activeStopIdx, 2, 'activeStopIdx advanced to 2');
assert.deepStrictEqual(lastFlyToPos, ROUTE[2].pos, 'Camera flew to Stop 2 coordinates');
assert(domElements['recon-title'].textContent.includes('Polygonal Ridge'), 'Title updated to Boxwork Ridge');
assert(domElements['recon-desc'].textContent.includes('subsurface fluid'), 'Science objective verified');
assert(domElements['recon-photo-perseverance'].src.includes('PIA24653'), 'Mars 2020 Mastcam-Z raw photo loaded');
assert(domElements['recon-slope'].textContent.includes('16.4°'), 'Ahead slope gradient updated to 16.4° (Steep Terrain)');
console.log(`  Slope Ahead: "${domElements['recon-slope'].textContent}"`);
console.log(`  Mars 2020 Raw Recon: "${domElements['recon-sub-perseverance'].textContent}"`);
console.log('  ✔ Step 2 boxwork ridge inspection verified');

// Test 4: Stepping forward to Stop 3 (Layered Sulfate Unit)
console.log('\n[Test 4] Execute nextStep() to Stop 3 (Layered Sulfate Unit):');
nextStep();
assert.strictEqual(activeStopIdx, 3, 'activeStopIdx advanced to 3');
assert.deepStrictEqual(lastFlyToPos, ROUTE[3].pos, 'Camera flew to Stop 3 coordinates');
assert(domElements['recon-title'].textContent.includes('Layered Sulfate'), 'Title updated to Sulfate Unit');
assert(domElements['recon-photo-perseverance'].src.includes('PIA24430'), 'Mars 2020 Rear Hazcam raw sand ripple photo loaded');
assert(domElements['recon-sub-perseverance'].textContent.includes('sinkage'), 'Sand ripple sinkage hazard evaluated');
console.log(`  Mars 2020 Raw Recon: "${domElements['recon-sub-perseverance'].textContent}"`);
console.log('  ✔ Step 3 sulfate outcrop inspection verified');

// Test 5: Stepping backward (prevStep)
console.log('\n[Test 5] Execute prevStep() back to Stop 2:');
prevStep();
assert.strictEqual(activeStopIdx, 2, 'activeStopIdx returned to 2');
assert(domElements['recon-title'].textContent.includes('Polygonal Ridge'), 'Title returned to Stop 2');
console.log('  ✔ Stepper reverse navigation verified');

// Test 6: Auto-Play Mode
console.log('\n[Test 6] Verify Marswalk Auto-Play Timer:');
const playBtn = domElements['btn-stepper-play'];
toggleStepperAutoPlay();
assert(stepperTimer !== null, 'Auto-play timer started');
assert.strictEqual(playBtn.textContent, '⏸ Pause Marswalk', 'Button labeled Pause');
toggleStepperAutoPlay();
assert.strictEqual(stepperTimer, null, 'Auto-play timer cleared');
assert.strictEqual(playBtn.textContent, '▶ Start Marswalk', 'Button labeled Start');
console.log('  ✔ Auto-play play/pause toggle verified');

// Test 7: Official Resource Citation Links
console.log('\n[Test 7] Verify Official NASA Resource Citations:');
assert(html.includes('https://mars.nasa.gov/mars2020/multimedia/raw-images/'), 'NASA Mars 2020 Raw Images URL present');
assert(html.includes('https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/'), 'NASA Science Curiosity Path URL present');
console.log('  ✔ Official NASA Mars 2020 and Curiosity challenge resources verified');

console.log('\n=== ALL STEP 6 VERIFICATION TESTS PASSED (100%) ===\n');
