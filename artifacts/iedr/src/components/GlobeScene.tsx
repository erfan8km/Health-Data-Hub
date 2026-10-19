import { useEffect, useRef, useState } from "react";
import { buildBorderPaths, isIran, labelPoint } from "../lib/globe-geo.js";

type View = "globe" | "categories" | "category" | "registry";
type Props = { view: View; onArrival: () => void; onSelectIran: () => void };

declare global {
  interface Window {
    Globe?: (element: HTMLElement, options?: Record<string, unknown>) => any;
  }
}

const BASE = import.meta.env.BASE_URL || "./";
const GLOBE_LIB_URL = "https://cdn.jsdelivr.net/npm/globe.gl";
const EARTH_IMAGE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg";
const SKY_IMAGE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";
const COUNTRY_SOURCES = [
  BASE + "data/world-countries.geojson",
  "https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
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
    let script: HTMLScriptElement | undefined;
    let hovered: any = null;

    const loadGlobeLibrary = () => new Promise<void>((resolve, reject) => {
      if (window.Globe) return resolve();
      const existing = document.querySelector<HTMLScriptElement>('script[data-iedr-globe="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Globe library failed to load")), { once: true });
        return;
      }
      script = document.createElement("script");
      script.src = GLOBE_LIB_URL;
      script.async = true;
      script.dataset.iedrGlobe = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Globe library failed to load"));
      document.head.appendChild(script);
    });

    const styleIran = () => {
      globe
        .polygonCapColor((d: any) => (d === hovered ? CAP_HOVER : CAP_IDLE))
        .polygonAltitude((d: any) => (d === hovered ? 0.02 : 0.012));
    };

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
          .atmosphereAltitude(0.16)
          .pathsData([])
          .pathColor(() => "rgba(180,200,225,0.38)")
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
          globe.htmlElementVisibilityModifier((el: HTMLElement, isVisible: boolean) => {
            el.style.opacity = isVisible ? "1" : "0";
            el.style.pointerEvents = isVisible ? "auto" : "none";
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
      if (script && !window.Globe) script.remove();
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
        <div className="globe-fallback-notice"><span className="signal-dot" />{globeError ? "نمای کره بارگذاری نشد؛ اتصال اینترنت را بررسی کنید" : "در حال آماده‌سازی کره زمین"}</div>
      )}
    </div>
  );
}
