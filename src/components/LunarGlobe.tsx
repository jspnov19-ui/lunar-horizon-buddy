import { useEffect, useRef, useState } from 'react';
import { Compass, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingSite } from '@/lib/sites';
import { PolarMapFallback } from '@/components/PolarMapFallback';
import { computeHorizon } from '@/lib/astro';

declare global {
  interface Window { THREE?: any }
}

type Props = {
  sites: LandingSite[];
  selected: string[];
  detailId: string;
  currentTimeMs: number;
  onPick: (id: string) => void;
  onAdd: (lat: number, lon: number) => void;
};

type ThreeWorld = {
  THREE: any;
  renderer: any;
  scene: any;
  camera: any;
  moon: any;
  markerGroup: any;
  raycaster: any;
  markers: any[];
  surfaceMeshes: any[];
  theta: number;
  phi: number;
  distance: number;
  sunlight: any;
  sunMarker: any;
  earthMarker: any;
};

let threeLoader: Promise<any> | null = null;
let gltfLoaderScript: Promise<void> | null = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!threeLoader) {
    threeLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error('Three.js did not initialize.'));
      script.onerror = () => reject(new Error('Three.js could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return threeLoader;
}

function loadGltfLoader() {
  if (window.THREE?.GLTFLoader) return Promise.resolve();
  if (!gltfLoaderScript) {
    gltfLoaderScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      script.async = true;
      script.onload = () => window.THREE?.GLTFLoader ? resolve() : reject(new Error('The glTF loader did not initialize.'));
      script.onerror = () => reject(new Error('The glTF loader could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return gltfLoaderScript;
}

function siteVector(THREE: any, site: Pick<LandingSite, 'lat' | 'lon'>) {
  const lat = site.lat * Math.PI / 180, lon = site.lon * Math.PI / 180;
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
}

export function LunarGlobe({ sites, selected, detailId, currentTimeMs, onPick, onAdd }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<ThreeWorld | null>(null);
  const latestRef = useRef({ sites, selected, detailId, onPick, onAdd });
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(null);
  const [hovered, setHovered] = useState('');
  const [failed, setFailed] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  latestRef.current = { sites, selected, detailId, onPick, onAdd };

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: any;
    let starGeometry: any;
    let starMaterial: any;
    loadThree().then(async THREE => {
      await loadGltfLoader();
      if (cancelled || !hostRef.current) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05060a);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      const host = hostRef.current;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.className = 'block size-full touch-none cursor-grab active:cursor-grabbing';
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D Moon. Drag to rotate; select a landing marker or click the surface to plot a custom site.');
      host.replaceChildren(renderer.domElement);

      const moon = new THREE.Group();
      scene.add(moon);
      const placeholder = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ color: 0x777775, roughness: 1, metalness: 0 }));
      moon.add(placeholder);
      scene.add(new THREE.AmbientLight(0xffffff, 0.24));
      const sunlight = new THREE.DirectionalLight(0xffffff, 1.85);
      sunlight.position.set(-4, 3, 5);
      scene.add(sunlight);
      const sunMarker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
      const earthMarker = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 24), new THREE.MeshBasicMaterial({ color: 0x4b94ff }));
      scene.add(sunMarker, earthMarker);

      const starPositions: number[] = [];
      for (let i = 0; i < 700; i++) {
        const y = Math.random() * 2 - 1, angle = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y) * 40;
        starPositions.push(r * Math.cos(angle), y * 40, r * Math.sin(angle));
      }
      starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      starMaterial = new THREE.PointsMaterial({ size: 0.09, color: 0xdce8ef, transparent: true, opacity: 0.72 });
      scene.add(new THREE.Points(starGeometry, starMaterial));

      const world: ThreeWorld = {
        THREE, renderer, scene, camera, moon, markerGroup: new THREE.Group(),
        raycaster: new THREE.Raycaster(), markers: [], surfaceMeshes: [placeholder], theta: 0.6, phi: Math.PI - 0.55, distance: 3.2,
        sunlight, sunMarker, earthMarker,
      };
      moon.add(world.markerGroup);
      worldRef.current = world;
      setWorldReady(true);
      const updateCamera = () => {
        camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta));
        camera.lookAt(0, 0, 0);
      };
      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
      };
      updateCamera();
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(host);

      let drag: { x: number; y: number; moved: number } | null = null;
      const raycast = (event: PointerEvent, objects: any[]) => {
        const rect = renderer.domElement.getBoundingClientRect();
        world.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1)), camera);
        return world.raycaster.intersectObjects(objects, false);
      };
      const down = (event: PointerEvent) => {
        drag = { x: event.clientX, y: event.clientY, moved: 0 };
        renderer.domElement.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (drag) {
          const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
          drag.moved += Math.abs(dx) + Math.abs(dy);
          drag.x = event.clientX; drag.y = event.clientY;
          world.theta -= dx * 0.006;
          world.phi = Math.max(0.05, Math.min(3.09, world.phi - dy * 0.006));
          updateCamera();
          return;
        }
        const hit = raycast(event, world.markers)[0]?.object;
        setHovered(hit?.userData.siteName ?? '');
      };
      const up = (event: PointerEvent) => {
        const wasClick = drag !== null && drag.moved < 5;
        drag = null;
        if (!wasClick) return;
        const marker = raycast(event, world.markers)[0]?.object;
        if (marker) {
          const found = latestRef.current.sites.find(site => site.id === marker.userData.siteId);
          if (found) latestRef.current.onPick(found.id);
          setPending(null);
          return;
        }
        if (!world.surfaceMeshes.length) return;
        const hit = raycast(event, world.surfaceMeshes)[0];
        if (!hit) return;
        const point = moon.worldToLocal(hit.point.clone()).normalize();
        const lat = Math.asin(Math.max(-1, Math.min(1, point.y))) * 180 / Math.PI;
        let lon = Math.atan2(-point.z, point.x) * 180 / Math.PI;
        lon = ((((lon + 180) % 360) + 360) % 360) - 180;
        setPending({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
      };
      const wheel = (event: WheelEvent) => {
        event.preventDefault();
        world.distance = Math.max(1.4, Math.min(8, world.distance * (1 + event.deltaY * 0.001)));
        updateCamera();
      };
      const canvas = renderer.domElement;
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', () => { drag = null; });
      canvas.addEventListener('wheel', wheel, { passive: false });
      const loader = new THREE.GLTFLoader();
      loader.load('/moon-nasa-small.glb', (gltf: any) => {
        if (cancelled) return;
        placeholder.geometry.dispose();
        placeholder.material.dispose();
        moon.remove(placeholder);
        const surface = new THREE.Group();
        surface.scale.setScalar(1 / 1.271865);
        surface.add(gltf.scene);
        const meshes: any[] = [];
        surface.traverse((object: any) => {
          if (!object.isMesh) return;
          meshes.push(object);
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            material.roughness = 1;
            material.metalness = 0;
            material.needsUpdate = true;
          }
        });
        moon.add(surface);
        world.surfaceMeshes = meshes;
        setLoadProgress(100);
        setModelReady(true);
      }, (event: ProgressEvent) => {
        if (event.total > 0) setLoadProgress(Math.round(event.loaded / event.total * 100));
      }, () => { if (!cancelled) setFailed(true); });
      const animate = () => { if (cancelled) return; frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
      animate();
    }).catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      worldRef.current?.scene.traverse((object: any) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material) continue;
          for (const value of Object.values(material)) if ((value as any)?.isTexture) (value as any).dispose();
          material.dispose();
        }
      });
      worldRef.current = null;
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
      starGeometry?.dispose();
      starMaterial?.dispose();
    };
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !Number.isFinite(currentTimeMs)) return;
    const horizon = computeHorizon(new Date(currentTimeMs), 0, 0);
    const direction = (altitude: number, azimuth: number) => {
      const alt = altitude * Math.PI / 180, az = azimuth * Math.PI / 180;
      return new world.THREE.Vector3(Math.sin(alt), Math.cos(alt) * Math.cos(az), -Math.cos(alt) * Math.sin(az)).normalize();
    };
    const sun = direction(horizon.sunAlt, horizon.sunAz);
    const earth = direction(horizon.earthAlt, horizon.earthAz);
    world.sunlight.position.copy(sun.clone().multiplyScalar(10));
    world.sunMarker.position.copy(sun.clone().multiplyScalar(5));
    world.earthMarker.position.copy(earth.clone().multiplyScalar(3.5));
  }, [currentTimeMs, worldReady]);

  useEffect(() => {
    const world = worldRef.current;
    if (!worldReady || !world) return;
    const { THREE, markerGroup } = world;
    for (const child of [...markerGroup.children]) {
      markerGroup.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((material: any) => material.dispose());
      else child.material?.dispose();
    }
    world.markers = [];
    sites.forEach(site => {
      const isFocused = site.id === detailId;
      const isIncluded = selected.includes(site.id);
      const color = isFocused ? 0xffc568 : isIncluded ? 0x53d4c5 : 0xc4d0d3;
      const point = siteVector(THREE, site);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(isFocused ? 0.025 : 0.018, 16, 16), new THREE.MeshBasicMaterial({ color }));
      marker.position.copy(point.clone().multiplyScalar(1.012));
      marker.userData.siteId = site.id;
      marker.userData.siteName = site.name;
      markerGroup.add(marker);
      world.markers.push(marker);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, isFocused ? 0.085 : 0.055, 7), new THREE.MeshBasicMaterial({ color }));
      pin.position.copy(point.clone().multiplyScalar(1.045));
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), point);
      markerGroup.add(pin);
    });
    markerGroup.children.forEach((child: any) => { if (child.isMesh) child.visible = true; });
    // Keep pending point in surface coordinates as a visible preview while the user confirms it.
    if (pending) {
      const point = siteVector(THREE, pending);
      const preview = new THREE.Mesh(new THREE.SphereGeometry(0.027, 18, 18), new THREE.MeshBasicMaterial({ color: 0xffc568, wireframe: true }));
      preview.position.copy(point.clone().multiplyScalar(1.018));
      preview.userData.preview = true;
      markerGroup.add(preview);
    }
  }, [sites, selected, detailId, pending, worldReady]);

  const reset = () => {
    const world = worldRef.current;
    if (!world) return;
    world.theta = 0.6; world.phi = Math.PI - 0.55; world.distance = 3.2;
    world.camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta));
    world.camera.lookAt(0, 0, 0);
    setPending(null);
  };
  const zoom = (amount: number) => {
    const world = worldRef.current;
    if (!world) return;
    world.distance = Math.max(1.4, Math.min(8, world.distance + amount));
    world.camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta));
    world.camera.lookAt(0, 0, 0);
  };

  if (failed) return <PolarMapFallback sites={sites} selected={selected} detailId={detailId} onPick={onPick} onAdd={onAdd} />;

  return <div className="lunar-globe-frame overflow-hidden rounded-2xl border border-white/10 bg-[#05060a]">
    <div className="relative h-[380px] sm:h-[480px] lg:h-[560px]">
      <div ref={hostRef} className="size-full" />
      {(!worldReady || !modelReady) && <div className="absolute inset-0 z-10 grid place-items-center bg-[#05060a]/80 text-xs text-white/80">Loading NASA lunar surface… {loadProgress}%</div>}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-[10px] text-white/75 backdrop-blur"><Compass className="size-3.5 text-primary" /> SOUTH POLE VIEW <span className="text-white/35">·</span> DRAG TO ORBIT</div>
      <div className="absolute right-3 top-3 flex gap-1.5"><Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Zoom out" onClick={() => zoom(0.5)}>−</Button><Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Zoom in" onClick={() => zoom(-0.5)}>+</Button><Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Reset Moon view" onClick={reset}><RotateCcw className="size-3.5" /></Button></div>
      {hovered && <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/55 px-2.5 py-2 text-xs text-white/85 backdrop-blur">{hovered}</div>}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-md bg-black/45 px-2.5 py-2 text-[10px] text-white/75 backdrop-blur"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#53d4c5]" />Included site</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#ffc568]" />Focused site</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#ffd24a]" />Sun</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#4b94ff]" />Earth</span></div>
    </div>
    <div className="flex min-h-12 flex-wrap items-center gap-3 border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">
      {pending
        ? <><span className="font-mono text-foreground">Custom point · {Math.abs(pending.lat).toFixed(2)}°{pending.lat < 0 ? 'S' : 'N'}, {Math.abs(pending.lon).toFixed(2)}°{pending.lon < 0 ? 'W' : 'E'}</span><Button size="sm" onClick={() => { onAdd(pending.lat, pending.lon); setPending(null); }}><Plus />Add landing site</Button><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button></>
        : <span>Drag to rotate · scroll or use + / − to zoom · click a marker to focus it · click an open spot to preview and add a custom site. Sun and Earth positions follow the mission timeline.</span>}
      <a href="https://svs.gsfc.nasa.gov/14959/" target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] text-muted-foreground underline decoration-white/20 underline-offset-2 hover:text-foreground">Surface model: NASA GSFC / LRO</a>
    </div>
  </div>;
}
