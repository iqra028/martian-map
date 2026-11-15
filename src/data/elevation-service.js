/**
 * Headless Martian Elevation Service
 * Repository: martian-map
 * 
 * Serves as the single authoritative elevation and terrain provider for both the 2D Leaflet
 * GIS workspace and the future 3D Three.js tactical EVA workspace.
 * 
 * Core architectural principle:
 * One source dataset. One geographic interpretation. One terrain-data interface. Multiple independent renderers.
 */

import { loadDtmRaster, DtmRaster } from './dtm-loader.js';

export class ElevationService {
  constructor(options = {}) {
    this.status = 'UNINITIALIZED'; // 'UNINITIALIZED' | 'LOADING' | 'READY' | 'ERROR'
    this.activeRaster = null;
    this.error = null;
    this.regionalFallback = options.regionalFallback || null;
  }

  /**
   * Loads a DTM raster source into the elevation service.
   * Can accept a pre-parsed object, JSON string, or fetch a remote/local URL.
   * 
   * @param {Object|string} source - Raster config or URL
   * @returns {Promise<DtmRaster>}
   */
  async load(source) {
    this.status = 'LOADING';
    this.error = null;

    try {
      let data = source;

      // In browser or Node environment, if source is a URL/path string ending in .json:
      if (typeof source === 'string' && (source.startsWith('http') || source.endsWith('.json'))) {
        if (typeof fetch === 'function') {
          const resp = await fetch(source);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} ${resp.statusText} fetching DTM source: ${source}`);
          }
          data = await resp.json();
        } else {
          // Node fallback if fs available
          const fs = await import('fs');
          const content = fs.readFileSync(source, 'utf-8');
          data = JSON.parse(content);
        }
      }

      this.activeRaster = loadDtmRaster(data);
      this.status = 'READY';
      return this.activeRaster;
    } catch (err) {
      this.status = 'ERROR';
      this.error = err.message;
      this.activeRaster = null;
      throw err;
    }
  }

  /**
   * Returns current service readiness status.
   * @returns {'UNINITIALIZED'|'LOADING'|'READY'|'ERROR'}
   */
  getStatus() {
    return this.status;
  }

  /**
   * Returns whether a valid raster is loaded and ready for sampling.
   * @returns {boolean}
   */
  isReady() {
    return this.status === 'READY' && this.activeRaster !== null;
  }

  /**
   * Returns normalized metadata for the active dataset.
   * @returns {Object|null}
   */
  getMetadata() {
    return this.activeRaster ? { ...this.activeRaster.metadata } : null;
  }

  /**
   * Returns geographic bounding coordinates of active dataset.
   * @returns {{west: number, east: number, south: number, north: number}|null}
   */
  getBounds() {
    return this.activeRaster ? { ...this.activeRaster.bounds } : null;
  }

  /**
   * Tests if coordinates fall within the high-resolution terrain coverage.
   * @param {number} lat - Latitude in degrees
   * @param {number} lon - Longitude in degrees
   * @returns {boolean}
   */
  isWithinBounds(lat, lon) {
    if (!this.isReady()) return false;
    return this.activeRaster.isWithinBounds(lat, lon);
  }

  /**
   * Samples elevation at a given Martian coordinate.
   * 
   * @param {number} lat - Planetocentric latitude in degrees
   * @param {number} lon - Positive East longitude in degrees
   * @param {Object} [options]
   * @returns {import('./dtm-loader.js').ElevationSampleResult}
   */
  sampleElevation(lat, lon, options = {}) {
    if (!this.isReady()) {
      return {
        elevation: null,
        valid: false,
        status: 'UNINITIALIZED',
        method: null,
        datasetId: null,
        verticalReference: 'MOLA Areoid',
        pixelCoords: null,
        error: 'ElevationService has not loaded an active terrain dataset'
      };
    }

    const sample = this.activeRaster.sampleElevation(lat, lon, options);

    // If out of bounds and a regional fallback handler is registered, query it
    if (sample.status === 'OUT_OF_BOUNDS' && typeof this.regionalFallback === 'function') {
      const fallbackElevation = this.regionalFallback(lat, lon);
      if (typeof fallbackElevation === 'number' && !isNaN(fallbackElevation)) {
        return {
          elevation: fallbackElevation,
          valid: true,
          status: 'VALID',
          method: 'regional_fallback',
          datasetId: 'MOLA_REGIONAL_BASELINE',
          verticalReference: 'MOLA Areoid',
          pixelCoords: null,
          quality: 'REGIONAL_COARSE_FALLBACK_463M'
        };
      }
    }

    return sample;
  }

  /**
   * Returns the normalized terrain data model for 2D and 3D renderers.
   * @returns {Object|null}
   */
  getTerrainData() {
    return this.activeRaster ? this.activeRaster.toNormalizedModel() : null;
  }

  /**
   * Returns the underlying raw elevation typed array (Float32Array) for 3D mesh generation.
   * @returns {Float32Array|null}
   */
  getElevationBuffer() {
    return this.activeRaster ? this.activeRaster.data : null;
  }

  /**
   * Resets the service to uninitialized state.
   */
  reset() {
    this.status = 'UNINITIALIZED';
    this.activeRaster = null;
    this.error = null;
  }
}

// Export default singleton instance for simple cross-module sharing
export const defaultElevationService = new ElevationService();
