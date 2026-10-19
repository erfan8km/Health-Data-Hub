import { useEffect, useRef, useState } from "react";

type View = "globe" | "categories" | "category" | "registry";
type Props = { view: View; onArrival: () => void; onSelectIran: () => void };

declare global {
  interface Window {
    Globe?: (element: HTMLElement, options?: Record<string, unknown>) => any;
  }
}

const COUNTRIES_URL = "https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";
const EARTH_IMAGE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";
const SKY_IMAGE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";

function countryLabelPoint(feature: any) {
  const geometry = feature?.geometry;
  const polygons = geometry?.type === "Polygon"
    ? [geometry.coordinates]
    : geometry?.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  const rings = polygons.map((polygon: any[]) => polygon?.[0]).filter((ring: any) => Array.isArray(ring) && ring.length > 2);
  rings.sort((a: any[], b: any[]) => b.length - a.length);
  const ring = rings[0];
  if (!ring) return null;
  const lon = ring.reduce((sum: number, pair: number[]) => sum + pair[0], 0) / ring.length;
  const lat = ring.reduce((sum: number, pair: number[]) => sum + pair[1], 0) / ring.length;
  return { name: feature.properties?.ADMIN || feature.properties?.NAME || "Country", lat, lng: lon };
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
    let script: HTMLScriptElement | undefined;

    const loadGlobeLibrary = () => new Promise<void>((resolve, reject) => {
      if (window.Globe) return resolve();
      const existing = document.querySelector<HTMLScriptElement>('script[data-iedr-globe="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Globe library failed to load")), { once: true });
        return;
      }
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/globe.gl";
      script.async = true;
      script.dataset.iedrGlobe = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Globe library failed to load"));
      document.head.appendChild(script);
    });

    async function init() {
      try {
        await loadGlobeLibrary();
        if (!alive || !hostRef.current || !window.Globe) return;
        globe = window.Globe(hostRef.current, { animateIn: true })
          .width(hostRef.current.clientWidth)
          .height(hostRef.current.clientHeight)
          .backgroundColor("rgba(0,0,0,0)")
          .globeImageUrl(EARTH_IMAGE)
          .backgroundImageUrl(SKY_IMAGE)
          .showAtmosphere(true)
          .atmosphereColor("#54b9d2")
          .atmosphereAltitude(0.18)
          .polygonsData([])
          .polygonAltitude(() => 0.012)
          .polygonCapColor(() => "rgba(84,238,211,0.34)")
          .polygonSideColor(() => "rgba(50,204,185,0.24)")
          .polygonStrokeColor(() => "#74ffe6")
          .polygonLabel(({ properties: p }: any) => p?.ADMIN === "Iran" ? `<div style="font-family: sans-serif; color: #eaf7ff; background: rgba(4,12,24,.94); border: 1px solid rgba(116,255,230,.35); padding: 7px 10px; border-radius: 7px">ایران / IRAN</div>` : "")
          .onPolygonHover((feature: any) => {
            if (!alive) return;
            const isIran = feature?.properties?.ADMIN === "Iran";
            if (hostRef.current) hostRef.current.style.cursor = isIran ? "pointer" : "grab";
          })
          .onPolygonClick((feature: any) => {
            if (feature?.properties?.ADMIN === "Iran") onSelectIranRef.current();
          })
          .labelsData([])
          .labelLat((d: any) => d.lat)
          .labelLng((d: any) => d.lng)
          .labelText((d: any) => d.name === "Iran" ? "ایران / IRAN" : d.name)
          .labelSize(() => 0.95)
          .labelDotRadius(() => 0.22)
          .labelColor(() => "#74ffe6")
          .labelResolution(2)
          .labelAltitude(0.012)
          .pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.85 }, 0);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.18;
        globe.controls().enableZoom = true;
        globeRef.current = globe;

        const response = await fetch(COUNTRIES_URL);
        if (!response.ok) throw new Error("Country data unavailable");
        const geo = await response.json();
        if (!alive) return;
        // Keep the night-Earth texture for the whole planet, but load only Iran
        // into the interactive country layer. Other countries remain visual land
        // on the texture and cannot be hovered, highlighted, or selected.
        const iranFeature = (geo.features || []).find((feature: any) => feature.properties?.ADMIN === "Iran");
        if (!iranFeature) throw new Error("Iran country geometry unavailable");
        globe.polygonsData([iranFeature]);
        globe.labelsData([countryLabelPoint(iranFeature)].filter(Boolean));
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
      globe.pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.45 }, 2300);
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
      if (script && !window.Globe) script.remove();
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !sceneReady) return;
    if (view === "categories") {
      globe.controls().autoRotate = false;
      globe.pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.45 }, 2300);
      const timer = window.setTimeout(() => {
        onArrivalRef.current();
      }, 2500);
      return () => window.clearTimeout(timer);
    }
    if (view === "globe") {
      globe.controls().autoRotate = true;
      globe.pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.85 }, 1500);
    }
  }, [view, sceneReady]);

  return (
    <div className={"globe-stage" + ((view === "globe" || view === "categories") ? " globe-stage-visible" : "")} aria-hidden={view === "category" || view === "registry"}>
      <div className="cesium-host" ref={hostRef} />
      
      {(!sceneReady || globeError) && view === "globe" && (
        <div className="globe-fallback-notice"><span className="signal-dot" />{globeError ? "نمای کره بارگذاری نشد؛ اتصال اینترنت را بررسی کنید" : "در حال آماده‌سازی کره زمین"}</div>
      )}
    </div>
  );
}
