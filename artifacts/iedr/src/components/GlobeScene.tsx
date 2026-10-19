import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import { buildBorderPaths, isIran, labelPoint } from "../lib/globe-geo.js";

type View = "globe" | "categories" | "category" | "registry";
type Props = { view: View; onArrival: () => void; onSelectIran: () => void };

const BASE = import.meta.env.BASE_URL || "./";
const COUNTRY_SOURCES = [
  BASE + "data/world-countries.geojson",
  BASE + "data/borders.geojson",
];

const IRAN_VIEW = { lat: 32.3, lng: 53.6 };
const CAP_IDLE = "rgba(84,238,211,0.30)";
const CAP_HOVER = "rgba(110,240,213,0.55)";

async function loadFeatures(url: string): Promise<any[] | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const geo = await response.json();
    return Array.isArray(geo?.features) && geo.features.length ? geo.features : null;
  } catch {
    return null;
  }
}

async function loadCountries(): Promise<any[] | null> {
  for (const url of COUNTRY_SOURCES) {
    const features = await loadFeatures(url);
    if (features && features.some(isIran)) return features;
  }
  return null;
}

/**
 * Build a local, dark political map texture from the bundled GeoJSON.
 * This keeps the 3D globe recognisable even when a third-party imagery CDN
 * is blocked or unavailable. Globe.gl and all geographic data are bundled
 * with the site; the canvas is only a texture, not a flat-map substitute.
 */
function createEarthTexture(features: any[]): string | null {
  try {
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const ocean = context.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, "#0a1b2b");
    ocean.addColorStop(0.48, "#06121f");
    ocean.addColorStop(1, "#0a1b2b");
    context.fillStyle = ocean;
    context.fillRect(0, 0, width, height);

    // Subtle latitude/longitude guides make the dark globe read as a globe.
    context.strokeStyle = "rgba(94,156,180,0.10)";
    context.lineWidth = 1;
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const y = ((90 - latitude) / 180) * height;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    for (let longitude = -150; longitude <= 180; longitude += 30) {
      const x = ((longitude + 180) / 360) * width;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    context.lineJoin = "round";
    for (const feature of features) {
      const geometry = feature?.geometry;
      if (!geometry || !Array.isArray(geometry.coordinates)) continue;
      const polygons = geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates
          : [];
      const iran = isIran(feature);

      for (const polygon of polygons) {
        const ring = polygon?.[0];
        if (!Array.isArray(ring) || ring.length < 3) continue;

        const points: Array<{ x: number; y: number }> = [];
        for (const pair of ring) {
          const longitude = Number(pair?.[0]);
          const latitude = Number(pair?.[1]);
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
              longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;
          let x = ((longitude + 180) / 360) * width;
          const previous = points[points.length - 1];
          if (previous) {
            while (x - previous.x > width / 2) x -= width;
            while (x - previous.x < -width / 2) x += width;
          }
          points.push({ x, y: ((90 - latitude) / 180) * height });
        }
        if (points.length < 3) continue;

        const xs = points.map((point) => point.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        // Repeat across the map seam so countries around ±180° render correctly.
        for (const shift of [-width, 0, width]) {
          if (maxX + shift < 0 || minX + shift > width) continue;
          context.beginPath();
          context.moveTo(points[0].x + shift, points[0].y);
          for (let index = 1; index < points.length; index += 1) {
            context.lineTo(points[index].x + shift, points[index].y);
          }
          context.closePath();
          context.fillStyle = iran ? "#1b565a" : "#122a3a";
          context.strokeStyle = iran ? "rgba(110,240,213,0.95)" : "rgba(99,145,168,0.55)";
          context.lineWidth = iran ? 2 : 1.15;
          context.fill();
          context.stroke();
        }
      }
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function createIranLabel(onSelect: () => void) {
  const anchor = document.createElement("div");
  anchor.className = "iran-globe-anchor";
  anchor.setAttribute("role", "button");
  anchor.setAttribute("tabindex", "0");
  anchor.setAttribute("aria-label", "ایران / Iran");
  anchor.innerHTML =
    '<span class="iran-globe-dot"></span>' +
    '<span class="iran-globe-name"><strong>ایران</strong><small>IRAN</small></span>';
  anchor.addEventListener("click", onSelect);
  anchor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  });
  return anchor;
}

export default function GlobeScene({ view, onArrival, onSelectIran }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const viewRef = useRef(view);
  const onArrivalRef = useRef(onArrival);
  const onSelectIranRef = useRef(onSelectIran);
  const [sceneReady, setSceneReady] = useState(false);
  const [globeError, setGlobeError] = useState(false);

  viewRef.current = view;
  onArrivalRef.current = onArrival;
  onSelectIranRef.current = onSelectIran;

  useEffect(() => {
    let alive = true;
    let globe: any;
    let arrivalTimer: number | undefined;
    let hovered: any = null;

    const styleIran = () => {
      if (!globe) return;
      globe
        .polygonCapColor((feature: any) => feature === hovered ? CAP_HOVER : CAP_IDLE)
        .polygonAltitude((feature: any) => feature === hovered ? 0.02 : 0.012);
    };

    async function init() {
      try {
        if (!alive || !hostRef.current) return;
        const globeFactory = Globe as unknown as (element: HTMLElement, options?: Record<string, unknown>) => any;
        globe = globeFactory(hostRef.current, { animateIn: true })
          .width(hostRef.current.clientWidth)
          .height(hostRef.current.clientHeight)
          .backgroundColor("rgba(0,0,0,0)")
          .showAtmosphere(true)
          .atmosphereColor("#54b9d2")
          .atmosphereAltitude(0.16)
          .pathsData([])
          .pathColor(() => "rgba(180,200,225,0.46)")
          .pathLabel(() => "")
          .pathTransitionDuration(0)
          .polygonsData([])
          .polygonSideColor(() => "rgba(50,204,185,0.22)")
          .polygonStrokeColor(() => "#74ffe6")
          .polygonsTransitionDuration(300)
          .polygonLabel((feature: any) => isIran(feature)
            ? '<div style="font-family:Vazirmatn,Tahoma,sans-serif;color:#eaf7ff;background:rgba(4,12,24,.94);border:1px solid rgba(116,255,230,.35);padding:7px 12px;border-radius:7px">ایران / IRAN</div>'
            : "")
          .onPolygonHover((feature: any) => {
            if (!alive) return;
            hovered = isIran(feature) ? feature : null;
            if (hostRef.current) hostRef.current.style.cursor = hovered ? "pointer" : "";
            styleIran();
          })
          .onPolygonClick((feature: any) => {
            // Only the Iran polygon is registered as an interactive polygon.
            if (isIran(feature)) onSelectIranRef.current();
          })
          .htmlElementsData([])
          .htmlLat((d: any) => d.lat)
          .htmlLng((d: any) => d.lng)
          .htmlAltitude(0.02)
          .htmlElement(() => createIranLabel(() => onSelectIranRef.current()))
          .pointOfView({ ...IRAN_VIEW, altitude: 1.85 }, 0);

        styleIran();
        if (typeof globe.htmlElementVisibilityModifier === "function") {
          globe.htmlElementVisibilityModifier((element: HTMLElement, visible: boolean) => {
            element.style.opacity = visible ? "1" : "0";
            element.style.pointerEvents = visible ? "auto" : "none";
          });
        }

        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 160;
        controls.maxDistance = 450;
        globeRef.current = globe;

        const features = await loadCountries();
        if (!alive) return;
        const iran = features?.find(isIran);
        if (!features || !iran) throw new Error("Iran country geometry unavailable");

        const texture = createEarthTexture(features);
        if (texture) globe.globeImageUrl(texture);
        globe.pathsData(buildBorderPaths(features));
        globe.polygonsData([iran]);
        const point = labelPoint(iran);
        if (point) globe.htmlElementsData([point]);
        setSceneReady(true);
        if (viewRef.current === "categories") flyToIran();
      } catch {
        if (alive) setGlobeError(true);
      }
    }

    function flyToIran() {
      if (!globe || !alive) {
        onArrivalRef.current();
        return;
      }
      globe.pointOfView({ ...IRAN_VIEW, altitude: 1.45 }, 2300);
      if (arrivalTimer) window.clearTimeout(arrivalTimer);
      arrivalTimer = window.setTimeout(() => {
        if (!alive) return;
        onArrivalRef.current();
      }, 2500);
    }

    void init();

    const onResize = () => {
      if (globe && hostRef.current) {
        globe.width(hostRef.current.clientWidth);
        globe.height(hostRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      if (arrivalTimer) window.clearTimeout(arrivalTimer);
      if (globe) {
        try { globe._destructor?.(); } catch {}
      }
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !sceneReady) return;
    if (view === "categories") {
      globe.controls().autoRotate = false;
      globe.pointOfView({ ...IRAN_VIEW, altitude: 1.45 }, 2300);
      const timer = window.setTimeout(() => {
        onArrivalRef.current();
      }, 2500);
      return () => window.clearTimeout(timer);
    }
    if (view === "globe") {
      globe.controls().autoRotate = true;
      globe.pointOfView({ ...IRAN_VIEW, altitude: 1.85 }, 1500);
    }
  }, [view, sceneReady]);

  return (
    <div className={"globe-stage" + ((view === "globe" || view === "categories") ? " globe-stage-visible" : "")} aria-hidden={view === "category" || view === "registry"}>
      <div className="cesium-host" ref={hostRef} />

      {(!sceneReady || globeError) && view === "globe" && (
        <div className="globe-fallback-notice"><span className="signal-dot" />{globeError ? "نمای کره بارگذاری نشد؛ صفحه را تازه‌سازی کنید" : "در حال آماده‌سازی کره زمین"}</div>
      )}
    </div>
  );
}
