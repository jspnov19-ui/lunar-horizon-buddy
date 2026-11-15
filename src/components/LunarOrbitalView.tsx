import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Sample, SiteAnalysis } from '@/lib/analysis';
import { loadGltfLoader, loadThree } from '@/lib/three-loader';

type OrbitalWorld = { THREE: any; renderer: any; scene: any; camera: any; trackGroup: any; bodyGroup: any; moon: any; theta: number; phi: number; distance: number };
const ORBIT_SCALE = { sun: 4.6, earth: 2.6 };

function lunarPosition(THREE: any, lat: number, lon: number) {
  const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
  const up = new THREE.Vector3(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l));
  const north = new THREE.Vector3(-Math.sin(p) * Math.cos(l), Math.cos(p), Math.sin(p) * Math.sin(l));
  const east = new THREE.Vector3(-Math.sin(l), 0, -Math.cos(l));
  return { up, north, east };
}

function apparentDirection(THREE: any, basis: ReturnType<typeof lunarPosition>, altitude: number, azimuth: number) {
  const alt = altitude * Math.PI / 180, az = azimuth * Math.PI / 180;
  return basis.up.clone().multiplyScalar(Math.sin(alt))
    .add(basis.north.clone().multiplyScalar(Math.cos(alt) * Math.cos(az)))
    .add(basis.east.clone().multiplyScalar(Math.cos(alt) * Math.sin(az)))
    .normalize();
}

export function LunarOrbitalView({ analysis, index, className = '' }: { analysis: SiteAnalysis; index: number; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<OrbitalWorld | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const current = analysis.samples[Math.min(index, analysis.samples.length - 1)];

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: any;
    let sourceModel: any;
    setReady(false);
    setFailed(false);
    loadThree().then(async (THREE: any) => {
      await loadGltfLoader();
      if (cancelled || !hostRef.current) return;
      const host = hostRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050910);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.domElement.className = 'block size-full touch-none cursor-grab active:cursor-grabbing';
      renderer.domElement.setAttribute('aria-label', `Interactive 3D lunar orbital model for ${analysis.site.name}; drag to orbit and scroll to zoom.`);
      host.replaceChildren(renderer.domElement);
      scene.add(new THREE.AmbientLight(0xffffff, 0.3));
      const sunlight = new THREE.DirectionalLight(0xffe4b3, 1.8);
      sunlight.position.set(-4, 3, 5);
      scene.add(sunlight);
      const stars: number[] = [];
      for (let i = 0; i < 720; i++) {
        const y = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y) * 40;
        stars.push(r * Math.cos(a), y * 40, r * Math.sin(a));
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
      const starMaterial = new THREE.PointsMaterial({ size: 0.07, color: 0xdbe8ff, transparent: true, opacity: 0.68 });
      scene.add(new THREE.Points(starGeometry, starMaterial));
      const moon = new THREE.Group();
      scene.add(moon);
      const placeholder = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ color: 0x797975, roughness: 1 }));
      moon.add(placeholder);
      const trackGroup = new THREE.Group();
      const bodyGroup = new THREE.Group();
      scene.add(trackGroup, bodyGroup);
      const world: OrbitalWorld = { THREE, renderer, scene, camera, trackGroup, bodyGroup, moon, theta: 0.62, phi: 1.22, distance: 8.2 };
      worldRef.current = world;
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
      resize(); updateCamera();
      observer = new ResizeObserver(resize);
      observer.observe(host);
      let drag: { x: number; y: number } | null = null;
      const down = (event: PointerEvent) => { drag = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId); };
      const move = (event: PointerEvent) => {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        drag = { x: event.clientX, y: event.clientY };
        world.theta -= dx * 0.006;
        world.phi = Math.max(0.12, Math.min(3.02, world.phi - dy * 0.006));
        updateCamera();
      };
      const up = () => { drag = null; };
      const wheel = (event: WheelEvent) => { event.preventDefault(); world.distance = Math.max(4.2, Math.min(15, world.distance * (1 + event.deltaY * 0.001))); updateCamera(); };
      renderer.domElement.addEventListener('pointerdown', down);
      renderer.domElement.addEventListener('pointermove', move);
      renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('pointercancel', up);
      renderer.domElement.addEventListener('wheel', wheel, { passive: false });

      const loader = new THREE.GLTFLoader();
      loader.load('/moon-nasa-small.glb', (gltf: any) => {
        if (cancelled) return;
        sourceModel = gltf.scene;
        placeholder.geometry.dispose(); placeholder.material.dispose(); moon.remove(placeholder);
        const surface = new THREE.Group();
        surface.scale.setScalar(1 / 1.271865);
        surface.add(sourceModel);
        surface.traverse((object: any) => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) { material.roughness = 1; material.metalness = 0; material.needsUpdate = true; }
        });
        moon.add(surface);
        setReady(true);
      }, undefined, () => { if (!cancelled) setFailed(true); });
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
    };
  }, [analysis.site.id]);

  useEffect(() => {
    const world = worldRef.current;
    if (!ready || !world) return;
    const { THREE, trackGroup } = world;
    for (const child of [...trackGroup.children]) { trackGroup.remove(child); child.geometry?.dispose(); child.material?.dispose(); }
    const basis = lunarPosition(THREE, analysis.site.lat, analysis.site.lon);
    const siteMarker = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.009, 6, 32), new THREE.MeshBasicMaterial({ color: 0x4ed3bd, transparent: true, opacity: 0.95 }));
    siteMarker.position.copy(basis.up.clone().multiplyScalar(1.012));
    siteMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), basis.up);
    trackGroup.add(siteMarker);

    const bodyPosition = (body: 'sun' | 'earth', sample: Sample) => {
      const altitude = body === 'sun' ? sample.sunAlt : sample.earthAlt;
      const azimuth = body === 'sun' ? sample.sunAz : sample.earthAz;
      return basis.up.clone().add(apparentDirection(THREE, basis, altitude, azimuth).multiplyScalar(ORBIT_SCALE[body]));
    };
    for (const body of ['sun', 'earth'] as const) {
      const points: any[] = [];
      const stride = Math.max(1, Math.floor(analysis.samples.length / 220));
      analysis.samples.forEach((sample, i) => {
        if (i % stride !== 0 && i !== analysis.samples.length - 1) return;
        points.push(bodyPosition(body, sample));
      });
      const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: body === 'sun' ? 0xffbd5d : 0x67b9ff, transparent: true, opacity: body === 'sun' ? 0.5 : 0.72 }));
      trackGroup.add(orbit);
    }
  }, [analysis, ready]);

  useEffect(() => {
    const world = worldRef.current;
    if (!ready || !world || !current) return;
    const { THREE, bodyGroup } = world;
    for (const child of [...bodyGroup.children]) { bodyGroup.remove(child); child.geometry?.dispose(); child.material?.dispose(); }
    const basis = lunarPosition(THREE, analysis.site.lat, analysis.site.lon);
    const bodyPosition = (body: 'sun' | 'earth', sample: Sample) => {
      const altitude = body === 'sun' ? sample.sunAlt : sample.earthAlt;
      const azimuth = body === 'sun' ? sample.sunAz : sample.earthAz;
      return basis.up.clone().add(apparentDirection(THREE, basis, altitude, azimuth).multiplyScalar(ORBIT_SCALE[body]));
    };
    for (const body of ['sun', 'earth'] as const) {
      const visible = body === 'sun' ? current.sunUp : current.earthUp;
      if (!visible) continue;
      const position = bodyPosition(body, current);
      const color = body === 'sun' ? 0xffc76a : 0x66baff;
      const marker = new THREE.Mesh(new THREE.SphereGeometry(body === 'sun' ? 0.12 : 0.09, 24, 18), new THREE.MeshBasicMaterial({ color }));
      marker.position.copy(position);
      bodyGroup.add(marker);
      const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([basis.up.clone().multiplyScalar(1.015), position]), new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.055, transparent: true, opacity: 0.52 }));
      tether.computeLineDistances();
      bodyGroup.add(tether);
      if (body === 'sun') { const glow = new THREE.PointLight(color, 1.2, 3); glow.position.copy(position); bodyGroup.add(glow); }
    }
  }, [analysis.site.lat, analysis.site.lon, current, ready]);

  const reset = () => { const world = worldRef.current; if (!world) return; world.theta = 0.62; world.phi = 1.22; world.distance = 8.2; world.camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta)); world.camera.lookAt(0, 0, 0); };
  return <div className={`lunar-orbit-3d relative overflow-hidden rounded-2xl border border-white/10 bg-[#050910] ${className}`}>
    <div ref={hostRef} className="size-full min-h-0" />
    {!ready && !failed && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#050910]/55 text-xs text-white/65">Loading NASA lunar surface…</div>}
    {failed && <div className="absolute inset-0 grid place-items-center bg-[#050910] px-6 text-center text-xs text-white/65">The 3D orbital model could not load. Check WebGL and the NASA surface asset connection.</div>}
    <div className="pointer-events-none absolute left-3 top-3 max-w-[72%] rounded-lg border border-white/10 bg-black/40 px-3 py-2 backdrop-blur"><p className="font-mono text-[9px] uppercase tracking-wider text-white/75">3D orbital view <span className="text-white/30">·</span> {analysis.site.name}</p><p className="mt-1 text-[9px] text-white/50">LRO surface · orbital distances compressed</p></div>
    <button type="button" onClick={reset} aria-label="Reset three dimensional orbital view" className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-white/75 backdrop-blur hover:bg-white/10"><RotateCcw className="size-3.5" /></button>
    <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2"><span className="rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 font-mono text-[9px] text-sun">☀ SUN {current?.sunAlt.toFixed(1)}°</span><span className="rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 font-mono text-[9px] text-earth">● EARTH {current?.earthAlt.toFixed(1)}°</span><span className="rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 font-mono text-[9px] text-primary">◉ SITE</span></div>
    <div className="pointer-events-none absolute bottom-3 right-3 hidden gap-3 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-[9px] text-white/65 sm:flex"><span className="text-sun">Sun path</span><span className="text-earth">Earth path</span><span className="text-primary">Observer site</span></div>
  </div>;
}
