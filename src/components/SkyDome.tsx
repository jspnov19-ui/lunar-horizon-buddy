import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { horizonAt } from '@/lib/astro';
import type { SiteAnalysis, Sample } from '@/lib/analysis';
import { loadThree } from '@/lib/three-loader';

type SkyWorld = { THREE: any; renderer: any; scene: any; camera: any; trackGroup: any; bodyGroup: any; theta: number; phi: number; distance: number };
const SKY_RADIUS = 5;

function skyVector(THREE: any, altitude: number, azimuth: number, radius = SKY_RADIUS * 0.96) {
  const alt = altitude * Math.PI / 180;
  const az = azimuth * Math.PI / 180;
  return new THREE.Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az)).multiplyScalar(radius);
}

export function SkyDome({ analysis, index }: { analysis: SiteAnalysis; index: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SkyWorld | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const current: Sample | undefined = analysis.samples[Math.min(index, analysis.samples.length - 1)];

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: any;
    setReady(false);
    setFailed(false);

    loadThree().then((THREE: any) => {
      if (cancelled || !hostRef.current) return;
      const host = hostRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x09111c);
      const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 60);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.domElement.className = 'block size-full touch-none cursor-grab active:cursor-grabbing';
      renderer.domElement.setAttribute('aria-label', `Interactive three dimensional sky dome for ${analysis.site.name}; drag to rotate.`);
      host.replaceChildren(renderer.domElement);

      scene.add(new THREE.AmbientLight(0x91a7c4, 0.75));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1b3856, side: THREE.BackSide, transparent: true, opacity: 0.36, depthWrite: false }));
      scene.add(dome);
      const grid = new THREE.Group();
      const line = (points: any[], color: number, opacity: number, width = 1) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width, depthWrite: false });
        const object = new THREE.Line(geometry, material);
        grid.add(object);
      };
      for (const altitude of [0, 30, 60]) {
        const y = SKY_RADIUS * Math.sin(altitude * Math.PI / 180);
        const radius = SKY_RADIUS * Math.cos(altitude * Math.PI / 180);
        const points = Array.from({ length: 129 }, (_, i) => { const az = i / 128 * Math.PI * 2; return new THREE.Vector3(Math.sin(az) * radius, y, -Math.cos(az) * radius); });
        line(points, altitude === 0 ? 0x8ea6bb : 0x52657b, altitude === 0 ? 0.52 : 0.28);
      }
      for (let az = 0; az < 360; az += 30) {
        const points = Array.from({ length: 33 }, (_, i) => skyVector(THREE, i / 32 * 90, az, SKY_RADIUS));
        line(points, 0x52657b, az % 90 === 0 ? 0.3 : 0.14);
      }
      const horizon = Array.from({ length: 145 }, (_, i) => { const az = i / 144 * 360; return skyVector(THREE, horizonAt(analysis.site.horizon, az), az, SKY_RADIUS * 1.006); });
      line(horizon, 0xf2c06e, 0.86, 2);
      scene.add(grid);

      const ground = new THREE.Mesh(new THREE.CircleGeometry(SKY_RADIUS * 0.99, 96), new THREE.MeshStandardMaterial({ color: 0x625d55, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.025;
      scene.add(ground);
      const terrainLight = new THREE.DirectionalLight(0xffd49a, 0.72);
      terrainLight.position.set(-3, 1.4, 2);
      scene.add(terrainLight);
      const random = (seed: number) => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
      for (let i = 0; i < 26; i++) {
        const azimuth = random(i + 7) * Math.PI * 2;
        const radius = 1.25 + random(i + 41) * 3.3;
        const crater = new THREE.Mesh(new THREE.TorusGeometry(0.035 + random(i + 83) * 0.12, 0.008, 5, 24), new THREE.MeshBasicMaterial({ color: 0xc3b59b, transparent: true, opacity: 0.14 }));
        crater.rotation.x = -Math.PI / 2;
        crater.position.set(Math.cos(azimuth) * radius, -0.012, Math.sin(azimuth) * radius);
        crater.scale.set(1.4, 1, 0.7);
        scene.add(crater);
      }
      const stars: number[] = [];
      for (let i = 0; i < 850; i++) {
        const az = (i * 137.508) % 360;
        const alt = 1 + ((i * 47.37) % 88);
        const p = skyVector(THREE, alt, az, SKY_RADIUS * 0.994);
        stars.push(p.x, p.y, p.z);
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
      const starMaterial = new THREE.PointsMaterial({ size: 0.043, color: 0xe2edff, transparent: true, opacity: 0.78, sizeAttenuation: true });
      scene.add(new THREE.Points(starGeometry, starMaterial));

      const trackGroup = new THREE.Group();
      const bodyGroup = new THREE.Group();
      scene.add(trackGroup, bodyGroup);
      const world: SkyWorld = { THREE, renderer, scene, camera, trackGroup, bodyGroup, theta: 0.12, phi: 1.32, distance: 3.2 };
      worldRef.current = world;
      const updateCamera = () => {
        const targetY = 2.35;
        camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), targetY + world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta));
        camera.lookAt(0, targetY, 0);
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
        world.phi = Math.max(0.72, Math.min(1.58, world.phi - dy * 0.006));
        updateCamera();
      };
      const up = () => { drag = null; };
      const wheel = (event: WheelEvent) => { event.preventDefault(); world.distance = Math.max(2.6, Math.min(4.8, world.distance * (1 + event.deltaY * 0.0008))); updateCamera(); };
      renderer.domElement.addEventListener('pointerdown', down);
      renderer.domElement.addEventListener('pointermove', move);
      renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('pointercancel', up);
      renderer.domElement.addEventListener('wheel', wheel, { passive: false });
      const animate = () => { if (cancelled) return; frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
      animate();
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      worldRef.current?.scene.traverse((object: any) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose();
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
    const addTrack = (body: 'sun' | 'earth') => {
      const points: any[] = [];
      const flush = () => {
        if (points.length < 2) { points.length = 0; return; }
        const geometry = new THREE.BufferGeometry().setFromPoints([...points]);
        const material = new THREE.LineBasicMaterial({ color: body === 'sun' ? 0xf7c36f : 0x70c2ff, transparent: true, opacity: 0.58 });
        trackGroup.add(new THREE.Line(geometry, material));
        points.length = 0;
      };
      const stride = Math.max(1, Math.floor(analysis.samples.length / 220));
      analysis.samples.forEach((sample, i) => {
        if (i % stride !== 0 && i !== analysis.samples.length - 1) return;
        const up = body === 'sun' ? sample.sunUp : sample.earthUp;
        if (!up) { flush(); return; }
        const altitude = body === 'sun' ? sample.sunAlt : sample.earthAlt;
        const azimuth = body === 'sun' ? sample.sunAz : sample.earthAz;
        points.push(skyVector(THREE, Math.max(0, altitude), azimuth, SKY_RADIUS * 0.965));
      });
      flush();
    };
    addTrack('sun'); addTrack('earth');
  }, [analysis, ready]);

  useEffect(() => {
    const world = worldRef.current;
    if (!ready || !world || !current) return;
    const { THREE, bodyGroup } = world;
    for (const child of [...bodyGroup.children]) { bodyGroup.remove(child); child.geometry?.dispose(); child.material?.dispose(); }
    const addBody = (body: 'sun' | 'earth', visible: boolean, altitude: number, azimuth: number) => {
      const color = body === 'sun' ? 0xffc86d : 0x71c4ff;
      const position = skyVector(THREE, Math.max(0.15, altitude), azimuth, SKY_RADIUS * 0.965);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(body === 'sun' ? 0.29 : 0.23, 20, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: visible ? 0.18 : 0.07, depthWrite: false }));
      glow.position.copy(position);
      bodyGroup.add(glow);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(body === 'sun' ? 0.12 : 0.09, 20, 16), new THREE.MeshBasicMaterial({ color, transparent: !visible, opacity: visible ? 1 : 0.48, depthWrite: false }));
      marker.position.copy(position);
      bodyGroup.add(marker);
      if (body === 'sun' && visible) { const light = new THREE.PointLight(color, 0.85, 3); light.position.copy(position); bodyGroup.add(light); }
    };
    addBody('sun', current.sunUp, current.sunAlt, current.sunAz);
    addBody('earth', current.earthUp, current.earthAlt, current.earthAz);
  }, [current, ready]);

  const reset = () => { const world = worldRef.current; if (!world) return; world.theta = 0.12; world.phi = 1.32; world.distance = 3.2; world.camera.position.set(world.distance * Math.sin(world.phi) * Math.sin(world.theta), 2.35 + world.distance * Math.cos(world.phi), world.distance * Math.sin(world.phi) * Math.cos(world.theta)); world.camera.lookAt(0, 2.35, 0); };
  return <section className="sky-dome-3d overflow-hidden rounded-2xl border border-white/10" aria-label={`Three dimensional sky model for ${analysis.site.name}`}>
    <div className="relative h-[250px] w-full sm:h-[300px]">
      <div ref={hostRef} className="size-full" />
      {(!ready && !failed) && <div className="absolute inset-0 grid place-items-center bg-[#09111c] text-xs text-white/55">Preparing 3D sky dome…</div>}
      {failed && <div className="absolute inset-0 grid place-items-center bg-[#09111c] px-6 text-center text-xs text-white/60">The 3D sky view is unavailable in this browser. The numerical readouts remain available below.</div>}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white/70 backdrop-blur">3D SKY DOME <span className="mx-1 text-white/30">·</span> {analysis.site.name}</div>
      <button type="button" aria-label="Reset sky dome view" onClick={reset} className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg border border-white/10 bg-black/35 text-white/70 backdrop-blur hover:bg-white/10"><RotateCcw className="size-3.5" /></button>
      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[9px] text-white/75 backdrop-blur"><span className="text-sun">Sun path</span><span className="text-earth">Earth path</span><span className="text-[#f2c06e]">Local horizon</span></div>
      {current && !current.sunUp && <div className="pointer-events-none absolute right-3 bottom-12 rounded-full border border-sun/25 bg-black/60 px-3 py-1.5 font-mono text-[9px] text-sun/85 backdrop-blur">SUN BELOW HORIZON · POSITION RETAINED</div>}
    </div>
    {current && <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 bg-black/15 p-3 font-mono text-[10px] tabular-nums sm:grid-cols-4">
      <SkyReadout label="Sun altitude / azimuth" value={`${current.sunAlt.toFixed(1)}° / ${current.sunAz.toFixed(0)}°`} tone="sun" />
      <SkyReadout label="Earth altitude / azimuth" value={`${current.earthAlt.toFixed(1)}° / ${current.earthAz.toFixed(0)}°`} tone="earth" />
      <SkyReadout label="Sun visibility" value={current.sunUp ? 'Above terrain' : 'Blocked'} tone="sun" />
      <SkyReadout label="Earth visibility" value={current.earthUp ? 'In view' : 'Blocked'} tone="earth" />
    </div>}
    <p className="px-3 pb-3 text-[9px] leading-relaxed text-muted-foreground">Drag to orbit the 3D sky. Body paths show computed positions when they clear the illustrative horizon; geometry is for planning and explanation.</p>
  </section>;
}

function SkyReadout({ label, value, tone }: { label: string; value: string; tone: 'sun' | 'earth' }) {
  return <div><p className="truncate text-[8px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 ${tone === 'sun' ? 'text-sun' : 'text-earth'}`}>{value}</p></div>;
}
