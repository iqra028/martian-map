/**
 * Martian Map — EVA planner UI controller.
 * Repository: martian-map
 *
 * Wires the HiRISE terrain model, safe-path routing, EVA consumables plan and environment
 * data to the map, elevation profile and mission panel. Leaflet is loaded as a global (L).
 */

import { ElevationService } from './data/elevation-service.js';
import { SLOPE_CLASSES, ROUGHNESS, classifySlope, profileRoute, findSafePath } from './data/terrain-analysis.js';
import { EVA, RADIATION, environmentFor, planEva, evaluateGoNoGo, integrateWalk } from './core/eva-plan.js';
import { MissionStore } from './core/mission-state.js';
import { SITE, DEFAULT_ROUTE, NEW_STOP_PHOTO, BASEMAPS, SOURCES } from './config/mission.js';
import { fetchSpaceWeather } from './data/space-weather.js';
import { REMS_FEED, parseRems } from './data/rems.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = (route) => route.map((w) => ({ ...w, pos: [...w.pos] }));
const LEVEL_TEXT = { go: 'Go', caution: 'Caution', nogo: 'No-go' };
const CALLOUT_TEXT = { go: 'Go for EVA', caution: 'Caution — review before egress', nogo: 'No-go — do not egress' };
const PNR_LEVEL = { NOMINAL: 'go', CAUTION: 'caution', CRITICAL_ABORT: 'nogo' };
const SLOPE_COLOR = Object.fromEntries(SLOPE_CLASSES.map((c) => [c.id, c.color]));
const CREW = {
  solo: { speed: EVA.abortSpeedKmh, text: 'Solo, brisk walk' },
  pair: { speed: EVA.assistSpeedKmh, text: 'Supporting an injured partner (assumed pace)' },
  rover: { speed: EVA.roverSpeedKmh, text: 'Rover pickup (assumed average speed)' }
};

function fmtH(h) {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} m`;
}
// Mission elapsed time since egress, e.g. T+1:43
function met(h) {
  const m = Math.round(h * 60);
  return `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

const store = new MissionStore({ siteName: SITE.name, center: SITE.center, waypoints: clone(DEFAULT_ROUTE) });
const ui = { tab: 'plan', activeStop: 0, tau: 0.6, solIdx: 0, crew: 'solo', abort: false, adding: false, playTimer: null };
let raster = null;
let sols = [];
let spaceWeather = null;
let result = null;
const pathCache = new Map();

/* ---------------- map ---------------- */

const map = L.map('map', { crs: L.CRS.EPSG4326, center: SITE.center, zoom: SITE.zoom, minZoom: 3, maxZoom: 17 });
const failedTiles = new Set();

const basemaps = BASEMAPS.map((b) => {
  const layer = L.tileLayer(b.url, {
    tileSize: 256, maxNativeZoom: b.maxNative, maxZoom: 17, noWrap: true,
    bounds: [[-90, -180], [90, 180]], opacity: b.opacity,
    attribution: b.attribution || '<a href="https://trek.nasa.gov/mars" target="_blank" rel="noopener">NASA / USGS</a>'
  });
  layer.on('tileerror', () => { failedTiles.add(b.name); renderTileStatus(); });
  if (b.on) layer.addTo(map);
  return { ...b, layer };
});

const geologyGroup = L.layerGroup();
let geologyLoaded = false;
function loadGeology() {
  if (geologyLoaded) return;
  geologyLoaded = true;
  const url = 'https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0/query' +
    '?where=1%3D1&geometry=136.5,-6,138.5,-4&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&f=geojson';
  fetch(url).then((r) => r.json()).then((g) => {
    if (!g.features?.length) throw new Error('no features');
    L.geoJSON(g, {
      style: { color: '#e8a35c', weight: 1, fillOpacity: 0.12 },
      onEachFeature: (f, l) => {
        const rows = Object.entries(f.properties || {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('<br>');
        l.bindPopup(`<b>USGS geologic unit</b><br>${rows}`);
      }
    }).addTo(geologyGroup);
  }).catch(() => {
    geologyLoaded = false;
    notice('Geologic map unavailable (offline?)', 4000);
  });
}

const routeLayer = L.layerGroup().addTo(map);
const markerLayer = L.layerGroup().addTo(map);
const abortLayer = L.layerGroup().addTo(map);
const scrubMarker = L.circleMarker([0, 0], { radius: 7, color: '#11161b', weight: 2.5, fillColor: '#5fb7d4', fillOpacity: 1 });

let overlays = [];
function buildOverlays() {
  const nw = raster.pixelToGeographic(-0.5, -0.5);
  const se = raster.pixelToGeographic(raster.metadata.lines - 0.5, raster.metadata.samples - 0.5);
  const dtmBounds = [[se.lat, nw.lon], [nw.lat, se.lon]];
  const ortho = L.imageOverlay(SITE.ortho.url, SITE.ortho.bounds, { opacity: 1, attribution: 'HiRISE: NASA/JPL/UArizona' });
  transparentPadding(SITE.ortho.url).then((url) => ortho.setUrl(url)).catch(() => {});
  overlays = [
    { id: 'ortho', name: 'HiRISE image', detail: '5 m/px · ' + SITE.ortho.productId, on: true, opacity: 1, layer: ortho },
    { id: 'shade', name: 'Hillshade', detail: 'From the 10 m HiRISE terrain model', on: false, opacity: 0.6,
      layer: L.imageOverlay('./data/terrain/hillshade.png', dtmBounds, { opacity: 0.6 }) },
    { id: 'slope', name: 'Steep ground', detail: 'Orange 15–20°, red over 20° (no-go)', on: true, opacity: 0.7,
      layer: L.imageOverlay('./data/terrain/slope.png', dtmBounds, { opacity: 0.7 }) },
    { id: 'rough', name: 'Rough ground', detail: 'Violet: blocks and ledges from the 1 m model (darker = boulder field)', on: false, opacity: 0.8,
      layer: L.imageOverlay('./data/terrain/rough.png', dtmBounds, { opacity: 0.8 }) },
    { id: 'footprint', name: 'Terrain model outline', detail: 'Stops must be placed inside', on: true, opacity: 1,
      layer: L.rectangle(dtmBounds, { color: '#f3f4f6', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }) },
    { id: 'geology', name: 'USGS geologic units', detail: 'Online · regional 1:20M map', on: false, opacity: 1,
      layer: geologyGroup, onEnable: loadGeology }
  ];
  overlays.forEach((o) => o.on && o.layer.addTo(map));
  routeLayer.bringToFront?.();
}

// HiRISE browse images pad the map-projected strip with black; clear it so orbital context shows around the strip
async function transparentPadding(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i] + d.data[i + 1] + d.data[i + 2] < 24) d.data[i + 3] = 0; // < 24 absorbs JPEG noise at the edge
  }
  g.putImageData(d, 0, 0);
  return URL.createObjectURL(await new Promise((r) => c.toBlob(r)));
}

/* ---------------- planning ---------------- */

function legPath(a, b) {
  const key = `${a}|${b}`;
  if (!pathCache.has(key)) {
    const r = findSafePath(raster, a, b);
    pathCache.set(key, r ? { path: r.path, safe: true } : { path: [a, b], safe: false });
  }
  return pathCache.get(key);
}

function recompute() {
  if (!raster) return;
  const pts = store.getState().waypoints.map((w) => w.pos);
  const legs = pts.map((p, i) => legPath(p, pts[(i + 1) % pts.length]));
  const profile = profileRoute(raster, pts, { legPaths: legs.map((l) => l.path) });
  const returns = pts.map((p, i) => (i === 0 ? null : legPath(p, pts[0])));
  const returnSamples = returns.map((r, i) =>
    r && r.safe ? profileRoute(raster, [pts[i], pts[0]], { closeLoop: false, legPaths: [r.path] }).samples : null);
  const env = environmentFor(sols[ui.solIdx], ui.tau);
  const plan = planEva(profile, returnSamples, env);
  const verdict = evaluateGoNoGo({
    routing: legs.map((l, i) => ({ legIdx: i, safe: l.safe })),
    summary: profile.summary, plan, env, spaceWeather
  });
  result = { pts, legs, profile, returns, returnSamples, env, plan, verdict };
  ui.activeStop = Math.min(ui.activeStop, pts.length - 1);
  render();
}

/* ---------------- rendering ---------------- */

function render() {
  renderRoute();
  renderMarkers();
  renderStatus();
  renderPlan();
  renderStop();
  renderEnv();
  renderAbort();
  drawProfile();
}

function renderRoute() {
  routeLayer.clearLayers();
  const { samples } = result.profile;
  let run = null;
  const flush = () => {
    if (run && run.pts.length > 1) {
      L.polyline(run.pts, { color: '#11161b', weight: 7, opacity: 0.85, interactive: false }).addTo(routeLayer);
      L.polyline(run.pts, { color: SLOPE_COLOR[run.cls], weight: 3.5, interactive: false }).addTo(routeLayer);
    }
  };
  for (const s of samples) {
    const cls = classifySlope(s.terrainSlopeDeg ?? 0).id;
    const p = [s.lat, s.lon];
    if (!run || run.cls !== cls || run.leg !== s.legIdx) {
      flush();
      run = { cls, leg: s.legIdx, pts: run && run.leg === s.legIdx ? [run.pts[run.pts.length - 1], p] : [p] };
    } else run.pts.push(p);
  }
  flush();
  result.legs.forEach((l) => {
    if (!l.safe) L.polyline(l.path, { color: '#e5534b', weight: 4, dashArray: '2 10', interactive: false }).addTo(routeLayer);
  });
}

function renderMarkers() {
  markerLayer.clearLayers();
  store.getState().waypoints.forEach((w, i) => {
    const base = i === 0;
    const icon = L.divIcon({
      className: 'wp-marker',
      html: `<div class="wp-icon${base ? ' base' : ''}${i === ui.activeStop ? ' active' : ''}">${base ? 'B' : i}</div>`,
      iconSize: [34, 34], iconAnchor: [17, 17]
    });
    const m = L.marker(w.pos, { icon, draggable: true, keyboard: true, title: `${base ? 'Base camp' : `Stop ${i}`}: ${w.name}`, alt: w.name });
    m.on('click', () => { setActiveStop(i); selectTab('stop'); });
    m.on('dragend', () => {
      const { lat, lng } = m.getLatLng();
      if (!raster.isWithinBounds(lat, lng)) {
        notice('Outside the terrain model — stops must stay inside the dashed outline', 4000);
        m.setLatLng(w.pos);
        return;
      }
      store.updateWaypoint(i, { pos: [lat, lng] });
    });
    m.addTo(markerLayer);
  });
}

function renderStatus() {
  const { level, reasons } = result.verdict;
  const pill = $('status-pill');
  pill.dataset.level = level;
  $('status-pill-text').textContent = LEVEL_TEXT[level];
  $('status-pill-sub').textContent = reasons.length ? `${reasons.length} issue${reasons.length > 1 ? 's' : ''}` : 'All nominal';
  const card = $('status-card');
  card.dataset.level = level;
  $('status-title').textContent = CALLOUT_TEXT[level];
  $('status-reasons').innerHTML = reasons.length
    ? reasons.map((r) => `<li data-level="${r.level}">${esc(r.text)}</li>`).join('')
    : '<li>All checks nominal</li>';
}

function renderPlan() {
  const { profile, plan, legs } = result;
  const s = profile.summary;
  $('stat-dist').innerHTML = `${s.totalKm.toFixed(2)}<small>km</small>`;
  $('stat-time').textContent = fmtH(plan.hours);
  $('stat-climb').innerHTML = `${Math.round(s.climbM)}<small>m</small>`;
  // Truncate so 19.97° never displays as the 20° no-go threshold
  $('stat-slope').innerHTML = `${(Math.floor(s.maxTerrainSlopeDeg * 10) / 10).toFixed(1)}<small>°</small>`;

  $('consumables').innerHTML = Object.entries(plan.consumables).map(([id, c]) => {
    const worst = plan.stops.reduce((w, st) => (!w || st.pnr[id].marginPercent < w.pnr[id].marginPercent ? st : w), null);
    // Colour the bar by the tightest point-of-no-return margin for this resource, so it agrees with the status
    const lvl = worst ? PNR_LEVEL[worst.pnr[id].status] : 'go';
    const digits = c.unit === 'kg' ? 1 : 0;
    return `<div class="gauge">
      <div class="gauge-head"><span>${esc(c.label)}</span><span><small>${c.remaining.toFixed(digits)} / ${c.cap} ${c.unit}</small><strong>${Math.round(c.pct)}%</strong></span></div>
      <div class="gauge-bar" role="meter" aria-label="${esc(c.label)} remaining" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(c.pct)}">
        <div class="gauge-fill" data-level="${lvl}" style="width:${Math.max(0, Math.min(100, c.pct))}%"></div>
      </div>
    </div>`;
  }).join('');

  const w = plan.worstStop;
  $('pnr-line').innerHTML = w
    ? `<strong>Point of no return</strong> is tightest at stop ${w.idx}: ${esc(w.limiting.label.toLowerCase())} ${Number.isFinite(w.limiting.marginPercent) ? `has ${w.limiting.marginPercent.toFixed(0)}% spare after the walk home and a 25% reserve` : 'cannot get home safely'}.`
    : '';
  $('pnr-line').hidden = !w;

  const wps = store.getState().waypoints;
  $('stops').innerHTML = wps.map((wp, i) => {
    const st = plan.stops.find((x) => x.idx === i);
    const meta = i === 0
      ? `Egress T+0:00 · return ${met(plan.hours)}`
      : `Arrive ${met(st.arriveH)} · ${st.returnKm != null ? st.returnKm.toFixed(1) + ' km' : '—'} from base`;
    const chip = st && st.limiting.status !== 'NOMINAL'
      ? `<span class="chip chip-${PNR_LEVEL[st.limiting.status]}">${st.limiting.status === 'CAUTION' ? 'Low margin' : 'Past PNR'}</span>` : '';
    const removable = i > 0 && wps.length > 2;
    return `<li class="stop" data-type="${esc(wp.type)}"${i === ui.activeStop ? ' aria-current="step"' : ''}>
      <button type="button" class="stop-main" data-stop="${i}">
        <span class="stop-num" aria-hidden="true">${i === 0 ? 'B' : i}</span>
        <span><span class="stop-title">${esc(wp.name)}${chip}</span><span class="stop-meta">${esc(meta)}</span></span>
      </button>
      ${removable ? `<button type="button" class="stop-remove" data-remove="${i}" aria-label="Remove ${esc(wp.name)}">×</button>` : '<span></span>'}
    </li>`;
  }).join('');
  $('route-mode').textContent = legs.every((l) => l.safe) ? 'Legs follow safe terrain' : 'Some legs have no safe path';
}

function stopInfo(i) {
  const s = result.profile.samples.find((x) => x.legIdx === i) || result.profile.samples[0];
  return { elevM: s?.elevM, slopeDeg: s?.terrainSlopeDeg, roughM: s?.roughnessM, st: result.plan.stops.find((x) => x.idx === i) };
}

function renderStop() {
  const wps = store.getState().waypoints;
  const i = ui.activeStop;
  const wp = wps[i];
  const { elevM, slopeDeg, roughM, st } = stopInfo(i);
  $('stop-progress').textContent = i === 0 ? `Base camp · ${wps.length - 1} stops` : `Stop ${i} of ${wps.length - 1}`;
  $('btn-prev').disabled = i === 0;
  $('btn-next').disabled = i === wps.length - 1;
  $('stop-kind').textContent = i === 0 ? 'Base camp' : `Science stop ${i}`;
  $('stop-name').textContent = wp.name;
  $('stop-objective').textContent = wp.objective;
  const facts = [
    ['Elevation', Number.isFinite(elevM) ? `${Math.round(elevM)} m` : '—'],
    ['Ground slope', Number.isFinite(slopeDeg) ? `${slopeDeg.toFixed(1)}° · ${classifySlope(slopeDeg).label}` : '—'],
    ['Footing', Number.isFinite(roughM)
      ? `${roughM >= ROUGHNESS.blockyM ? 'Boulder field' : roughM >= ROUGHNESS.roughM ? 'Rough, blocks and ledges' : 'Even'} · ${roughM.toFixed(1)} m relief`
      : '—']
  ];
  if (st) {
    facts.push(['Arrive', met(st.arriveH)]);
    facts.push(['Walk back to base', st.returnH != null ? `${st.returnKm.toFixed(1)} km · ${fmtH(st.returnH)}` : 'No safe path']);
    facts.push(['Tightest margin', `${st.limiting.label} ${Number.isFinite(st.limiting.marginPercent) ? st.limiting.marginPercent.toFixed(0) + '%' : '—'}`]);
  } else {
    facts.push(['EVA length', fmtH(result.plan.hours)]);
  }
  $('stop-facts').innerHTML = facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const photo = wp.photo || NEW_STOP_PHOTO;
  $('stop-photo').src = photo.src;
  $('stop-photo').alt = photo.caption;
  $('stop-photo-caption').textContent = photo.caption;
  $('stop-photo-link').href = photo.link;
}

function renderEnv() {
  const { env, plan } = result;
  const sol = sols[ui.solIdx];
  $('wx-facts').innerHTML = sol ? [
    ['Earth date', sol.earthDate],
    ['Air temperature', `${sol.airMinC} to ${sol.airMaxC} °C`],
    ['Ground temperature', `${sol.groundMinC} to ${sol.groundMaxC} °C`],
    ['Pressure', `${sol.pressurePa} Pa`],
    ['UV', sol.uv],
    ['Sky', sol.opacity],
    ['Daylight', `${sol.sunrise} – ${sol.sunset}`]
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') : '<dt>Weather</dt><dd>Unavailable</dd>';
  $('wx-effect').textContent = `Midday air ${Math.round(env.ambientC)} °C → suit heater ${Math.round(env.heaterW)} W from the battery (assumed heater model).`;

  $('dust-value').textContent = ui.tau.toFixed(2);
  $('dust-slider').value = ui.tau;
  document.querySelectorAll('[data-tau]').forEach((b) => {
    const on = env.dust.id === classOf(Number(b.dataset.tau));
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('dust-effect').textContent = `${env.dust.label}: walking pace ×${env.paceFactor} (${plan.speedKmh.toFixed(1)} km/h), noon sunlight ${env.solarWm2} W/m².`;
  $('dust-overlay').style.opacity = Math.min(0.55, Math.max(0, (ui.tau - 0.5) / 2.1) * 0.55);

  const evaMsv = plan.doseMicroSv / 1000;
  $('rad-facts').innerHTML = [
    ['Surface dose rate', `${RADIATION.doseEqMsvPerDay} mSv/day`],
    ['This EVA', `${Math.round(plan.doseMicroSv)} µSv`],
    ['Share of career limit', `${((evaMsv / RADIATION.careerLimitMsv) * 100).toFixed(3)}% of ${RADIATION.careerLimitMsv} mSv`]
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
}
const classOf = (tau) => environmentFor(null, tau).dust.id;

function renderAbort() {
  abortLayer.clearLayers();
  const info = $('abort-info');
  $('btn-abort').setAttribute('aria-pressed', String(ui.abort));
  $('btn-abort').textContent = ui.abort ? 'Hide abort route' : 'Show abort route';
  if (!ui.abort) { info.hidden = true; return; }

  // From the selected stop, or the stop with the longest way home
  let i = ui.activeStop;
  if (i === 0) {
    i = result.plan.stops.reduce((best, s) => (s.returnKm > (best?.returnKm ?? -1) ? s : best), null)?.idx ?? 1;
  }
  const ret = result.returns[i];
  const samples = result.returnSamples[i];
  const crew = CREW[ui.crew];
  info.hidden = false;
  if (!ret || !samples) {
    info.innerHTML = `<p class="big">No safe path home</p><p>From stop ${i} every route crosses ground over 20°.</p>`;
    return;
  }
  L.polyline(ret.path, { color: '#11161b', weight: 7, interactive: false }).addTo(abortLayer);
  L.polyline(ret.path, { color: '#e5534b', weight: 3.5, dashArray: '8 6', interactive: false }).addTo(abortLayer);
  const km = samples[samples.length - 1].distKm;
  const left = result.plan.stops.find((s) => s.idx === i).remaining;
  let supply = 'Walking back stays the fallback if the rover fails.';
  if (ui.crew !== 'rover') {
    // Walking crew: compare what the return needs (at this pace) with what is left after the stop
    const cost = integrateWalk(samples, { speedKmh: crew.speed, heaterW: result.env.heaterW });
    const short = [['Oxygen', cost.o2L, left.o2, 'L'], ['Battery', cost.batWh, left.battery, 'Wh']]
      .filter(([, need, have]) => need > have);
    supply = short.length
      ? `<strong class="short">Not enough ${short.map(([n, need, have, u]) => `${n.toLowerCase()} (needs ${Math.round(need)} ${u}, ${Math.round(have)} ${u} left)`).join(' or ')}.</strong>`
      : `Enough to get home: needs ${Math.round(cost.o2L)} of ${Math.round(left.o2)} L oxygen, ${Math.round(cost.batWh)} of ${Math.round(left.battery)} Wh battery.`;
  }
  info.innerHTML = `<p>From <strong>stop ${i}</strong> · ${esc(store.getState().waypoints[i].name)}</p>
    <p class="big">${fmtH(km / crew.speed)} to base</p>
    <p>${km.toFixed(2)} km on safe ground · ${esc(crew.text)} at ${crew.speed} km/h</p>
    <p class="note">${supply}</p>`;
}

function renderTileStatus() {
  $('tile-status').textContent = failedTiles.size ? `Not loading: ${[...failedTiles].join(', ')}. Site data still works offline.` : '';
}

/* ---------------- elevation profile ---------------- */

const canvas = $('profile-canvas');
const ctx = canvas.getContext('2d');
let chart = null;

function drawProfile() {
  const rect = canvas.getBoundingClientRect();
  if (!result || !rect.width) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width, H = rect.height, pad = { l: 52, r: 12, t: 26, b: 22 };
  const samples = result.profile.samples.filter((s) => Number.isFinite(s.elevM));
  ctx.clearRect(0, 0, W, H);
  if (samples.length < 2) return;
  const total = result.profile.summary.totalKm || 1;
  let lo = Math.min(...samples.map((s) => s.elevM)), hi = Math.max(...samples.map((s) => s.elevM));
  const span = Math.max(20, hi - lo);
  lo -= span * 0.08; hi += span * 0.08;
  const x = (km) => pad.l + (km / total) * (W - pad.l - pad.r);
  const y = (m) => pad.t + (1 - (m - lo) / (hi - lo)) * (H - pad.t - pad.b);
  chart = { samples, x, pad, W, total };

  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#737d8a';
  ctx.strokeStyle = '#262c34';
  ctx.lineWidth = 1;
  for (let k = 0; k <= 2; k++) {
    const m = lo + ((hi - lo) * k) / 2;
    ctx.beginPath(); ctx.moveTo(pad.l, y(m)); ctx.lineTo(W - pad.r, y(m)); ctx.stroke();
    ctx.fillText(`${Math.round(m)} m`, 4, y(m) + 4);
  }
  ctx.fillText('0 km', pad.l, H - 4);
  ctx.textAlign = 'right';
  ctx.fillText(`${total.toFixed(1)} km`, W - pad.r, H - 4);
  ctx.textAlign = 'left';

  ctx.beginPath();
  ctx.moveTo(x(samples[0].distKm), y(lo));
  samples.forEach((s) => ctx.lineTo(x(s.distKm), y(s.elevM)));
  ctx.lineTo(x(samples[samples.length - 1].distKm), y(lo));
  ctx.fillStyle = 'rgba(238, 241, 244, 0.05)';
  ctx.fill();

  ctx.lineWidth = 2;
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1], b = samples[k];
    if (a.legIdx !== b.legIdx && b.distKm - a.distKm > 0.05) continue;
    ctx.strokeStyle = SLOPE_COLOR[classifySlope(b.terrainSlopeDeg ?? 0).id];
    ctx.beginPath(); ctx.moveTo(x(a.distKm), y(a.elevM)); ctx.lineTo(x(b.distKm), y(b.elevM)); ctx.stroke();
  }

  // stop ticks
  ctx.fillStyle = '#a7afba';
  ctx.strokeStyle = '#353d48';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  result.profile.legs.forEach((leg, i) => {
    const px = x(leg.fromKm);
    ctx.beginPath(); ctx.moveTo(px, pad.t - 4); ctx.lineTo(px, H - pad.b); ctx.stroke();
    ctx.fillText(i === 0 ? 'B' : String(i), px, pad.t - 10);
  });
  ctx.fillText('B', x(total), pad.t - 10);
  ctx.textAlign = 'left';
}

function scrub(ev) {
  if (!chart) return;
  const r = canvas.getBoundingClientRect();
  const km = ((ev.clientX - r.left - chart.pad.l) / (r.width - chart.pad.l - chart.pad.r)) * chart.total;
  if (km < 0 || km > chart.total) return endScrub();
  const s = chart.samples.reduce((b, c) => (Math.abs(c.distKm - km) < Math.abs(b.distKm - km) ? c : b));
  const tip = $('profile-tip');
  tip.hidden = false;
  tip.style.left = `${Math.min(r.width - 90, Math.max(90, chart.x(s.distKm)))}px`;
  tip.textContent = `${s.distKm.toFixed(2)} km · ${Math.round(s.elevM)} m · ${(s.terrainSlopeDeg ?? 0).toFixed(1)}° ${classifySlope(s.terrainSlopeDeg ?? 0).label}`;
  scrubMarker.setLatLng([s.lat, s.lon]).addTo(map);
}
function endScrub() {
  $('profile-tip').hidden = true;
  scrubMarker.remove();
}
canvas.addEventListener('pointermove', scrub);
canvas.addEventListener('pointerdown', scrub);
canvas.addEventListener('pointerleave', endScrub);
new ResizeObserver(() => { drawProfile(); map.invalidateSize(); }).observe(canvas.parentElement);

/* ---------------- interactions ---------------- */

function setActiveStop(i) {
  ui.activeStop = Math.max(0, Math.min(i, store.getState().waypoints.length - 1));
  render();
}

let mapNoticeTimer = null;
function notice(text, ms) {
  const el = $('map-notice');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(mapNoticeTimer);
  if (ms) mapNoticeTimer = setTimeout(() => { el.hidden = true; }, ms);
}

// Tabs (WAI-ARIA tabs pattern: arrows/Home/End move between tabs)
const TABS = ['plan', 'stop', 'env', 'layers'];
function selectTab(id, focus = false) {
  ui.tab = id;
  TABS.forEach((t) => {
    const on = t === id;
    const tab = $(`tab-${t}`);
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    $(`view-${t}`).hidden = !on;
    if (on && focus) tab.focus();
  });
}
TABS.forEach((t, i) => {
  const tab = $(`tab-${t}`);
  tab.addEventListener('click', () => selectTab(t));
  tab.addEventListener('keydown', (e) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(TABS[(next + TABS.length) % TABS.length], true);
  });
});

$('stops').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    const i = Number(rm.dataset.remove);
    if (ui.activeStop >= i) ui.activeStop = Math.max(0, ui.activeStop - 1);
    store.removeWaypoint(i);
    return;
  }
  const btn = e.target.closest('[data-stop]');
  if (btn) {
    const i = Number(btn.dataset.stop);
    setActiveStop(i);
    map.panTo(store.getState().waypoints[i].pos);
  }
});

function setAdding(on) {
  ui.adding = on;
  $('add-hint').hidden = !on;
  $('btn-add').setAttribute('aria-pressed', String(on));
  $('btn-add').textContent = on ? 'Cancel adding' : 'Add stop';
  map.getContainer().style.cursor = on ? 'crosshair' : '';
}
$('btn-add').addEventListener('click', () => setAdding(!ui.adding));
map.on('click', (e) => {
  if (!ui.adding || !raster) return;
  const { lat, lng } = e.latlng;
  if (!raster.isWithinBounds(lat, lng)) {
    notice('Outside the terrain model — place stops inside the dashed outline', 4000);
    return;
  }
  const n = store.getState().waypoints.length;
  setAdding(false);
  ui.activeStop = n;
  store.addWaypoint({
    id: `stop-${Date.now()}`, name: `Stop ${n}`, pos: [lat, lng], type: 'science',
    objective: 'Added stop: set a science objective with the crew.', photo: NEW_STOP_PHOTO
  });
});

$('btn-reset').addEventListener('click', () => {
  stopPlay();
  ui.activeStop = 0;
  ui.abort = false;
  store.setWaypoints(clone(DEFAULT_ROUTE));
  fitRoute();
});
const fitRoute = () => map.fitBounds(result.profile.samples.map((s) => [s.lat, s.lon]), { padding: [24, 24] });

$('crew-mode').addEventListener('change', (e) => { ui.crew = e.target.value; renderAbort(); });
$('btn-abort').addEventListener('click', () => { ui.abort = !ui.abort; renderAbort(); });

$('btn-prev').addEventListener('click', () => focusStop(ui.activeStop - 1));
$('btn-next').addEventListener('click', () => focusStop(ui.activeStop + 1));
function focusStop(i) {
  setActiveStop(i);
  map.flyTo(store.getState().waypoints[ui.activeStop].pos, Math.max(map.getZoom(), 15), { duration: 0.8 });
}

function stopPlay() {
  clearInterval(ui.playTimer);
  ui.playTimer = null;
  $('btn-play').setAttribute('aria-pressed', 'false');
  $('btn-play').textContent = 'Play walkthrough';
}
$('btn-play').addEventListener('click', () => {
  if (ui.playTimer) return stopPlay();
  $('btn-play').setAttribute('aria-pressed', 'true');
  $('btn-play').textContent = 'Pause walkthrough';
  focusStop(0);
  ui.playTimer = setInterval(() => {
    if (ui.activeStop < store.getState().waypoints.length - 1) return focusStop(ui.activeStop + 1);
    stopPlay();
    focusStop(0);
    openDebrief();
  }, 4000);
});

function openDebrief() {
  const { plan, profile, verdict } = result;
  $('debrief-facts').innerHTML = [
    ['Status', LEVEL_TEXT[verdict.level]],
    ['Distance', `${profile.summary.totalKm.toFixed(2)} km`],
    ['EVA time', fmtH(plan.hours)],
    ['Climb', `${Math.round(profile.summary.climbM)} m`],
    ...Object.values(plan.consumables).map((c) => [`${c.label} left`, `${Math.round(c.pct)}%`]),
    ['Radiation dose', `${Math.round(plan.doseMicroSv)} µSv`]
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  openModal('debrief');
}

$('sol-select').addEventListener('change', (e) => { ui.solIdx = Number(e.target.value); recompute(); });
$('dust-slider').addEventListener('input', (e) => { ui.tau = Number(e.target.value); recompute(); });
document.querySelectorAll('[data-tau]').forEach((b) => b.addEventListener('click', () => { ui.tau = Number(b.dataset.tau); recompute(); }));

// Modals: focus moves in, Tab is trapped, Esc closes, focus returns
let modalReturn = null;
function openModal(id) {
  modalReturn = document.activeElement;
  $(id).hidden = false;
  $(id).querySelector('.btn-primary').focus();
}
function closeModal(id) {
  $(id).hidden = true;
  if (id === 'briefing') try { localStorage.setItem('mm-briefed', '1'); } catch { /* storage blocked */ }
  modalReturn?.focus?.();
}
$('btn-briefing').addEventListener('click', () => openModal('briefing'));
$('btn-start').addEventListener('click', () => closeModal('briefing'));
$('btn-debrief-close').addEventListener('click', () => closeModal('debrief'));
document.addEventListener('keydown', (e) => {
  const open = document.querySelector('.modal:not([hidden])');
  if (e.key === 'Escape') {
    if (open) closeModal(open.id);
    else if (ui.adding) setAdding(false);
    else if (ui.playTimer) stopPlay();
    return;
  }
  if (e.key === 'Tab' && open) {
    const f = [...open.querySelectorAll('button, a[href], select, input')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

function renderNet() { $('net-status').hidden = navigator.onLine; }
window.addEventListener('online', renderNet);
window.addEventListener('offline', renderNet);

/* ---------------- layers panel ---------------- */

function layerRow(o, kind) {
  return `<div class="layer">
    <label><input type="checkbox" data-${kind}="${o.id}"${o.on ? ' checked' : ''}> ${esc(o.name)}</label>
    <p class="layer-detail">${esc(o.detail)}</p>
    ${o.layer.setOpacity ? `<input type="range" min="0.1" max="1" step="0.05" value="${o.opacity}" data-${kind}-opacity="${o.id}" aria-label="${esc(o.name)} opacity">` : ''}
  </div>`;
}
function renderLayers() {
  $('overlay-list').innerHTML = overlays.map((o) => layerRow(o, 'overlay')).join('');
  $('basemap-list').innerHTML = basemaps.map((b) => layerRow(b, 'basemap')).join('');
  $('sources').innerHTML = SOURCES.map(([label, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a></li>`).join('');
}
$('view-layers').addEventListener('input', (e) => {
  const t = e.target;
  const find = (kind) => (kind === 'overlay' ? overlays : basemaps).find((o) => o.id === (t.dataset[kind] || t.dataset[`${kind}Opacity`]));
  const o = find('overlay') || find('basemap');
  if (!o) return;
  if (t.type === 'checkbox') {
    o.on = t.checked;
    if (t.checked) { o.layer.addTo(map); o.onEnable?.(); } else map.removeLayer(o.layer);
  } else {
    o.opacity = Number(t.value);
    o.layer.setOpacity(o.opacity);
  }
});

/* ---------------- boot ---------------- */

async function boot() {
  renderNet();
  $('site-name').textContent = `${SITE.name} · ${SITE.region}`;
  $('briefing-goal').textContent = SITE.scienceGoal;
  let briefed = false;
  try { briefed = localStorage.getItem('mm-briefed') === '1'; } catch { /* storage blocked */ }
  if (!briefed) openModal('briefing');

  // Latest REMS sols straight from the feed; the bundled snapshot covers offline / feed down
  try {
    const r = await fetch(REMS_FEED, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    sols = parseRems(await r.json());
    if (!sols.length) throw new Error('empty feed');
    $('wx-source').textContent = 'Live from the Curiosity REMS feed.';
  } catch {
    try {
      const snap = await (await fetch(SITE.weather)).json();
      sols = snap.sols || [];
      $('wx-source').textContent = `Offline snapshot from ${snap.fetchedAt.slice(0, 10)} (live feed unreachable).`;
    } catch {
      sols = [];
    }
  }
  $('sol-select').innerHTML = sols.map((s, i) => `<option value="${i}">Sol ${s.sol} · ${esc(s.earthDate)}</option>`).join('');

  try {
    raster = await new ElevationService().load(SITE.terrainHeader);
  } catch (err) {
    $('status-pill').dataset.level = 'nogo';
    $('status-pill-text').textContent = 'Terrain unavailable';
    notice(`Could not load the HiRISE terrain model (${err.message}). Reload when online.`);
    return;
  }
  buildOverlays();
  renderLayers();
  store.subscribe((_, keys) => { if (keys.includes('route')) recompute(); });
  recompute();
  fitRoute();

  // DEMO_KEY allows ~30 calls/hour, so reuse a successful check for an hour
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem('mm-sw')); } catch { /* storage blocked */ }
  const fresh = cached && Date.now() - Date.parse(cached.checkedAt) < 36e5;
  (fresh ? Promise.resolve(cached) : fetchSpaceWeather()).then((sw) => {
    if (!sw.error) try { localStorage.setItem('mm-sw', JSON.stringify(sw)); } catch { /* storage blocked */ }
    spaceWeather = sw;
    $('sw-text').textContent = sw.text;
    recompute();
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

boot();
