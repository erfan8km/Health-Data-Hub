/**
 * Small GeoJSON helpers used by the globe scene.
 * Geometry is kept in GeoJSON order ([longitude, latitude]); Globe.gl path points
 * are returned as [latitude, longitude].
 */

/** @param {any} feature */
export function isIran(feature) {
  const properties = feature?.properties ?? {};
  const nameValues = [
    properties.ADMIN,
    properties.NAME,
    properties.NAME_EN,
    properties.NAME_LONG,
    properties.name,
    properties.country,
    properties.SOVEREIGNT,
    properties.FORMAL_EN,
  ].map((value) => String(value ?? "").trim().toLowerCase());

  if (nameValues.some((name) =>
    name === "iran" ||
    name === "islamic republic of iran" ||
    name === "iran, islamic republic of"
  )) return true;

  const codeValues = [
    properties.iso2,
    properties.ISO_A2,
    properties.ISO_A2_EH,
    properties.countryCode,
    properties.iso3,
    properties.ISO_A3,
    properties.ADM0_A3,
    properties.SOV_A3,
    properties["ISO3166-1-Alpha-2"],
    properties["ISO3166-1-Alpha-3"],
  ].map((value) => String(value ?? "").trim().toUpperCase());

  return codeValues.some((code) => code === "IR" || code === "IRN");
}

/** @param {any} feature */
function outerRings(feature) {
  const geometry = feature?.geometry;
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return Array.isArray(ring) ? [ring] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygon) => polygon?.[0])
      .filter((ring) => Array.isArray(ring));
  }

  return [];
}

/**
 * Split a ring at antimeridian jumps so Globe.gl does not draw long lines
 * across the entire globe. Each returned point uses [latitude, longitude].
 * @param {any[]} ring
 * @returns {Array<Array<[number, number]>>}
 */
function splitRing(ring) {
  const segments = [];
  let segment = [];
  let previousLongitude = null;

  for (const pair of ring) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const longitude = Number(pair[0]);
    const latitude = Number(pair[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
    if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) continue;

    if (previousLongitude !== null && Math.abs(longitude - previousLongitude) > 180) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }

    segment.push([latitude, longitude]);
    previousLongitude = longitude;
  }

  if (segment.length > 1) segments.push(segment);
  return segments;
}

/**
 * Convert all country outer boundaries into Globe.gl path arrays.
 * @param {any[]} features
 * @returns {Array<Array<[number, number]>>}
 */
export function buildBorderPaths(features) {
  if (!Array.isArray(features)) return [];

  const paths = [];
  for (const feature of features) {
    for (const ring of outerRings(feature)) {
      paths.push(...splitRing(ring));
    }
  }
  return paths;
}

/** @param {any[]} ring */
function ringArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += Number(current?.[0] ?? 0) * Number(next?.[1] ?? 0)
      - Number(next?.[0] ?? 0) * Number(current?.[1] ?? 0);
  }
  return Math.abs(area / 2);
}

/** @param {any} feature */
export function labelPoint(feature) {
  const rings = outerRings(feature)
    .filter((ring) => ring.length > 2)
    .sort((a, b) => ringArea(b) - ringArea(a));
  const ring = rings[0];
  if (!ring) return null;

  // GeoJSON rings commonly repeat the first point at the end; omit it from
  // the mean so it does not receive extra weight in the label position.
  const points = ring.length > 1 &&
    Number(ring[0]?.[0]) === Number(ring[ring.length - 1]?.[0]) &&
    Number(ring[0]?.[1]) === Number(ring[ring.length - 1]?.[1])
    ? ring.slice(0, -1)
    : ring;

  const coordinates = points.filter((pair) =>
    Array.isArray(pair) &&
    Number.isFinite(Number(pair[0])) &&
    Number.isFinite(Number(pair[1]))
  );
  if (!coordinates.length) return null;

  const lng = coordinates.reduce((sum, pair) => sum + Number(pair[0]), 0) / coordinates.length;
  const lat = coordinates.reduce((sum, pair) => sum + Number(pair[1]), 0) / coordinates.length;
  const properties = feature?.properties ?? {};

  return {
    name: String(properties.ADMIN || properties.NAME || properties.name || "Iran"),
    lat,
    lng,
  };
}
