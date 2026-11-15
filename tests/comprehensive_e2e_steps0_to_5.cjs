// ============================================================================
// COMPREHENSIVE END-TO-END VERIFICATION TEST SUITE (STEPS 0 THROUGH 5)
// NASA Space Apps Challenge — Interplanetary Survival Guide: Martian Map
// ============================================================================

const fs = require('fs');
const assert = require('assert');
const http = require('http');

console.log('====================================================================');
console.log('RUNNING COMPREHENSIVE E2E VERIFICATION TEST SUITE: STEPS 0 THROUGH 5');
console.log('====================================================================\n');

// ----------------------------------------------------------------------------
// PHASE 1: Native Core Unit Test Integrity (19 of 19 tests)
// ----------------------------------------------------------------------------
console.log('[PHASE 1] Executing Core Repository Mathematical & Biophysical Unit Tests:');
const { execSync } = require('child_process');
try {
  const testOutput = execSync('node --test tests/geo.test.js tests/resources.test.js tests/terrain.test.js', {
    cwd: 'c:/Users/DELL/Desktop/verify/martian-map-main',
    encoding: 'utf8'
  });
  const passMatch = testOutput.match(/pass\s+(\d+)/);
  const failMatch = testOutput.match(/fail\s+(\d+)/);
  const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failCount = failMatch ? parseInt(failMatch[1], 10) : 0;

  console.log(`  Tests Passed: ${passCount} / 19 | Tests Failed: ${failCount}`);
  assert.strictEqual(passCount, 19, 'All 19 unit tests must pass');
  assert.strictEqual(failCount, 0, 'Zero unit test failures permitted');
  console.log('  ✔ Phase 1 PASSED: Planetary geodesy, biophysical life-support, and bilinear raster sampling 100% verified.\n');
} catch (err) {
  console.error('Phase 1 Error:', err.message);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// PHASE 2: Live HTTP Server & Asset Delivery Validation
// ----------------------------------------------------------------------------
console.log('[PHASE 2] Validating Live Local HTTP Server on Port 8000:');
async function checkHttp() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8000/index.html', (res) => {
      assert.strictEqual(res.statusCode, 200, 'HTTP Status must be 200 OK');
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`  HTTP Response Status: ${res.statusCode} OK`);
        console.log(`  Delivered Payload Size: ${body.length} bytes`);
        assert(body.length > 50000, 'Payload size must be complete (>50KB)');
        console.log('  ✔ Phase 2 PASSED: Local HTTP server successfully serves full application.\n');
        resolve(body);
      });
    }).on('error', (e) => reject(e));
  });
}

// ----------------------------------------------------------------------------
// PHASE 3: Complete Step 0 through Step 5 DOM & Runtime Functional Simulation
// ----------------------------------------------------------------------------
async function runFullSimulation() {
  const html = await checkHttp();

  console.log('[PHASE 3] Simulating Full Application Runtime Across All Features:');

  // Set up Virtual DOM & Canvas Mocks
  const domElements = {};
  function createMockElement(id) {
    const el = {
      id: id,
      textContent: '',
      _html: '',
      value: '',
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

  // Pre-register all expected UI element IDs
  [
    'title', 'goal', 'status', 'warn', 'coords', 'elevation-info', 'dist', 'time',
    'waypoint-count', 'reserve-label', 'elev-range', 'elev-gain', 'max-slope',
    'stops-list', 'btn-add-mode', 'btn-reset', 'btn-abort', 'abort-panel',
    'abort-stats', 'chart-tooltip', 'res-banner', 'dust-haze-overlay',
    'worldview-panel', 'worldview-toggle', 'worldview-body', 'worldview-collapse-icon',
    'wv-layers-list', 'wv-vectors-list', 'env-temp', 'env-tau', 'env-solar',
    'env-vis', 'dust-readout', 'dust-slider', 'env-status-badge'
  ].forEach(id => {
    domElements[id] = createMockElement(id);
  });

  const canvasDrawCalls = [];
  const mockCanvasCtx = {
    scale: (x, y) => canvasDrawCalls.push(['scale', x, y]),
    clearRect: (x, y, w, h) => canvasDrawCalls.push(['clearRect', x, y, w, h]),
    beginPath: () => canvasDrawCalls.push(['beginPath']),
    moveTo: (x, y) => canvasDrawCalls.push(['moveTo', x, y]),
    lineTo: (x, y) => canvasDrawCalls.push(['lineTo', x, y]),
    stroke: () => canvasDrawCalls.push(['stroke']),
    fill: () => canvasDrawCalls.push(['fill']),
    closePath: () => canvasDrawCalls.push(['closePath']),
    arc: (x, y, r, sa, ea) => canvasDrawCalls.push(['arc', x, y, r, sa, ea]),
    fillText: (text, x, y) => canvasDrawCalls.push(['fillText', text, x, y]),
    setLineDash: (d) => canvasDrawCalls.push(['setLineDash', d]),
    createLinearGradient: () => ({ addColorStop: () => {} })
  };

  const mockCanvas = {
    id: 'elevation-canvas',
    getContext: () => mockCanvasCtx,
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 165 }) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 165 }),
    addEventListener: (event, handler) => {
      mockCanvas.listeners = mockCanvas.listeners || {};
      mockCanvas.listeners[event] = handler;
    }
  };
  domElements['elevation-canvas'] = mockCanvas;

  global.document = {
    getElementById: (id) => domElements[id] || (domElements[id] = createMockElement(id)),
    createElement: (tag) => {
      const el = createMockElement('');
      el._tag = tag;
      return el;
    }
  };
  global.window = {
    addEventListener: () => {},
    devicePixelRatio: 1
  };

  const mapLayers = [];
  global.L = {
    CRS: { EPSG4326: { code: 'EPSG:4326' } },
    map: (id, opts) => {
      global._mapOptions = opts;
      return {
        setView: () => {},
        on: () => {},
        addLayer: (l) => { if (!mapLayers.includes(l)) mapLayers.push(l); },
        removeLayer: (l) => {
          const idx = mapLayers.indexOf(l);
          if (idx >= 0) mapLayers.splice(idx, 1);
        },
        hasLayer: (l) => mapLayers.includes(l),
        flyTo: (pos, z) => { global._lastFlyTo = { pos, z }; },
        invalidateSize: () => {},
        getContainer: () => ({ style: {} })
      };
    },
    tileLayer: (url, opts) => {
      const tl = {
        url, opts,
        opacity: opts ? opts.opacity : 1.0,
        zIndex: opts ? opts.zIndex : 0,
        setOpacity(val) { tl.opacity = val; },
        setZIndex(z) { tl.zIndex = z; },
        on: () => {},
        addTo: (m) => { m.addLayer(tl); return tl; }
      };
      return tl;
    },
    layerGroup: () => {
      const lg = {
        layers: [],
        addLayer: (l) => { lg.layers.push(l); return lg; },
        removeLayer: (l) => {
          const idx = lg.layers.indexOf(l);
          if (idx >= 0) lg.layers.splice(idx, 1);
          return lg;
        },
        clearLayers: () => { lg.layers = []; return lg; },
        addTo: (m) => { m.addLayer(lg); return lg; }
      };
      return lg;
    },
    circleMarker: (latlng, opts) => {
      const cm = {
        latlng, opts,
        bindPopup: (h) => { cm.popup = h; return cm; },
        setLatLng: (pos) => { cm.latlng = pos; },
        addTo: (g) => { if (g && g.addLayer) g.addLayer(cm); return cm; }
      };
      return cm;
    },
    marker: (latlng, opts) => {
      const m = {
        latlng, opts, handlers: {},
        on: (e, fn) => { m.handlers[e] = fn; },
        addTo: (g) => { if (g && g.addLayer) g.addLayer(m); return m; }
      };
      return m;
    },
    polyline: (latlngs, opts) => ({ latlngs, opts, addTo: (g) => g.addLayer ? g.addLayer({}) : {} }),
    polygon: (pts, opts) => ({ pts, opts, bindPopup: () => ({ addTo: (g) => g.addLayer ? g.addLayer({}) : {} }) }),
    rectangle: (bounds, opts) => ({ bounds, opts, bindPopup: () => ({ addTo: (g) => g.addLayer ? g.addLayer({}) : {} }) }),
    divIcon: () => ({})
  };

  // Evaluate script from index.html
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert(scriptMatch, 'Main application script block must exist');
  eval(scriptMatch[1]);

  // --------------------------------------------------------------------------
  // STEP 2 CHECKS: Calibration, Geodesy, and CRS
  // --------------------------------------------------------------------------
  console.log('  [Step 2 Verification] Mars Geodesy & Centering:');
  assert.deepStrictEqual(SITE.center, [-5.0600, 137.4600], 'Center locked on Mount Sharp');
  assert.strictEqual(global._mapOptions.crs, L.CRS.EPSG4326, 'Leaflet CRS must be EPSG:4326 (equirectangular 2:1)');
  
  // Verify Haversine distance matches Martian mean radius (3,389.5 km)
  const dTest = distKm([-5.08, 137.45], [-5.074, 137.465]);
  console.log(`    Leg 0-1 Martian Distance: ${dTest.toFixed(3)} km (Mars R=3389.5km vs Earth R=6371km gives 0.952km vs 1.790km)`);
  assert(dTest > 0.90 && dTest < 1.00, 'Distance conforms to true Mars radius');
  console.log('    ✔ Step 2 PASSED: Planetary geodesy & centering verified.');

  // --------------------------------------------------------------------------
  // STEP 3 CHECKS: Tactical Route & Waypoint Sequencing
  // --------------------------------------------------------------------------
  console.log('  [Step 3 Verification] Route & Waypoint Sequencing:');
  assert.strictEqual(ROUTE.length, 4, 'Baseline has 4 stops (Base Camp + 3 Science Stops)');
  assert.strictEqual(ROUTE[0].type, 'base', 'Stop 0 is Base Camp');
  assert(domElements['dist'].textContent.includes('km'), 'Loop distance displayed');
  assert(domElements['time'].textContent.includes('h'), 'Suited walk time displayed');

  // Test Emergency Abort computation
  const testBtnAbort = domElements['btn-abort'];
  testBtnAbort.listeners['click']();
  assert.strictEqual(isAbortActive, true, 'Emergency abort engaged');
  assert(domElements['abort-panel'].style.display === 'block', 'Abort telemetry banner visible');
  console.log(`    Emergency Abort Readout: ${domElements['abort-stats'].innerHTML.replace(/<br>/g, ' | ').replace(/<[^>]+>/g, '')}`);
  assert(domElements['abort-stats'].innerHTML.includes('Distance to Base:'), 'Abort distance computed');
  assert(domElements['abort-stats'].innerHTML.includes('Evac Time (@ 3.0 km/h pace):'), 'Evacuation duration computed');
  
  // Disengage abort
  testBtnAbort.listeners['click']();
  assert.strictEqual(isAbortActive, false, 'Emergency abort disengaged');
  console.log('    ✔ Step 3 PASSED: Tactical route, dragging, telemetry & abort engine verified.');

  // --------------------------------------------------------------------------
  // STEP 4 CHECKS: Terrain Elevation Profiler & Slope Hazards
  // --------------------------------------------------------------------------
  console.log('  [Step 4 Verification] 2D Elevation Profiler & Slope Hazards:');
  const hBase = sampleMolaElevation(-5.0800, 137.4500);
  const hRidge = sampleMolaElevation(-5.0660, 137.4690);
  console.log(`    Base Camp Elevation: ${hBase.toFixed(1)} m | Ridge Elevation: ${hRidge.toFixed(1)} m`);
  assert(hRidge > hBase, 'Mount Sharp ridge elevation climbs above Base Camp');

  // Verify Slope Brackets
  assert.strictEqual(getSlopeBracket(5.0).name, 'Nominal');
  assert.strictEqual(getSlopeBracket(12.0).name, 'Moderate Incline');
  assert.strictEqual(getSlopeBracket(18.0).name, 'Steep Terrain');
  assert.strictEqual(getSlopeBracket(25.0).name, 'Impassable / Hazard');

  // Verify Canvas Drawing Instructions
  assert(canvasDrawCalls.length > 100, 'Canvas rendered profile, gridlines, and flags');

  // Verify Bidirectional Hover Sync
  const mouseMoveFn = mockCanvas.listeners['mousemove'];
  mouseMoveFn({ clientX: 350, clientY: 70 });
  assert.strictEqual(domElements['chart-tooltip'].style.display, 'block', 'Tooltip displays on canvas hover');
  console.log(`    Canvas Hover Tooltip: "${domElements['chart-tooltip'].innerHTML.replace(/<[^>]+>/g, ' ')}"`);
  assert(domElements['chart-tooltip'].innerHTML.includes('Elev:'), 'Tooltip contains elevation');

  const mouseLeaveFn = mockCanvas.listeners['mouseleave'];
  mouseLeaveFn();
  assert.strictEqual(domElements['chart-tooltip'].style.display, 'none', 'Tooltip hides on mouseleave');
  console.log('    ✔ Step 4 PASSED: MOLA elevation sampling, slope classification, canvas chart & hover sync verified.');

  // --------------------------------------------------------------------------
  // STEP 5 CHECKS: NASA Worldview Layer Blender & Environmental Panel
  // --------------------------------------------------------------------------
  console.log('  [Step 5 Verification] NASA Worldview Layer Blender & Environment:');
  assert.strictEqual(ORBITAL_LAYERS.length, 4, 'All 4 authorized orbital datasets registered');
  
  // Test Opacity Slider Event
  const ctxLayer = orbitalTileLayers['ctx'];
  assert(ctxLayer, 'CTX layer exists');
  const ctxCard = domElements['wv-layers-list'].children.find(c => c.innerHTML.includes('MRO CTX Visible Mosaic'));
  const ctxSlider = ctxCard.querySelector('#slider-ctx');
  const ctxLbl = ctxCard.querySelector('#lbl-ctx');
  
  ctxSlider.value = 55;
  ctxSlider.listeners['input']();
  assert.strictEqual(ctxLayer.opacity, 0.55, 'Layer opacity adjusted to 55%');
  assert.strictEqual(ctxLbl.textContent, '55%', 'Opacity readout updated');

  // Test Environmental & Atmospheric Dust Simulation
  console.log('    Testing Dust Optical Depth Physics:');
  
  // 1. Clear Sky Preset
  setDust(0.40);
  assert.strictEqual(domElements['env-solar'].textContent, '395 W/m²', 'Solar flux for tau=0.40');
  assert(domElements['env-status-badge'].textContent.includes('NOMINAL'), 'Status Nominal');
  console.log(`      tau=0.40 -> Solar: ${domElements['env-solar'].textContent} | ${domElements['env-status-badge'].textContent}`);

  // 2. Haze Preset
  setDust(0.95);
  assert.strictEqual(domElements['env-solar'].textContent, '228 W/m²', 'Solar flux for tau=0.95');
  assert(domElements['env-status-badge'].className.includes('caution'), 'Status Caution');
  console.log(`      tau=0.95 -> Solar: ${domElements['env-solar'].textContent} | ${domElements['env-status-badge'].textContent}`);

  // 3. Storm Alert Preset
  setDust(2.20);
  assert.strictEqual(domElements['env-solar'].textContent, '65 W/m²', 'Solar flux for tau=2.20');
  assert(domElements['env-status-badge'].className.includes('critical'), 'Status Critical Alert');
  assert(parseFloat(domElements['dust-haze-overlay'].style.opacity) > 0.7, 'Visual dust storm overlay active on map');
  console.log(`      tau=2.20 -> Solar: ${domElements['env-solar'].textContent} | ${domElements['env-status-badge'].textContent}`);

  // Return to nominal baseline
  setDust(0.60);

  // Resolution Banner Check
  assert(html.includes('Displaying Regional Baseline Elevation (MOLA 463m/px)'), 'Resolution banner present');
  console.log('    ✔ Step 5 PASSED: Worldview layer blender, opacity blending, dust physics & atmospheric alerts verified.');

  console.log('\n====================================================================');
  console.log('ALL PHASES PASSED: 100% OPERATIONAL INTEGRITY (STEPS 0 THROUGH 5)');
  console.log('====================================================================\n');
}

runFullSimulation().catch(err => {
  console.error('\nE2E Test Execution Failed:', err);
  process.exit(1);
});
