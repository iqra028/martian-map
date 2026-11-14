/**
 * Martian DTM Raster Loader & Elevation Sampling Engine
 * Repository: martian-map
 * 
 * Implements a normalized, multi-renderer terrain model decoupled from Leaflet and Three.js.
 * Handles georeferenced elevation grids with nearest-neighbour and bilinear interpolation,
 * no-data masking, and bounds validation.
 * 
 * Standards Reference:
 * - NASA PDS3 / ISIS Equirectangular DTM Specification
 * - MOLA Areoid Gravitational Equipotential Surface (Mars 2000 Datum)
 */

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

/**
 * Standard Normalized Terrain Model representation.
 */
export class DtmRaster {
  /**
   * @param {Object} config - Normalized raster configuration
   */
  constructor(config) {
    if (!config) throw new Error('DtmRaster requires configuration object');

    this.id = config.id || 'unknown-dtm';
    this.source = config.source || {
      name: 'Unknown Dataset',
      productId: 'UNKNOWN',
      target: 'Mars'
    };

    const meta = config.metadata || {};
    const linesVal = meta.lines !== undefined ? meta.lines : (meta.height !== undefined ? meta.height : 0);
    const samplesVal = meta.samples !== undefined ? meta.samples : (meta.width !== undefined ? meta.width : 0);

    this.metadata = {
      lines: linesVal,
      samples: samplesVal,
      width: samplesVal,
      height: linesVal,
      resolutionX: meta.resolutionX || 1.0,
      resolutionY: meta.resolutionY || 1.0,
      mapResolutionPixPerDeg: meta.mapResolutionPixPerDeg || null,
      projectionType: meta.projectionType || 'EQUIRECTANGULAR',
      horizontalCrs: meta.horizontalCrs || 'IAU_2000:Mars / Planetocentric',
      positiveLongitudeDirection: meta.positiveLongitudeDirection || 'EAST',
      verticalReference: meta.verticalReference || 'MOLA Areoid (Mars 2000 Datum)',
      units: meta.units || 'meters',
      noDataValue: meta.noDataValue !== undefined ? meta.noDataValue : -3.4028226550889045e+38,
      validMinimum: meta.validMinimum !== undefined ? meta.validMinimum : -Infinity,
      validMaximum: meta.validMaximum !== undefined ? meta.validMaximum : Infinity
    };

    if (this.metadata.lines <= 0 || this.metadata.samples <= 0) {
      throw new Error(`Invalid raster dimensions: ${this.metadata.samples}x${this.metadata.lines}`);
    }

    const b = config.bounds || {};
    if (b.west === undefined || b.east === undefined || b.south === undefined || b.north === undefined) {
      throw new Error('DtmRaster requires complete geographic bounds (west, east, south, north)');
    }
    if (b.north <= b.south) {
      throw new Error(`Invalid latitude bounds: north (${b.north}) <= south (${b.south})`);
    }
    if (b.east <= b.west) {
      throw new Error(`Invalid longitude bounds: east (${b.east}) <= west (${b.west})`);
    }

    this.bounds = {
      west: b.west,
      east: b.east,
      south: b.south,
      north: b.north
    };

    this.projection = config.projection || null;

    // Validate raw raster data buffer
    if (!config.data) {
      throw new Error('DtmRaster requires elevation data buffer');
    }

    const expectedLength = this.metadata.lines * this.metadata.samples;
    if (config.data.length !== expectedLength) {
      throw new Error(
        `Raster data length mismatch: expected ${expectedLength} (${this.metadata.samples}x${this.metadata.lines}), got ${config.data.length}`
      );
    }

    // Store as Float32Array for high performance memory access
    this.data = config.data instanceof Float32Array ? config.data : new Float32Array(config.data);

    // Compute min / max elevation if not provided
    if (config.elevation && config.elevation.min !== undefined && config.elevation.max !== undefined) {
      this.elevation = { min: config.elevation.min, max: config.elevation.max };
    } else {
      this.elevation = this._computeElevationRange();
    }
  }

  /**
   * Internal helper to scan valid elevation min/max ignoring noData values.
   */
  _computeElevationRange() {
    let min = Infinity;
    let max = -Infinity;
    const len = this.data.length;
    const noData = this.metadata.noDataValue;

    for (let i = 0; i < len; i++) {
      const v = this.data[i];
      if (this.isValidElevation(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max
    };
  }

  /**
   * Tests whether an elevation value is scientifically valid (not null, NaN, or noData).
   * @param {number} value
   * @returns {boolean}
   */
  isValidElevation(value) {
    if (value === null || value === undefined || isNaN(value)) return false;
    if (Math.abs(value - this.metadata.noDataValue) < 1e-4) return false;
    if (value < this.metadata.validMinimum || value > this.metadata.validMaximum) return false;
    return true;
  }

  /**
   * Checks if a geographic coordinate falls within the raster bounding box.
   * @param {number} lat - Planetocentric latitude in degrees
   * @param {number} lon - Positive East longitude in degrees
   * @returns {boolean}
   */
  isWithinBounds(lat, lon) {
    return lat >= this.bounds.south &&
           lat <= this.bounds.north &&
           lon >= this.bounds.west &&
           lon <= this.bounds.east;
  }

  /**
   * Converts geographic coordinates to floating-point raster pixel coordinates (line, sample).
   * 0-based indexing: sample in [0, samples - 1], line in [0, lines - 1].
   * 
   * @param {number} lat - Latitude in degrees
   * @param {number} lon - Longitude in degrees
   * @returns {{line: number, sample: number}}
   */
  geographicToPixel(lat, lon) {
    // If exact PDS projection parameters are available, use ISIS equirectangular formula:
    if (
      this.projection &&
      this.projection.mapResolutionPixPerDeg &&
      this.projection.lineProjectionOffset !== undefined &&
      this.projection.sampleProjectionOffset !== undefined
    ) {
      const p = this.projection;
      const clat = p.centerLatitudeDegrees !== undefined ? p.centerLatitudeDegrees : (p.centerLatitude || 0.0);
      const clon = p.centerLongitudeDegrees !== undefined ? p.centerLongitudeDegrees : (p.centerLongitude || 0.0);
      const cosClat = Math.cos(clat * DEG2RAD);

      const sample = (lon - clon) * p.mapResolutionPixPerDeg * cosClat + p.sampleProjectionOffset;
      const line = -(lat * p.mapResolutionPixPerDeg) + p.lineProjectionOffset;

      return { line, sample };
    }

    // Linear interpolation between bounding box edges:
    const xFrac = (lon - this.bounds.west) / (this.bounds.east - this.bounds.west);
    const yFrac = (this.bounds.north - lat) / (this.bounds.north - this.bounds.south);

    const sample = xFrac * (this.metadata.samples - 1);
    const line = yFrac * (this.metadata.lines - 1);

    return { line, sample };
  }

  /**
   * Converts raster pixel coordinates (line, sample) back to geographic coordinates (lat, lon).
   * 
   * @param {number} line - Line (row) index
   * @param {number} sample - Sample (column) index
   * @returns {{lat: number, lon: number}}
   */
  pixelToGeographic(line, sample) {
    if (
      this.projection &&
      this.projection.mapResolutionPixPerDeg &&
      this.projection.lineProjectionOffset !== undefined &&
      this.projection.sampleProjectionOffset !== undefined
    ) {
      const p = this.projection;
      const clat = p.centerLatitudeDegrees !== undefined ? p.centerLatitudeDegrees : (p.centerLatitude || 0.0);
      const clon = p.centerLongitudeDegrees !== undefined ? p.centerLongitudeDegrees : (p.centerLongitude || 0.0);
      const cosClat = Math.cos(clat * DEG2RAD);

      const lat = -(line - p.lineProjectionOffset) / p.mapResolutionPixPerDeg;
      const lon = clon + (sample - p.sampleProjectionOffset) / (p.mapResolutionPixPerDeg * cosClat);

      return { lat, lon };
    }

    const xFrac = sample / (this.metadata.samples - 1);
    const yFrac = line / (this.metadata.lines - 1);

    const lon = this.bounds.west + xFrac * (this.bounds.east - this.bounds.west);
    const lat = this.bounds.north - yFrac * (this.bounds.north - this.bounds.south);

    return { lat, lon };
  }

  /**
   * Reads raw elevation value at discrete integer pixel (col, row).
   * 
   * @param {number} col - Sample index [0, samples-1]
   * @param {number} row - Line index [0, lines-1]
   * @returns {number|null} Elevation value or null if out-of-bounds or no-data
   */
  getPixelValue(col, row) {
    if (col < 0 || col >= this.metadata.samples || row < 0 || row >= this.metadata.lines) {
      return null;
    }
    const idx = row * this.metadata.samples + col;
    const val = this.data[idx];
    return this.isValidElevation(val) ? val : null;
  }

  /**
   * Samples elevation at a given planetocentric coordinate.
   * Supports nearest-neighbor and bilinear interpolation.
   * 
   * Never interpolates through no-data pixels; if any adjacent node is no-data,
   * falls back safely or flags NO_DATA.
   * 
   * @param {number} lat - Planetocentric latitude in degrees
   * @param {number} lon - Positive East longitude in degrees
   * @param {Object} [options]
   * @param {'bilinear'|'nearest'} [options.method='bilinear']
   * @returns {ElevationSampleResult}
   */
  sampleElevation(lat, lon, options = {}) {
    const method = options.method === 'nearest' ? 'nearest' : 'bilinear';

    // Validate inputs
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      return {
        elevation: null,
        valid: false,
        status: 'INVALID_INPUT',
        method: null,
        datasetId: this.id,
        verticalReference: this.metadata.verticalReference,
        pixelCoords: null,
        error: `Invalid input coordinates: lat=${lat}, lon=${lon}`
      };
    }

    // Check bounds
    if (!this.isWithinBounds(lat, lon)) {
      return {
        elevation: null,
        valid: false,
        status: 'OUT_OF_BOUNDS',
        method: null,
        datasetId: this.id,
        verticalReference: this.metadata.verticalReference,
        pixelCoords: null,
        error: `Coordinates (${lat.toFixed(5)}°, ${lon.toFixed(5)}°) fall outside dataset bounds`
      };
    }

    const { line, sample } = this.geographicToPixel(lat, lon);

    // Nearest-neighbour sampling
    if (method === 'nearest') {
      const col = Math.round(Math.max(0, Math.min(this.metadata.samples - 1, sample)));
      const row = Math.round(Math.max(0, Math.min(this.metadata.lines - 1, line)));
      const val = this.getPixelValue(col, row);

      if (val === null) {
        return {
          elevation: null,
          valid: false,
          status: 'NO_DATA',
          method: 'nearest',
          datasetId: this.id,
          verticalReference: this.metadata.verticalReference,
          pixelCoords: { line: row, sample: col }
        };
      }

      return {
        elevation: val,
        valid: true,
        status: 'VALID',
        method: 'nearest',
        datasetId: this.id,
        verticalReference: this.metadata.verticalReference,
        pixelCoords: { line: row, sample: col }
      };
    }

    // Bilinear interpolation
    const c0 = Math.floor(sample);
    const r0 = Math.floor(line);
    const c1 = Math.min(this.metadata.samples - 1, c0 + 1);
    const r1 = Math.min(this.metadata.lines - 1, r0 + 1);

    const v00 = this.getPixelValue(c0, r0);
    const v10 = this.getPixelValue(c1, r0);
    const v01 = this.getPixelValue(c0, r1);
    const v11 = this.getPixelValue(c1, r1);

    // If any corner is noData, do not fabricate elevation by interpolating across missing data
    if (v00 === null || v10 === null || v01 === null || v11 === null) {
      // Fallback: check if the exact rounded nearest neighbor is valid
      const nearestCol = Math.round(sample);
      const nearestRow = Math.round(line);
      const nearestVal = this.getPixelValue(nearestCol, nearestRow);

      if (nearestVal !== null && options.allowNearestFallbackOnNoData) {
        return {
          elevation: nearestVal,
          valid: true,
          status: 'VALID',
          method: 'nearest',
          datasetId: this.id,
          verticalReference: this.metadata.verticalReference,
          pixelCoords: { line, sample },
          quality: 'FALLBACK_NEAREST_DUE_TO_LOCAL_NO_DATA'
        };
      }

      return {
        elevation: null,
        valid: false,
        status: 'NO_DATA',
        method: 'bilinear',
        datasetId: this.id,
        verticalReference: this.metadata.verticalReference,
        pixelCoords: { line, sample },
        error: 'One or more neighboring pixels contain no-data'
      };
    }

    // Bilinear formula
    const wx = c1 === c0 ? 0.0 : Math.max(0.0, Math.min(1.0, sample - c0));
    const wy = r1 === r0 ? 0.0 : Math.max(0.0, Math.min(1.0, line - r0));

    const top = (1.0 - wx) * v00 + wx * v10;
    const bottom = (1.0 - wx) * v01 + wx * v11;
    const interpolated = (1.0 - wy) * top + wy * bottom;

    return {
      elevation: interpolated,
      valid: true,
      status: 'VALID',
      method: 'bilinear',
      datasetId: this.id,
      verticalReference: this.metadata.verticalReference,
      pixelCoords: { line, sample }
    };
  }

  /**
   * Exports normalized model representation for consumers (e.g. 3D heightfield generator).
   */
  toNormalizedModel() {
    return {
      id: this.id,
      source: this.source,
      metadata: { ...this.metadata },
      bounds: { ...this.bounds },
      projection: this.projection ? { ...this.projection } : null,
      elevation: { ...this.elevation }
    };
  }
}

/**
 * Loads a DtmRaster from JSON object, string, or typed array payload.
 * 
 * @param {Object|string} source - JSON data or configuration
 * @returns {DtmRaster}
 */
export function loadDtmRaster(source) {
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return new DtmRaster(parsed);
    } catch (e) {
      throw new Error(`Failed to parse DTM JSON source: ${e.message}`);
    }
  } else if (typeof source === 'object' && source !== null) {
    return new DtmRaster(source);
  }
  throw new Error(`Unsupported DTM source type: ${typeof source}`);
}

/**
 * @typedef {Object} ElevationSampleResult
 * @property {number|null} elevation - Sampled elevation in meters (or null if invalid)
 * @property {boolean} valid - Whether the sample is valid
 * @property {'VALID'|'OUT_OF_BOUNDS'|'NO_DATA'|'INVALID_INPUT'} status - Status code
 * @property {'bilinear'|'nearest'|null} method - Sampling method used
 * @property {string} datasetId - Source dataset product ID
 * @property {string} verticalReference - Datum name
 * @property {{line: number, sample: number}|null} pixelCoords - Pixel location
 * @property {string} [quality] - Optional quality note
 * @property {string} [error] - Error explanation if invalid
 */
