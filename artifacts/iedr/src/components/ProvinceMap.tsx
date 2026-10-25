import { useEffect, useMemo, useState } from "react";

type Province = { id: string; fa: string; en: string; active: boolean };
type Position = [number, number];
type Geometry = { type: string; coordinates: unknown };
type Feature = { type?: string; properties?: Record<string, unknown>; geometry?: Geometry; id?: string | number };
type FeatureCollection = { type?: string; features?: Feature[] };

const GEOJSON_URL = "https://raw.githubusercontent.com/hosseinhabibi2004/iran-geojson/master/data/provinces/provinces.min.geojson";
const FALLBACK_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Map_of_Iran_with_province_names_and_neighboring_land.svg/960px-Map_of_Iran_with_province_names_and_neighboring_land.svg.png";
const MAP_WIDTH = 800;
const MAP_HEIGHT = 620;
const MAP_PADDING = 28;

function normalized(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/استان/g, "")
    .replace(/province/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c_-]+/g, "")
    .replace(/[.,()]/g, "")
    .trim();
}

function featureNames(feature: Feature): string[] {
  const p = feature.properties ?? {};
  return [
    p["name:fa"], p.name_fa, p.name, p["name:en"], p.name_en,
    p["official_name:fa"], p["official_name:en"], p["alt_name:fa"], p["alt_name:en"],
  ].filter((value): value is string => typeof value === "string");
}

function matchProvince(feature: Feature, provinces: Province[]): Province | undefined {
  const names = featureNames(feature).map(normalized);
  const activeProvince = provinces.find((province) => province.active);
  const activeAliases = new Set(["razavikhorasan", "khorasanrazavi", "khorasanerazavi", "khorasaneerazavi"]);
  if (activeProvince && names.some((name) =>
    activeAliases.has(name) || name.includes("خراسانرضوی")
  )) return activeProvince;
  return provinces.find((province) =>
    names.includes(normalized(province.fa)) || names.includes(normalized(province.en))
  );
}

function allPositions(value: unknown, output: Position[] = []): Position[] {
  if (!Array.isArray(value)) return output;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    const [lng, lat] = value;
    if (Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90) {
      output.push([lng, lat]);
    }
    return output;
  }
  for (const child of value) allPositions(child, output);
  return output;
}

function featurePositions(feature: Feature): Position[] {
  return allPositions(feature.geometry?.coordinates);
}

function pathForGeometry(geometry: Geometry | undefined, project: (point: Position) => Position): string {
  if (!geometry) return "";
  const rings: unknown[] = [];
  const addRings = (value: unknown) => {
    if (!Array.isArray(value) || !value.length) return;
    if (Array.isArray(value[0]) && typeof value[0][0] === "number") {
      rings.push(value);
      return;
    }
    for (const child of value) addRings(child);
  };
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") addRings(geometry.coordinates);
  return rings.map((ring) => {
    if (!Array.isArray(ring)) return "";
    const points = ring as Position[];
    return points.map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ") + " Z";
  }).join(" ");
}

function projectFeatures(features: Feature[]) {
  const positions = features.flatMap(featurePositions);
  if (!positions.length) return [];
  // Avoid spreading a large GeoJSON coordinate array into Math.min/Math.max.
  // Detailed province boundaries can contain many tens of thousands of points,
  // which can exceed the JavaScript engine's maximum function-argument count
  // and crash the entire React view with a blank screen.
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of positions) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / Math.max(maxLng - minLng, 0.001),
    (MAP_HEIGHT - MAP_PADDING * 2) / Math.max(maxLat - minLat, 0.001),
  );
  const mapWidth = (maxLng - minLng) * scale;
  const mapHeight = (maxLat - minLat) * scale;
  const offsetX = (MAP_WIDTH - mapWidth) / 2;
  const offsetY = (MAP_HEIGHT - mapHeight) / 2;
  const project = ([lng, lat]: Position): Position => [
    offsetX + (lng - minLng) * scale,
    offsetY + (maxLat - lat) * scale,
  ];
  return features.map((feature, index) => ({
    key: String(feature.id ?? feature.properties?.["ISO3166-2"] ?? index),
    provinceId: String(feature.properties?.["ISO3166-2"] ?? ""),
    names: featureNames(feature),
    path: pathForGeometry(feature.geometry, project),
  }));
}

export default function ProvinceMap({ provinces, english, onSelectProvince }: {
  provinces: Province[];
  english: boolean;
  onSelectProvince: (provinceId: string) => void;
}) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const [fallbackImageFailed, setFallbackImageFailed] = useState(false);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch(GEOJSON_URL, { signal: controller.signal, mode: "cors" })
      .then((response) => {
        if (!response.ok) throw new Error("Province geometry unavailable");
        return response.json() as Promise<FeatureCollection>;
      })
      .then((data) => {
        if (!Array.isArray(data.features) || data.features.length < 25) throw new Error("Unexpected province geometry");
        setFeatures(data.features);
      })
      .catch(() => { if (current) setMapFailed(true); })
      .finally(() => {
        window.clearTimeout(timeout);
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const activeProvince = useMemo(() => provinces.find((province) => province.active), [provinces]);
  const projected = useMemo(() => (features ? projectFeatures(features) : []), [features]);

  const mapReady = Boolean(features?.length && projected.length);
  return (
    <div className="province-map-content">
      <div className="province-map-frame" aria-label={english ? "Map of Iran provinces" : "نقشه استان‌های ایران"}>
        {mapReady ? (
          <svg className="province-map-svg" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label={english ? "Select an active province" : "استان فعال را انتخاب کنید"}>
            <defs>
              <linearGradient id="provinceMapFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#17394a" />
                <stop offset="100%" stopColor="#0c202f" />
              </linearGradient>
              <filter id="provinceGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {projected.map((shape, index) => {
              const feature = features?.[index];
              if (!feature) return null;
              const province = matchProvince(feature, provinces);
              const active = Boolean(province?.active);
              const rawNames = shape.names;
              const title = province ? (english ? province.en : province.fa) : rawNames[0] || rawNames[1] || (english ? "Province" : "استان");
              return (
                <path
                  key={shape.key}
                  d={shape.path}
                  className={active ? "province-map-shape province-map-shape-active" : "province-map-shape"}
                  fill={active ? "#51d9c3" : "url(#provinceMapFill)"}
                  fillOpacity={active ? 0.95 : 0.76}
                  stroke={active ? "#9dfff0" : "#557282"}
                  strokeWidth={active ? 2.4 : 1.15}
                  fillRule="evenodd"
                  role={active ? "button" : undefined}
                  tabIndex={active ? 0 : -1}
                  aria-label={active ? (english ? `Select ${title}` : `انتخاب ${title}`) : (english ? `${title}, not active yet` : `${title}، هنوز فعال نیست`)}
                  aria-disabled={!active}
                  onClick={active && province ? () => onSelectProvince(province.id) : undefined}
                  onKeyDown={active && province ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectProvince(province.id);
                    }
                  } : undefined}
                  style={{ cursor: active ? "pointer" : "not-allowed" }}
                  filter={active ? "url(#provinceGlow)" : undefined}
                >
                  <title>{active ? `${title} — ${english ? "active, select to continue" : "فعال، برای ادامه انتخاب کنید"}` : `${title} — ${english ? "not active yet" : "هنوز فعال نشده"}`}</title>
                </path>
              );
            })}
          </svg>
        ) : (
          <div className="province-map-raster-wrap">
            {loading && <div className="province-map-loading"><span className="spinner" /> {english ? "Loading province boundaries…" : "در حال بارگذاری مرز استان‌ها…"}</div>}
            {!loading && !fallbackImageFailed && <img
              className="province-map-raster"
              src={FALLBACK_MAP_URL}
              alt={english ? "Map of Iran with provincial boundaries and labels" : "نقشه ایران همراه با مرز و نام استان‌ها"}
              loading="lazy"
              onError={() => setFallbackImageFailed(true)}
            />}
            {!loading && fallbackImageFailed && <div className="province-map-error">
              {english ? "The map image could not be loaded. Choose the active province from the list below." : "تصویر نقشه بارگذاری نشد؛ استان فعال را از فهرست زیر انتخاب کنید."}
            </div>}
            {mapFailed && !fallbackImageFailed && !loading && <p className="province-map-fallback-note">
              {english ? "Using a reference map because province geometry is unavailable." : "به‌دلیل در دسترس نبودن دادهٔ مرزها، از نقشهٔ مرجع استفاده شده است."}
            </p>}
          </div>
        )}
      </div>
      <div className="province-map-key">
        <span><i className="province-key-active" />{english ? "Active and selectable" : "فعال و قابل انتخاب"}</span>
        <span><i className="province-key-inactive" />{english ? "Not active yet" : "هنوز فعال نشده"}</span>
      </div>
      <div className="province-choice-grid">
        {provinces.map((province) => (
          <button
            key={province.id}
            type="button"
            className={"province-choice" + (province.active ? " province-choice-active" : "")}
            disabled={!province.active}
            onClick={() => onSelectProvince(province.id)}
            aria-label={province.active
              ? (english ? `Choose ${province.en}` : `انتخاب ${province.fa}`)
              : (english ? `${province.en} is not active yet` : `استان ${province.fa} هنوز فعال نیست`)}
          >
            <span className="province-choice-dot" />
            <span>{english ? province.en : province.fa}</span>
            {province.active ? <strong>{english ? "OPEN" : "فعال"}</strong> : <small>{english ? "Soon" : "به‌زودی"}</small>}
          </button>
        ))}
      </div>
      <p className="province-map-attribution">
        {mapReady
          ? <>{english ? "Boundary data" : "دادهٔ مرز استان‌ها"}: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a></>
          : <>{english ? "Reference map" : "نقشهٔ مرجع"}: <a href="https://commons.wikimedia.org/wiki/File:Map_of_Iran_with_province_names_and_neighboring_land.svg" target="_blank" rel="noreferrer">Ali Zifan · CC BY-SA 4.0 · Wikimedia Commons</a></>}
      </p>
    </div>
  );
}
