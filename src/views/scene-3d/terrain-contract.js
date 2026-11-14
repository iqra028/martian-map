/**
 * 3D Terrain Data Interface Contract (Placeholder & Specification)
 * Repository: martian-map
 * 
 * Defines the contract through which future 3D renderers (Three.js) will consume normalized
 * terrain grids from the ElevationService.
 * 
 * IMPORTANT:
 * This module defines the architectural interface only. It does NOT implement the 3D viewport,
 * Three.js scene graph, meshes, lighting, or camera controllers (scheduled for Phase 4).
 */

import { geodeticToTrueEnu } from '../../geo/coordinates.js';

/**
 * Transforms normalized terrain data from ElevationService into a format directly consumable
 * by Three.js BufferGeometry or heightfield generators without requiring the 3D renderer
 * to know about GeoTIFF internals, PDS headers, or map projections.
 * 
 * @param {import('../../data/elevation-service.js').ElevationService} elevationService
 * @param {Object} [originOverride] - Local tangent plane origin {lat, lon, alt}
 * @returns {Object} 3D Terrain Render Specification
 */
export function createTerrainRenderSpec(elevationService, originOverride = null) {
  if (!elevationService || !elevationService.isReady()) {
    throw new Error('ElevationService must be loaded and ready to create terrain render spec');
  }

  const terrain = elevationService.getTerrainData();
  const meta = terrain.metadata;
  const bounds = terrain.bounds;

  // Compute or apply local tangent plane origin:
  const origin = originOverride || {
    lat: (bounds.north + bounds.south) / 2.0,
    lon: (bounds.west + bounds.east) / 2.0,
    alt: (terrain.elevation.min + terrain.elevation.max) / 2.0
  };

  // Convert bounding corners to local topocentric ENU metric coordinates:
  const swEnu = geodeticToTrueEnu(bounds.south, bounds.west, terrain.elevation.min, origin.lat, origin.lon, origin.alt);
  const neEnu = geodeticToTrueEnu(bounds.north, bounds.east, terrain.elevation.max, origin.lat, origin.lon, origin.alt);

  return {
    isPlaceholderContract: true,
    datasetId: terrain.id,
    sourceMetadata: {
      name: terrain.source.name,
      productId: terrain.source.productId,
      targetFeature: terrain.source.targetFeature || 'Gale Crater'
    },
    gridDimensions: {
      columns: meta.samples,
      rows: meta.lines,
      totalVertices: meta.samples * meta.lines
    },
    metricBounds: {
      widthMeters: Math.abs(neEnu.east - swEnu.east),
      heightMeters: Math.abs(neEnu.north - swEnu.north),
      minElevationMeters: terrain.elevation.min,
      maxElevationMeters: terrain.elevation.max
    },
    localTangentOrigin: {
      latitude: origin.lat,
      longitude: origin.lon,
      elevation: origin.alt
    },
    verticalReference: meta.verticalReference,
    noDataValue: meta.noDataValue,
    // Elevation data buffer (Float32Array)
    elevationBuffer: elevationService.getElevationBuffer()
  };
}
