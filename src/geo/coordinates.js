/**
 * Planetary Geodesic & Coordinate Transformation Utilities for Mars
 * Repository: martian-map
 * 
 * Standards Reference:
 * - IAU 2000 / IAU 2015 Mars Cartographic Constants
 * - Planetocentric Latitude (-90° to +90°), Positive East Longitude (0° to 360° or -180° to +180°)
 * - Vertical Datum: MOLA Areoid Gravitational Equipotential Surface (Mars 2000 Datum)
 * 
 * Coordinate Transformations Provided:
 * 1. True 3D Topocentric East-North-Up (ENU):
 *    Transforms planetocentric geodetic coordinates through Mars-Centered Cartesian (MCF)
 *    coordinates and applies a local tangent plane rotation matrix at (lat0, lon0).
 *    Strictly accounts for planetary curvature (surface drops ~d^2 / (2R) below tangent plane).
 * 2. Local Equirectangular Tangent Approximation:
 *    A planar approximation where East = R * cos(phi0) * delta_lambda and North = R * delta_phi.
 *    Valid only for small local areas (<10 km).
 */

export const MARS = {
  // Mean volumetric radius in meters (standard for spherical geodesic distance)
  RADIUS_MEAN: 3389500.0,
  // Equatorial semi-major axis (a) in meters
  RADIUS_EQUATORIAL: 3396190.0,
  // Polar semi-minor axis (b) in meters
  RADIUS_POLAR: 3376200.0,
  // Flattening f = (a - b) / a
  FLATTENING: 0.005886008,
  // Standard surface gravity in m/s^2
  GRAVITY: 3.72076
};

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

/**
 * Calculates geodesic distance in meters between two Mars planetocentric coordinates
 * using the spherical Haversine formula with the Martian mean volumetric radius.
 * 
 * @param {number} lat1 - Latitude in degrees (-90 to +90)
 * @param {number} lon1 - Longitude in degrees (-180 to +180 or 0 to 360)
 * @param {number} lat2 - Latitude in degrees
 * @param {number} lon2 - Longitude in degrees
 * @returns {number} Geodesic surface distance in meters
 */
export function marsDistanceMeters(lat1, lon1, lat2, lon2) {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const deltaPhi = (lat2 - lat1) * DEG2RAD;
  const deltaLambda = (lon2 - lon1) * DEG2RAD;

  const sinHalfPhi = Math.sin(deltaPhi / 2.0);
  const sinHalfLambda = Math.sin(deltaLambda / 2.0);

  const a = sinHalfPhi * sinHalfPhi +
            Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

  return MARS.RADIUS_MEAN * c;
}

/**
 * Converts Mars planetocentric coordinates (lat, lon, alt) to Mars-Centered Cartesian (MCF)
 * coordinates in meters.
 * 
 * @param {number} lat - Planetocentric latitude in decimal degrees
 * @param {number} lon - Positive East longitude in decimal degrees
 * @param {number} alt - Elevation in meters relative to MOLA Areoid
 * @returns {{x: number, y: number, z: number}}
 */
export function planetocentricToCartesian(lat, lon, alt = 0) {
  const phi = lat * DEG2RAD;
  const lambda = lon * DEG2RAD;
  const r = MARS.RADIUS_MEAN + alt;

  return {
    x: r * Math.cos(phi) * Math.cos(lambda),
    y: r * Math.cos(phi) * Math.sin(lambda),
    z: r * Math.sin(phi)
  };
}

/**
 * Converts Mars-Centered Cartesian (MCF) coordinates back to planetocentric coordinates.
 * 
 * @param {number} x - X coordinate in meters
 * @param {number} y - Y coordinate in meters
 * @param {number} z - Z coordinate in meters
 * @returns {{lat: number, lon: number, alt: number}}
 */
export function cartesianToPlanetocentric(x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const lat = Math.asin(z / r) * RAD2DEG;
  const lon = Math.atan2(y, x) * RAD2DEG;
  const alt = r - MARS.RADIUS_MEAN;

  return { lat, lon, alt };
}

/**
 * Transforms Mars planetocentric coordinates to a True Topocentric East-North-Up (ENU) frame
 * centered at a local tangent plane origin (originLat, originLon, originAlt).
 * 
 * Rigorously models 3D planetary curvature using Mars-Centered Cartesian vector displacement
 * and local tangent frame rotation matrix.
 * 
 * @param {number} lat - Target latitude in degrees
 * @param {number} lon - Target longitude in degrees
 * @param {number} alt - Target elevation in meters
 * @param {number} originLat - Tangent plane origin latitude in degrees
 * @param {number} originLon - Tangent plane origin longitude in degrees
 * @param {number} originAlt - Tangent plane origin elevation in meters
 * @returns {{east: number, north: number, up: number, x: number, y: number, z: number}}
 */
export function geodeticToTrueEnu(lat, lon, alt, originLat, originLon, originAlt = 0) {
  const p = planetocentricToCartesian(lat, lon, alt);
  const p0 = planetocentricToCartesian(originLat, originLon, originAlt);

  const dx = p.x - p0.x;
  const dy = p.y - p0.y;
  const dz = p.z - p0.z;

  const phi0 = originLat * DEG2RAD;
  const lam0 = originLon * DEG2RAD;

  const sinLam = Math.sin(lam0);
  const cosLam = Math.cos(lam0);
  const sinPhi = Math.sin(phi0);
  const cosPhi = Math.cos(phi0);

  // Topocentric ENU rotation matrix
  const east = -sinLam * dx + cosLam * dy;
  const north = -sinPhi * cosLam * dx - sinPhi * sinLam * dy + cosPhi * dz;
  const up = cosPhi * cosLam * dx + cosPhi * sinLam * dy + sinPhi * dz;

  return {
    east,
    north,
    up,
    // Three.js mapping (+X = East, +Y = Up, -Z = North):
    x: east,
    y: up,
    z: -north
  };
}

/**
 * Transforms True Topocentric ENU coordinates back to Mars planetocentric coordinates.
 * 
 * @param {number} east - East displacement in meters
 * @param {number} north - North displacement in meters
 * @param {number} up - Up displacement in meters
 * @param {number} originLat - Tangent plane origin latitude in degrees
 * @param {number} originLon - Tangent plane origin longitude in degrees
 * @param {number} originAlt - Tangent plane origin elevation in meters
 * @returns {{lat: number, lon: number, alt: number}}
 */
export function trueEnuToGeodetic(east, north, up, originLat, originLon, originAlt = 0) {
  const p0 = planetocentricToCartesian(originLat, originLon, originAlt);
  const phi0 = originLat * DEG2RAD;
  const lam0 = originLon * DEG2RAD;

  const sinLam = Math.sin(lam0);
  const cosLam = Math.cos(lam0);
  const sinPhi = Math.sin(phi0);
  const cosPhi = Math.cos(phi0);

  // Inverse rotation (matrix transpose)
  const dx = -sinLam * east - sinPhi * cosLam * north + cosPhi * cosLam * up;
  const dy =  cosLam * east - sinPhi * sinLam * north + cosPhi * sinLam * up;
  const dz =  cosPhi * north + sinPhi * up;

  return cartesianToPlanetocentric(p0.x + dx, p0.y + dy, p0.z + dz);
}

/**
 * Transforms Mars planetocentric coordinates using a Local Equirectangular Tangent Approximation.
 * 
 * NOTE: This is a planar 2D approximation that treats latitude and longitude as flat perpendicular
 * grid lines and ignores vertical planetary curvature (up = alt - originAlt).
 * 
 * @param {number} lat - Target latitude in degrees
 * @param {number} lon - Target longitude in degrees
 * @param {number} alt - Target elevation in meters
 * @param {number} originLat - Tangent plane origin latitude in degrees
 * @param {number} originLon - Tangent plane origin longitude in degrees
 * @param {number} originAlt - Tangent plane origin elevation in meters
 * @returns {{east: number, north: number, up: number, x: number, y: number, z: number, approximation: string}}
 */
export function geodeticToEquirectangularTangent(lat, lon, alt, originLat, originLon, originAlt = 0) {
  const phi0 = originLat * DEG2RAD;
  const deltaPhi = (lat - originLat) * DEG2RAD;
  const deltaLambda = (lon - originLon) * DEG2RAD;

  const east = MARS.RADIUS_MEAN * Math.cos(phi0) * deltaLambda;
  const north = MARS.RADIUS_MEAN * deltaPhi;
  const up = alt - originAlt;

  return {
    east,
    north,
    up,
    x: east,
    y: up,
    z: -north,
    approximation: 'EQUIRECTANGULAR_TANGENT'
  };
}

/**
 * Transforms Local Equirectangular Tangent coordinates back to planetocentric coordinates.
 * 
 * @param {number} x - Three.js X (East) in meters
 * @param {number} y - Three.js Y (Up) in meters
 * @param {number} z - Three.js Z (South, where North = -z) in meters
 * @param {number} originLat - Tangent plane origin latitude in degrees
 * @param {number} originLon - Tangent plane origin longitude in degrees
 * @param {number} originAlt - Tangent plane origin elevation in meters
 * @returns {{lat: number, lon: number, alt: number}}
 */
export function equirectangularTangentToGeodetic(x, y, z, originLat, originLon, originAlt = 0) {
  const north = -z;
  const east = x;
  const phi0 = originLat * DEG2RAD;

  const lat = originLat + (north / MARS.RADIUS_MEAN) * RAD2DEG;
  const lon = originLon + (east / (MARS.RADIUS_MEAN * Math.cos(phi0))) * RAD2DEG;
  const alt = originAlt + y;

  return { lat, lon, alt };
}

/**
 * Standard geodetic-to-local coordinate interface.
 * Defaults to equirectangular tangent approximation for fast rendering and backwards compatibility,
 * or can invoke True ENU when specified.
 */
export function geodeticToEnu(lat, lon, alt, originLat, originLon, originAlt = 0, trueEnu = false) {
  if (trueEnu) {
    return geodeticToTrueEnu(lat, lon, alt, originLat, originLon, originAlt);
  }
  return geodeticToEquirectangularTangent(lat, lon, alt, originLat, originLon, originAlt);
}

/**
 * Standard local-to-geodetic coordinate interface.
 */
export function enuToGeodetic(x, y, z, originLat, originLon, originAlt = 0, trueEnu = false) {
  if (trueEnu) {
    const north = -z;
    const east = x;
    const up = y;
    return trueEnuToGeodetic(east, north, up, originLat, originLon, originAlt);
  }
  return equirectangularTangentToGeodetic(x, y, z, originLat, originLon, originAlt);
}

/**
 * Normalizes latitude input string or number to clean planetocentric decimal degrees.
 * Disallows ambiguous notation like "-5.06° N".
 * 
 * @param {number|string} input - Latitude input (e.g. -5.06, "5.06 S", "-5.06")
 * @returns {number} Decimal degrees (-90 to +90)
 */
export function normalizeLatitude(input) {
  if (typeof input === 'number') {
    if (input < -90 || input > 90) throw new RangeError(`Latitude out of range: ${input}`);
    return input;
  }
  const str = input.trim().toUpperCase();
  if (str.endsWith('S')) {
    const val = parseFloat(str.replace('S', '').trim());
    return -Math.abs(val);
  }
  if (str.endsWith('N')) {
    const val = parseFloat(str.replace('N', '').trim());
    if (val < 0) throw new Error(`Ambiguous negative north latitude: ${input}`);
    return val;
  }
  const val = parseFloat(str);
  if (isNaN(val) || val < -90 || val > 90) throw new RangeError(`Invalid latitude: ${input}`);
  return val;
}
