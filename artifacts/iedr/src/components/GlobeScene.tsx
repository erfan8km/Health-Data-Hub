import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

type View = "globe" | "categories" | "category" | "registry";
type Props = { view: View; onArrival: () => void; onSelectIran: () => void };
const BASE = import.meta.env.BASE_URL || "./";
const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export default function GlobeScene({ view, onArrival, onSelectIran }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const flyTimerRef = useRef<number | null>(null);
  const movingRef = useRef(false);
  const targetRef = useRef(false);
  const viewRef = useRef(view);
  const lastViewRef = useRef(view);
  const onArrivalRef = useRef(onArrival);
  const onSelectIranRef = useRef(onSelectIran);
  const [webglSupported, setWebglSupported] = useState(true);
  const [globeError, setGlobeError] = useState(false);
  const [imageryFallback, setImageryFallback] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [hoverIran, setHoverIran] = useState(false);

  viewRef.current = view;
  onArrivalRef.current = onArrival;
  onSelectIranRef.current = onSelectIran;

  useEffect(() => {
    if (!hasWebGL()) {
      setWebglSupported(false);
      if (viewRef.current === "globe") onSelectIranRef.current();
      else if (viewRef.current === "categories") onArrivalRef.current();
      return;
    }

    let viewer: Cesium.Viewer | null = null;
    let alive = true;
    let hoverHandler: Cesium.ScreenSpaceEventHandler | undefined;
    let rotationHandler: (() => void) | undefined;
    let outlineEntity: Cesium.Entity | undefined;

    function beginFlight(targetView: View) {
      if (!viewer || viewer.isDestroyed()) {
        if (targetView === "categories") onArrivalRef.current();
        return;
      }
      if (flyTimerRef.current !== null) window.clearTimeout(flyTimerRef.current);
      targetRef.current = targetView === "categories";
      movingRef.current = true;
      setZooming(true);
      setHoverIran(false);

      const finish = () => {
        if (flyTimerRef.current !== null) window.clearTimeout(flyTimerRef.current);
        flyTimerRef.current = null;
        movingRef.current = false;
        setZooming(false);
        viewer?.scene.requestRender();
      };

      if (targetView === "categories") {
        flyTimerRef.current = window.setTimeout(() => {
          if (!alive) return;
          finish();
          onArrivalRef.current();
        }, 7000);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(53.6, 32.3, 2250000),
          orientation: {
            heading: Cesium.Math.toRadians(4),
            pitch: Cesium.Math.toRadians(-65),
            roll: 0,
          },
          duration: 5.2,
          complete: () => {
            finish();
            onArrivalRef.current();
          },
          cancel: finish,
        });
      } else {
        flyTimerRef.current = window.setTimeout(() => {
          if (!alive) return;
          finish();
          targetRef.current = false;
        }, 4500);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-26, 18, 23000000),
          orientation: { heading: Cesium.Math.toRadians(15), pitch: Cesium.Math.toRadians(-3), roll: 0 },
          duration: 3.7,
          complete: () => {
            finish();
            targetRef.current = false;
            setHoverIran(false);
          },
          cancel: () => {
            finish();
            targetRef.current = false;
          },
        });
      }
    }

    try {
      if (ION_TOKEN) Cesium.Ion.defaultAccessToken = ION_TOKEN;
      viewer = new Cesium.Viewer(hostRef.current as HTMLElement, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        sceneMode: Cesium.SceneMode.SCENE3D,
        baseLayer: false,
        shouldAnimate: true,
        requestRenderMode: false,
        maximumRenderTimeChange: Infinity,
        targetFrameRate: 30,
      });
      viewerRef.current = viewer;
      viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#040814");
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0d1b2a");
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 120000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40000000;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-26, 18, 23000000),
        orientation: { heading: Cesium.Math.toRadians(15), pitch: Cesium.Math.toRadians(-3), roll: 0 },
      });

      const canvas = viewer.scene.canvas;
      hoverHandler = new Cesium.ScreenSpaceEventHandler(canvas);
      hoverHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (!viewer || viewer.isDestroyed() || targetRef.current) return;
        const picked = viewer.scene.pick(movement.endPosition);
        const overIran = Boolean(picked?.id && (
          picked.id === outlineEntity ||
          picked.id?.properties?.countryCode?.getValue?.() === "IR"
        ));
        setHoverIran(overIran);
        canvas.style.cursor = overIran ? "pointer" : "grab";
        if (outlineEntity?.polygon) {
          outlineEntity.polygon.material = overIran
            ? Cesium.Color.fromCssColorString("#5be7d0").withAlpha(0.12)
            : Cesium.Color.fromCssColorString("#5be7d0").withAlpha(0.045);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      hoverHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        if (!viewer || viewer.isDestroyed() || targetRef.current) return;
        const picked = viewer.scene.pick(click.position);
        if (picked?.id && (
          picked.id === outlineEntity ||
          picked.id?.properties?.countryCode?.getValue?.() === "IR"
        )) onSelectIranRef.current();
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      rotationHandler = () => {
        if (!viewer || viewer.isDestroyed() || movingRef.current || targetRef.current) return;
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.000012);
      };
      viewer.scene.preRender.addEventListener(rotationHandler);

      const loadImagery = async () => {
        try {
          if (!ION_TOKEN) throw new Error("No optional ion token configured");
          const provider = await Cesium.IonImageryProvider.fromAssetId(2);
          if (alive && viewer && !viewer.isDestroyed()) viewer.imageryLayers.addImageryProvider(provider);
        } catch {
          if (!alive || !viewer || viewer.isDestroyed()) return;
          setImageryFallback(true);
          try {
            const provider = new Cesium.UrlTemplateImageryProvider({
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              credit: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
              maximumLevel: 19,
            });
            viewer.imageryLayers.addImageryProvider(provider);
          } catch {
            // The dark globe and catalogue remain usable if external imagery cannot load.
          }
        }
      };

      const loadIranBoundary = async () => {
        try {
          const response = await fetch(BASE + "data/borders.geojson");
          if (!response.ok) throw new Error("Could not load country boundaries");
          const geo = await response.json();
          const coordinates = geo?.features?.find((feature: any) => feature?.properties?.iso2 === "IR")?.geometry?.coordinates?.[0];
          if (!Array.isArray(coordinates) || !viewer || viewer.isDestroyed()) return;
          const closed = coordinates;
          const open = coordinates.length > 1 ? coordinates.slice(0, -1) : coordinates;
          outlineEntity = viewer.entities.add({
            id: "iran-active-country",
            name: "ایران | Iran",
            properties: { countryCode: "IR" },
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(closed.flatMap((pair: number[]) => [pair[0], pair[1]]))),
              material: Cesium.Color.fromCssColorString("#5be7d0").withAlpha(0.045),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString("#64f1d8"),
              outlineWidth: 3,
              height: 12000,
            },
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(open.flatMap((pair: number[]) => [pair[0], pair[1]])),
              width: 3.5,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.22,
                color: Cesium.Color.fromCssColorString("#64f1d8"),
              }),
              clampToGround: true,
            },
          });
          viewer.scene.requestRender();
        } catch {
          // If GeoJSON fails, the main Iran action button remains available.
        }
      };

      (viewer as Cesium.Viewer & { __iedrFly?: (targetView: View) => void }).__iedrFly = beginFlight;
      void Promise.all([loadImagery(), loadIranBoundary()]).finally(() => {
        if (!alive) return;
        setSceneReady(true);
        if (viewRef.current === "categories") beginFlight("categories");
      });
    } catch {
      setGlobeError(true);
      if (viewRef.current === "globe") onSelectIranRef.current();
      else if (viewRef.current === "categories") onArrivalRef.current();
    }

    return () => {
      alive = false;
      if (flyTimerRef.current !== null) window.clearTimeout(flyTimerRef.current);
      if (viewer && !viewer.isDestroyed()) {
        if (rotationHandler) viewer.scene.preRender.removeEventListener(rotationHandler);
        hoverHandler?.destroy();
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previous = lastViewRef.current;
    lastViewRef.current = view;
    if (view !== "globe" && view !== "categories") return;
    if (previous === view && viewerRef.current) return;
    const viewer = viewerRef.current as (Cesium.Viewer & { __iedrFly?: (targetView: View) => void }) | null;
    if (!viewer || viewer.isDestroyed()) {
      if (view === "categories" && !hasWebGL()) onArrivalRef.current();
      return;
    }
    if (view === "categories") viewer.__iedrFly?.("categories");
    else if (previous === "categories" || previous === "category" || previous === "registry") viewer.__iedrFly?.("globe");
    else targetRef.current = false;
  }, [view]);

  return (
    <div className={"globe-stage" + ((view === "globe" || view === "categories") ? " globe-stage-visible" : "")} aria-hidden={view === "category" || view === "registry"}>
      <div className="cesium-host" ref={hostRef} />
      <div className={"globe-vignette" + (zooming ? " globe-vignette-zooming" : "")} />
      <div className={"cloud-layer cloud-layer-one" + (zooming ? " cloud-layer-fade" : "")} />
      <div className={"cloud-layer cloud-layer-two" + (zooming ? " cloud-layer-fade" : "")} />
      <div className={"atmosphere-ring" + (hoverIran ? " atmosphere-ring-active" : "")} />
      {(!sceneReady || !webglSupported || globeError) && view === "globe" && (
        <div className="globe-fallback-notice"><span className="signal-dot" />{globeError || !webglSupported ? "نمای کره در این دستگاه در دسترس نیست" : "در حال آماده‌سازی نمای ماهواره‌ای"}</div>
      )}
      {imageryFallback && sceneReady && view === "globe" && <div className="imagery-note">تصویر ماهواره‌ای عمومی · بدون کلید Cesium ion</div>}
      {view === "globe" && sceneReady && webglSupported && !globeError && (
        <button type="button" className={"iran-hotspot" + (hoverIran ? " iran-hotspot-hover" : "")} onClick={onSelectIran} aria-label="ورود به نقشه ایران">
          <span className="hotspot-pulse" /><span className="hotspot-label">ایران / IRAN</span>
        </button>
      )}
    </div>
  );
}
