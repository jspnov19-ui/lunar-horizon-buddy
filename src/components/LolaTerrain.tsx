import { useEffect, useRef, useState } from 'react';
import { loadThree } from '@/lib/three-loader';

type TerrainManifest = { resolutionM: number; spanM: number; grid: number; sites: Record<string, { file: string; lat: number; lon: number; validFraction: number }> };
let manifestPromise: Promise<TerrainManifest> | undefined;
function getManifest() { return manifestPromise ??= fetch('/lola-sites/manifest.json').then(r => { if (!r.ok) throw new Error('Terrain catalog unavailable'); return r.json(); }); }

export function LolaTerrain({ siteId, siteName }: { siteId: string; siteName: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false, frame = 0, renderer: any, sceneRef: any, observer: ResizeObserver | undefined;
    const listeners: Array<[string, EventListener, any]> = [];
    setState('loading');
    Promise.all([loadThree(), getManifest()]).then(async ([THREE, manifest]) => {
      const entry = manifest.sites[siteId];
      if (!entry) throw new Error('No site patch');
      const response = await fetch(`/lola-sites/${entry.file}`);
      if (!response.ok) throw new Error('Terrain patch unavailable');
      const heights = new Float32Array(await response.arrayBuffer());
      if (cancelled || !hostRef.current) return;
      const host = hostRef.current, grid = manifest.grid, span = manifest.spanM / 1000;
      const scene = new THREE.Scene(); sceneRef = scene; scene.background = new THREE.Color(0x070b11);
      const camera = new THREE.PerspectiveCamera(38, 1, .05, 100);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      renderer.domElement.className = 'block size-full touch-none cursor-grab active:cursor-grabbing';
      renderer.domElement.setAttribute('aria-label', `Interactive NASA LOLA elevation terrain for ${siteName}; drag to rotate and scroll to zoom.`);
      host.replaceChildren(renderer.domElement);
      scene.add(new THREE.AmbientLight(0x9aa9c3, .6));
      const light = new THREE.DirectionalLight(0xffddb0, 2.1); light.position.set(-8, 12, 7); scene.add(light);
      const geometry = new THREE.PlaneGeometry(span, span, grid - 1, grid - 1);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < heights.length; i++) { min = Math.min(min, heights[i]!); max = Math.max(max, heights[i]!); }
      for (let i = 0; i < positions.count; i++) positions.setY(i, ((heights[i] ?? 0) - (min + max) / 2) / 1000 * 1.6);
      const colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        const t = Math.max(0, Math.min(1, (heights[i]! - min) / Math.max(1, max - min)));
        const c = new THREE.Color().setRGB(.16 + .32 * t, .18 + .31 * t, .21 + .33 * t);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
      const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, metalness: 0, side: THREE.DoubleSide })); scene.add(surface);
      const sampleHeight = (x: number, y: number) => {
        const gx = Math.max(0, Math.min(grid - 1, Math.round((x / span + .5) * (grid - 1))));
        const gy = Math.max(0, Math.min(grid - 1, Math.round((.5 - y / span) * (grid - 1))));
        return ((heights[gy * grid + gx] ?? 0) - (min + max) / 2) / 1000 * 1.6 + .035;
      };
      const boundary: any[] = [];
      for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2, x = Math.cos(a) * 2.15, z = Math.sin(a) * 1.55; boundary.push(new THREE.Vector3(x, sampleHeight(x, z), z)); }
      const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary), new THREE.LineBasicMaterial({ color: 0xed5579, transparent: true, opacity: .94 })); scene.add(outline);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc968 })); marker.position.set(0, sampleHeight(0, 0) + .06, 0); scene.add(marker);
      const stars: number[] = []; for (let i = 0; i < 230; i++) { const a = i * 2.399, r = 14 + (i % 13); stars.push(Math.cos(a) * r, 5 + (i % 11) * .45, Math.sin(a) * r); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc8d9f3, size: .045, transparent: true, opacity: .7 })));
      let theta = .58, phi = 1.13, distance = 19;
      const updateCamera = () => { camera.position.set(distance * Math.sin(phi) * Math.sin(theta), distance * Math.cos(phi), distance * Math.sin(phi) * Math.cos(theta)); camera.lookAt(0, 0, 0); };
      const resize = () => { if (!host.clientWidth || !host.clientHeight) return; renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); };
      resize(); updateCamera(); observer = new ResizeObserver(resize); observer.observe(host);
      let drag: { x: number; y: number } | null = null;
      const down = ((e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); }) as EventListener;
      const move = ((e: PointerEvent) => { if (!drag) return; theta -= (e.clientX - drag.x) * .006; phi = Math.max(.38, Math.min(1.52, phi - (e.clientY - drag.y) * .006)); drag = { x: e.clientX, y: e.clientY }; updateCamera(); }) as EventListener;
      const up = (() => { drag = null; }) as EventListener;
      const wheel = ((e: WheelEvent) => { e.preventDefault(); distance = Math.max(10, Math.min(30, distance * (1 + e.deltaY * .001))); updateCamera(); }) as EventListener;
      for (const [name, fn, options] of [['pointerdown', down, undefined], ['pointermove', move, undefined], ['pointerup', up, undefined], ['pointercancel', up, undefined], ['wheel', wheel, { passive: false }]] as Array<[string, EventListener, any]>) { renderer.domElement.addEventListener(name, fn, options); listeners.push([name, fn, options]); }
      const animate = () => { if (cancelled) return; frame = requestAnimationFrame(animate); renderer.render(scene, camera); }; animate(); setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; cancelAnimationFrame(frame); observer?.disconnect(); for (const [name, fn, options] of listeners) renderer?.domElement.removeEventListener(name, fn, options); sceneRef?.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); }); renderer?.dispose(); renderer?.domElement.remove(); };
  }, [siteId, siteName]);
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#070b11]" aria-label={`NASA LOLA terrain at ${siteName}`}>
    <div className="relative h-[235px] sm:h-[290px]"><div ref={hostRef} className="size-full"/>{state === 'loading' && <div className="absolute inset-0 grid place-items-center text-xs text-white/55">Loading LOLA elevation patch…</div>}{state === 'error' && <div className="absolute inset-0 grid place-items-center text-xs text-white/55">This site’s LOLA patch could not load.</div>}<div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/10 bg-black/55 px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider text-white/75">NASA LOLA · 240 m/pixel <span className="text-white/30">/</span> terrain mesh</div><div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/55 px-2.5 py-2 text-[10px] font-medium text-white">{siteName}</div><div className="pointer-events-none absolute bottom-3 right-3 text-[9px] text-white/45">Drag to rotate · scroll to zoom</div></div>
  </section>;
}
