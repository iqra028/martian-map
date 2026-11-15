#!/usr/bin/env node
/**
 * Builds the app's terrain assets from the HiRISE PDS DTM.
 *
 *   node tools/build-terrain.mjs <path/to/DTEEC_006855_1750_007501_1750_A01.IMG>
 *
 * Outputs (data/terrain/):
 *   sakarya-10m.json   grid header (bounds, projection, encoding)
 *   sakarya-10m.bin    Int16 elevations, decimetres above BASE_M, row-major north→south
 *   hillshade.png      shaded relief overlay (transparent where no data)
 *   slope.png          slope-hazard overlay (steep / impassable cells)
 *
 * The 1 m DTM (438 MB) is block-averaged to 10 m so the app ships ~2 MB of terrain.
 * Download: see data/manifest.json → downloadUrl.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SLOPE_CLASSES, slopeFromGrid } from '../src/data/terrain-analysis.js';

const BLOCK = 10;
const BASE_M = -4100;           // Int16 offset; DTM valid range is -4043.75 … -2415.92 m
const NODATA_I16 = -32768;
const MIN_VALID_FRACTION = 0.5; // block needs ≥50% valid 1 m pixels

const imgPath = process.argv[2];
if (!imgPath) {
  console.error('usage: node tools/build-terrain.mjs <DTEEC_…_A01.IMG>');
  process.exit(1);
}

const buf = readFileSync(imgPath);
const label = buf.subarray(0, 64 * 1024).toString('latin1');
const kw = (name) => {
  const m = label.match(new RegExp(`^\\s*${name}\\s*=\\s*([^\\s<]+)`, 'm'));
  if (!m) throw new Error(`PDS label missing ${name}`);
  return m[1];
};

const recordBytes = Number(kw('RECORD_BYTES'));
const imageRecord = Number(kw('\\^IMAGE'));
const lines = Number(kw('LINES'));
const samples = Number(kw('LINE_SAMPLES'));
if (kw('SAMPLE_TYPE') !== 'PC_REAL' || kw('SAMPLE_BITS') !== '32') throw new Error('expected 32-bit PC_REAL');
const validMin = Number(kw('VALID_MINIMUM'));
const validMax = Number(kw('VALID_MAXIMUM'));
const proj = {
  centerLatitudeDegrees: Number(kw('CENTER_LATITUDE')),
  centerLongitudeDegrees: Number(kw('CENTER_LONGITUDE')),
  mapResolutionPixPerDeg: Number(kw('MAP_RESOLUTION')),
  metersPerPixel: Number(kw('MAP_SCALE')),
  lineProjectionOffset: Number(kw('LINE_PROJECTION_OFFSET')),
  sampleProjectionOffset: Number(kw('SAMPLE_PROJECTION_OFFSET'))
};
const bounds = {
  south: Number(kw('MINIMUM_LATITUDE')),
  north: Number(kw('MAXIMUM_LATITUDE')),
  west: Number(kw('WESTERNMOST_LONGITUDE')),
  east: Number(kw('EASTERNMOST_LONGITUDE'))
};

const offset = (imageRecord - 1) * recordBytes;
const expected = offset + lines * samples * 4;
if (buf.length < expected) throw new Error(`IMG truncated: ${buf.length} < ${expected} bytes`);
const raw = new Float32Array(buf.buffer, buf.byteOffset + offset, lines * samples);

const outW = Math.ceil(samples / BLOCK);
const outH = Math.ceil(lines / BLOCK);
const grid = new Float32Array(outW * outH).fill(NaN);
const sum = new Float64Array(outW);
const cnt = new Uint32Array(outW);

for (let by = 0; by < outH; by++) {
  sum.fill(0); cnt.fill(0);
  const y1 = Math.min(lines, (by + 1) * BLOCK);
  for (let y = by * BLOCK; y < y1; y++) {
    const row = y * samples;
    for (let x = 0; x < samples; x++) {
      const v = raw[row + x];
      if (v >= validMin && v <= validMax) { sum[(x / BLOCK) | 0] += v; cnt[(x / BLOCK) | 0]++; }
    }
  }
  for (let bx = 0; bx < outW; bx++) {
    const area = (Math.min(samples, (bx + 1) * BLOCK) - bx * BLOCK) * (y1 - by * BLOCK);
    if (cnt[bx] >= area * MIN_VALID_FRACTION) grid[by * outW + bx] = sum[bx] / cnt[bx];
  }
}

const i16 = new Int16Array(outW * outH);
let eMin = Infinity, eMax = -Infinity, valid = 0;
for (let i = 0; i < grid.length; i++) {
  const v = grid[i];
  if (Number.isNaN(v)) { i16[i] = NODATA_I16; continue; }
  i16[i] = Math.round((v - BASE_M) * 10);
  eMin = Math.min(eMin, v); eMax = Math.max(eMax, v); valid++;
}

const outDir = new URL('../data/terrain/', import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('sakarya-10m.bin', outDir), Buffer.from(i16.buffer));

const cellM = proj.metersPerPixel * BLOCK;
const header = {
  id: 'DTEEC_006855_1750_007501_1750_A01_10M',
  source: {
    name: "HiRISE DTM — Chasm in Gale Crater's Interior Mound (Sakarya Vallis)",
    productId: 'DTEEC_006855_1750_007501_1750_A01',
    stereoPair: ['PSP_006855_1750', 'PSP_007501_1750'],
    institution: 'University of Arizona LPL / NASA JPL (MRO HiRISE)',
    url: 'https://www.uahirise.org/dtm/dtm.php?ID=PSP_006855_1750',
    processing: `Block-averaged ${BLOCK}×${BLOCK} from 1 m PDS DTM by tools/build-terrain.mjs`
  },
  metadata: {
    lines: outH,
    samples: outW,
    resolutionX: cellM,
    resolutionY: cellM,
    units: 'meters',
    verticalReference: 'MOLA Areoid (Mars 2000 Datum)',
    noDataValue: NODATA_I16,
    validMinimum: validMin,
    validMaximum: validMax
  },
  // Pixel (j,i) centre ↔ original continuous coordinate BLOCK*(j+0.5)
  projection: {
    centerLatitudeDegrees: proj.centerLatitudeDegrees,
    centerLongitudeDegrees: proj.centerLongitudeDegrees,
    mapResolutionPixPerDeg: proj.mapResolutionPixPerDeg / BLOCK,
    lineProjectionOffset: proj.lineProjectionOffset / BLOCK - 0.5,
    sampleProjectionOffset: proj.sampleProjectionOffset / BLOCK - 0.5
  },
  bounds,
  elevation: { min: eMin, max: eMax },
  encoding: { type: 'int16-le', file: 'sakarya-10m.bin', scale: 0.1, offset: BASE_M, noData: NODATA_I16 }
};
writeFileSync(new URL('sakarya-10m.json', outDir), JSON.stringify(header, null, 1) + '\n');

/* ---------- overlays ---------- */
const at = (x, y) => (x < 0 || y < 0 || x >= outW || y >= outH ? NaN : grid[y * outW + x]);

const shade = Buffer.alloc(outW * outH * 4);
const slopeImg = Buffer.alloc(outW * outH * 4);
// Sun from the north-west, 45° up: light vector in (east, north, up)
const az = (315 * Math.PI) / 180, alt = (45 * Math.PI) / 180;
const light = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
const hazardColors = { steep: [227, 163, 59, 90], impassable: [229, 83, 75, 130] };

for (let y = 0; y < outH; y++) {
  for (let x = 0; x < outW; x++) {
    const i = y * outW + x, p = i * 4;
    const s = slopeFromGrid(at, x, y, cellM);
    if (!s) continue;
    // Hillshade = surface normal · light
    const n = Math.hypot(s.dzdx, s.dzdy, 1);
    const h = Math.max(0, (-s.dzdx * light[0] - s.dzdy * light[1] + light[2]) / n);
    const g = Math.round(40 + 215 * h);
    shade[p] = g; shade[p + 1] = g; shade[p + 2] = g; shade[p + 3] = 255;

    const cls = SLOPE_CLASSES.find((c) => s.slopeDeg < c.maxDeg);
    const col = hazardColors[cls.id];
    if (col) { slopeImg[p] = col[0]; slopeImg[p + 1] = col[1]; slopeImg[p + 2] = col[2]; slopeImg[p + 3] = col[3]; }
  }
}

writeFileSync(new URL('hillshade.png', outDir), encodePng(outW, outH, shade));
writeFileSync(new URL('slope.png', outDir), encodePng(outW, outH, slopeImg));

console.log(`grid ${outW}×${outH} @ ${cellM.toFixed(2)} m, ${valid} valid cells, elev ${eMin.toFixed(1)}…${eMax.toFixed(1)} m`);

/* ---------- minimal RGBA PNG encoder ---------- */
function encodePng(w, h, rgba) {
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
