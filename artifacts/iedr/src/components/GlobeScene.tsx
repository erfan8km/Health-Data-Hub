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
  const [hoverIran, setHoverIran] = useState(false);
  const [zooming, setZooming] = useState(false);

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
          .polygonAltitude((feature: any) => feature.properties?.ADMIN === "Iran" ? 0.008 : 0.0015)
          .polygonCapColor((feature: any) => feature.properties?.ADMIN === "Iran" ? "rgba(91,231,208,0.22)" : "rgba(15,38,58,0.18)")
          .polygonSideColor(() => "rgba(35,105,130,0.08)")
          .polygonStrokeColor((feature: any) => feature.properties?.ADMIN === "Iran" ? "#5be7d0" : "rgba(134,190,207,0.58)")
          .polygonLabel(({ properties: p }: any) => p?.ADMIN === "Iran" ? `<div style="font-family: sans-serif; color: #eaf7ff; background: rgba(4,12,24,.9); padding: 6px 9px; border-radius: 6px">ایران / Iran</div>` : "")
          .onPolygonHover((feature: any) => {
            if (!alive) return;
            const isIran = feature?.properties?.ADMIN === "Iran";
            setHoverIran(Boolean(isIran));
            if (hostRef.current) hostRef.current.style.cursor = isIran ? "pointer" : "grab";
          })
          .onPolygonClick((feature: any) => {
            if (feature?.properties?.ADMIN === "Iran") onSelectIranRef.current();
          })
          .labelsData([])
          .labelLat((d: any) => d.lat)
          .labelLng((d: any) => d.lng)
          .labelText((d: any) => d.name)
          .labelSize((d: any) => d.name === "Iran" ? 0.72 : 0.48)
          .labelDotRadius((d: any) => d.name === "Iran" ? 0.16 : 0.07)
          .labelColor((d: any) => d.name === "Iran" ? "#74ffe6" : "rgba(230,244,255,0.88)")
          .labelResolution(2)
          .labelAltitude(0.012)
          .pointOfView({ lat: 22, lng: 8, altitude: 2.25 }, 0);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.35;
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
      setZooming(true);
      globe.pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.45 }, 2300);
      if (arrivalTimer) window.clearTimeout(arrivalTimer);
      arrivalTimer = window.setTimeout(() => {
        if (!alive) return;
        setZooming(false);
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
      setZooming(true);
      globe.controls().autoRotate = false;
      globe.pointOfView({ lat: 32.3, lng: 53.6, altitude: 1.45 }, 2300);
      const timer = window.setTimeout(() => {
        setZooming(false);
        onArrivalRef.current();
      }, 2500);
      return () => window.clearTimeout(timer);
    }
    if (view === "globe") {
      globe.controls().autoRotate = true;
      globe.pointOfView({ lat: 22, lng: 8, altitude: 2.25 }, 1500);
    }
  }, [view, sceneReady]);

  return (
    <div className={"globe-stage" + ((view === "globe" || view === "categories") ? " globe-stage-visible" : "")} aria-hidden={view === "category" || view === "registry"}>
      <div className="cesium-host" ref={hostRef} />
      <div className={"globe-vignette" + (zooming ? " globe-vignette-zooming" : "")} />
      <div className={"cloud-layer cloud-layer-one" + (zooming ? " cloud-layer-fade" : "")} />
      <div className={"cloud-layer cloud-layer-two" + (zooming ? " cloud-layer-fade" : "")} />
      <div className={"atmosphere-ring" + (hoverIran ? " atmosphere-ring-active" : "")} />
      {(!sceneReady || globeError) && view === "globe" && (
        <div className="globe-fallback-notice"><span className="signal-dot" />{globeError ? "نمای کره بارگذاری نشد؛ اتصال اینترنت را بررسی کنید" : "در حال آماده‌سازی کره زمین"}</div>
      )}
    </div>
  );
}
